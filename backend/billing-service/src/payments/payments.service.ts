import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, LessThan, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CronExpression } from '@nestjs/schedule';
import { ClusterSafeCron, DistributedLockService } from '@cloudphone/shared';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { WeChatPayProvider } from './providers/wechat-pay.provider';
import { AlipayProvider } from './providers/alipay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PayPalProvider } from './providers/paypal.provider';
import { PaddleProvider } from './providers/paddle.provider';
import { BalanceClientService } from './clients/balance-client.service';
import { CreatePaymentDto, RefundPaymentDto, QueryPaymentDto } from './dto/create-payment.dto';
import {
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  SagaStep,
  EventBusService,
} from '@cloudphone/shared';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private wechatPayProvider: WeChatPayProvider,
    private alipayProvider: AlipayProvider,
    private stripeProvider: StripeProvider,
    private paypalProvider: PayPalProvider,
    private paddleProvider: PaddleProvider,
    private balanceClient: BalanceClientService,
    private configService: ConfigService,
    private sagaOrchestrator: SagaOrchestratorService,
    private eventBus: EventBusService,
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly lockService: DistributedLockService // ✅ K8s cluster safety
  ) {}

  /**
   * 获取支付提供商
   */
  private getPaymentProvider(method: PaymentMethod): any {
    switch (method) {
      case PaymentMethod.WECHAT:
        return this.wechatPayProvider;
      case PaymentMethod.ALIPAY:
        return this.alipayProvider;
      case PaymentMethod.STRIPE:
        return this.stripeProvider;
      case PaymentMethod.PAYPAL:
        return this.paypalProvider;
      case PaymentMethod.PADDLE:
        return this.paddleProvider;
      case PaymentMethod.BALANCE:
        return null; // 余额支付不需要第三方
      default:
        throw new BadRequestException(`Unsupported payment method: ${method}`);
    }
  }

  /**
   * 创建支付订单
   */
  async createPayment(createPaymentDto: CreatePaymentDto, userId: string): Promise<Payment> {
    const { orderId, method, amount } = createPaymentDto;

    // 查询订单
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderId}`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`订单状态不允许支付: ${order.status}`);
    }

    if (Math.abs(order.amount - amount) > 0.01) {
      throw new BadRequestException(`支付金额与订单金额不一致: ${amount} vs ${order.amount}`);
    }

    // 生成支付单号
    const paymentNo = this.generatePaymentNo();

    // 创建支付记录
    const payment = this.paymentsRepository.create({
      orderId,
      userId: userId || order.userId,
      amount,
      method,
      status: PaymentStatus.PENDING,
      paymentNo,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后过期
    });

    const savedPayment = await this.paymentsRepository.save(payment);

    // 调用第三方支付平台
    try {
      await this.initiatePayment(savedPayment, order);
    } catch (error) {
      this.logger.error(`Failed to initiate payment: ${error.message}`);
      savedPayment.status = PaymentStatus.FAILED;
      savedPayment.failureReason = error.message;
      await this.paymentsRepository.save(savedPayment);

      // 发布严重错误事件（支付创建失败）
      try {
        await this.eventBus.publishSystemError(
          'high',
          'PAYMENT_INITIATION_FAILED',
          `Payment initiation failed: ${error.message} (paymentNo: ${savedPayment.paymentNo}, method: ${savedPayment.method})`,
          'billing-service',
          {
            userMessage: '支付创建失败，请稍后重试',
            userId,
            stackTrace: error.stack,
            metadata: {
              paymentNo: savedPayment.paymentNo,
              orderId: orderId,
              amount: savedPayment.amount,
              method: savedPayment.method,
              errorMessage: error.message,
            },
          }
        );
      } catch (eventError) {
        this.logger.error('Failed to publish payment initiation failed event', eventError);
      }

      throw new InternalServerErrorException('支付创建失败');
    }

    return savedPayment;
  }

  /**
   * 发起支付（调用第三方）
   */
  private async initiatePayment(payment: Payment, order: Order): Promise<void> {
    const notifyUrl = `${this.configService.get('API_GATEWAY_URL')}/api/billing/payments/notify/${payment.method}`;

    switch (payment.method) {
      case PaymentMethod.WECHAT:
        const wechatResult = await this.wechatPayProvider.createNativeOrder(
          payment.paymentNo,
          `订单支付-${order.id}`,
          payment.amount,
          notifyUrl
        );
        payment.transactionId = wechatResult.prepayId;
        payment.paymentUrl = wechatResult.codeUrl || '';
        payment.status = PaymentStatus.PROCESSING;
        break;

      case PaymentMethod.ALIPAY:
        const alipayResult = await this.alipayProvider.createQrCodeOrder(
          payment.paymentNo,
          `订单支付-${order.id}`,
          payment.amount,
          notifyUrl
        );
        payment.transactionId = alipayResult.tradeNo;
        payment.paymentUrl = alipayResult.qrCode || '';
        payment.status = PaymentStatus.PROCESSING;
        break;

      case PaymentMethod.STRIPE:
      case PaymentMethod.PAYPAL:
      case PaymentMethod.PADDLE:
        const provider = this.getPaymentProvider(payment.method);
        const result = await provider.createOneTimePayment({
          amount: payment.amount,
          currency: payment.currency || 'USD',
          description: `订单支付-${order.id}`,
          paymentNo: payment.paymentNo,
          notifyUrl,
          returnUrl: `${this.configService.get('FRONTEND_URL')}/payment/success`,
          mode: payment.paymentMode,
          metadata: { orderId: order.id },
        });

        payment.transactionId = result.transactionId || '';
        payment.paymentUrl = result.paymentUrl || '';
        payment.clientSecret = result.clientSecret || '';
        payment.customerId = result.customerId || '';
        payment.status = PaymentStatus.PROCESSING;
        payment.metadata = result.metadata;
        break;

      case PaymentMethod.BALANCE:
        // 余额支付：先检查余额，再扣减
        try {
          // 1. 检查余额是否充足
          const balanceCheck = await this.balanceClient.checkBalance(order.userId, payment.amount);

          if (!balanceCheck.allowed) {
            throw new BadRequestException(
              `余额不足。当前余额: ${balanceCheck.balance}, 需要: ${payment.amount}`
            );
          }

          // 2. 扣减余额（带幂等性保护）
          const deductResult = await this.balanceClient.deductBalance(
            order.userId,
            payment.amount,
            order.id
          );

          // 3. 标记支付成功
          payment.status = PaymentStatus.SUCCESS;
          payment.paidAt = new Date();
          payment.transactionId = deductResult.transactionId;
          payment.metadata = {
            ...payment.metadata,
            newBalance: deductResult.newBalance,
            deductedAt: new Date().toISOString(),
          };

          await this.handlePaymentSuccess(payment);
        } catch (error) {
          // 余额支付失败，标记为失败状态
          payment.status = PaymentStatus.FAILED;
          payment.metadata = {
            ...payment.metadata,
            error: error.message,
            failedAt: new Date().toISOString(),
          };

          this.logger.error(
            `Balance payment failed for order ${order.id}: ${error.message}`,
            error.stack
          );

          // 重新抛出异常，让调用方知道支付失败
          throw error;
        }
        break;

      default:
        throw new BadRequestException(`不支持的支付方式: ${payment.method}`);
    }

    await this.paymentsRepository.save(payment);
  }

  /**
   * 处理支付回调（微信支付）
   */
  async handleWeChatNotification(body: any, headers: any): Promise<void> {
    this.logger.log('Received WeChat Pay notification');

    // 验证签名
    const isValid = this.wechatPayProvider.verifyNotification(
      headers['wechatpay-timestamp'],
      headers['wechatpay-nonce'],
      JSON.stringify(body),
      headers['wechatpay-signature']
    );

    if (!isValid) {
      throw new BadRequestException('签名验证失败');
    }

    // 解析回调数据
    const { out_trade_no, trade_state, transaction_id } = body.resource || {};

    const payment = await this.paymentsRepository.findOne({
      where: { paymentNo: out_trade_no },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${out_trade_no}`);
    }

    // 更新支付状态
    payment.rawResponse = body;
    payment.transactionId = transaction_id;

    if (trade_state === 'SUCCESS') {
      payment.status = PaymentStatus.SUCCESS;
      payment.paidAt = new Date();
      await this.paymentsRepository.save(payment);
      await this.handlePaymentSuccess(payment);
    } else if (trade_state === 'CLOSED' || trade_state === 'REVOKED') {
      payment.status = PaymentStatus.CANCELLED;
      await this.paymentsRepository.save(payment);
    }
  }

  /**
   * 处理支付回调（支付宝）
   */
  async handleAlipayNotification(params: any): Promise<void> {
    this.logger.log('Received Alipay notification');

    // 验证签名
    const isValid = this.alipayProvider.verifyNotification(params);

    if (!isValid) {
      throw new BadRequestException('签名验证失败');
    }

    const { out_trade_no, trade_status, trade_no } = params;

    const payment = await this.paymentsRepository.findOne({
      where: { paymentNo: out_trade_no },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${out_trade_no}`);
    }

    // 更新支付状态
    payment.rawResponse = params;
    payment.transactionId = trade_no;

    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      payment.status = PaymentStatus.SUCCESS;
      payment.paidAt = new Date();
      await this.paymentsRepository.save(payment);
      await this.handlePaymentSuccess(payment);
    } else if (trade_status === 'TRADE_CLOSED') {
      payment.status = PaymentStatus.CANCELLED;
      await this.paymentsRepository.save(payment);
    }
  }

  /**
   * 处理支付成功
   */
  private async handlePaymentSuccess(payment: Payment): Promise<void> {
    this.logger.log(`Payment success: ${payment.paymentNo}`);

    // 优化：直接使用 update，避免先查询再更新（减少一次数据库往返）
    await this.ordersRepository.update(
      { id: payment.orderId },
      {
        status: OrderStatus.PAID,
        paidAt: new Date(),
      }
    );
  }

  /**
   * 查询支付状态
   */
  async queryPayment(paymentNo: string): Promise<any> {
    const payment = await this.paymentsRepository.findOne({
      where: { paymentNo },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${paymentNo}`);
    }

    // 如果支付未完成，主动查询第三方平台
    if (payment.status === PaymentStatus.PROCESSING) {
      try {
        let result: any;

        if (payment.method === PaymentMethod.WECHAT) {
          result = await this.wechatPayProvider.queryOrder(paymentNo);
          if (result.tradeState === 'SUCCESS') {
            payment.status = PaymentStatus.SUCCESS;
            payment.paidAt = new Date();
            payment.transactionId = result.transactionId;
            await this.paymentsRepository.save(payment);
            await this.handlePaymentSuccess(payment);
          }
        } else if (payment.method === PaymentMethod.ALIPAY) {
          result = await this.alipayProvider.queryOrder(paymentNo);
          if (result.tradeStatus === 'TRADE_SUCCESS' || result.tradeStatus === 'TRADE_FINISHED') {
            payment.status = PaymentStatus.SUCCESS;
            payment.paidAt = new Date();
            payment.transactionId = result.tradeNo;
            await this.paymentsRepository.save(payment);
            await this.handlePaymentSuccess(payment);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to query payment: ${error.message}`);
      }
    }

    return payment;
  }

  /**
   * 申请退款 (使用 Saga 模式防止退款卡在 REFUNDING 状态)
   *
   * Issue #1 修复: 使用 Saga 分布式事务编排退款流程
   *
   * 修复前问题:
   * - 设置 REFUNDING 状态和调用第三方 API 不在同一事务中
   * - 如果第三方 API 失败/超时/服务崩溃，支付记录会永久卡在 REFUNDING 状态
   * - 补偿逻辑（恢复 SUCCESS 状态）可能失败，导致数据不一致
   *
   * 修复后:
   * - 使用 Saga 编排器管理整个退款流程
   * - 每个步骤都有补偿逻辑（compensation）
   * - 自动重试机制（最多 3 次）
   * - 超时检测（5 分钟）
   * - 崩溃恢复（从 saga_state 表恢复）
   * - 步骤追踪和状态持久化
   *
   * Saga 步骤:
   * 1. SET_REFUNDING_STATUS - 设置支付状态为 REFUNDING（数据库事务）
   * 2. CALL_PROVIDER_REFUND - 调用第三方支付平台退款 API
   * 3. UPDATE_PAYMENT_STATUS - 更新支付状态为 REFUNDED（数据库事务）
   * 4. UPDATE_ORDER_STATUS - 更新订单状态为 REFUNDED（数据库事务）
   */
  async refundPayment(
    paymentId: string,
    refundDto: RefundPaymentDto
  ): Promise<{ sagaId: string; payment: Payment }> {
    // 1. 验证支付记录
    const payment = await this.paymentsRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${paymentId}`);
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException(`只能对支付成功的订单进行退款`);
    }

    if (refundDto.amount > payment.amount) {
      throw new BadRequestException(`退款金额不能大于支付金额`);
    }

    // 2. 查询订单信息（用于余额退款）
    const order = await this.ordersRepository.findOne({
      where: { id: payment.orderId },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${payment.orderId}`);
    }

    // 3. 定义退款 Saga
    const refundSaga: SagaDefinition = {
      type: SagaType.PAYMENT_REFUND,
      timeoutMs: 300000, // 5 分钟超时
      maxRetries: 3, // 每步最多重试 3 次
      steps: [
        // 步骤 1: 设置 REFUNDING 状态（使用数据库事务）
        {
          name: 'SET_REFUNDING_STATUS',
          execute: async (state: any) => {
            this.logger.log(`Saga step 1: Setting payment ${paymentId} to REFUNDING status`);

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const paymentInTx = await queryRunner.manager.findOne(Payment, {
                where: { id: paymentId },
              });

              if (!paymentInTx) {
                throw new Error(`Payment ${paymentId} not found in transaction`);
              }

              if (paymentInTx.status !== PaymentStatus.SUCCESS) {
                throw new Error(
                  `Payment ${paymentId} status is ${paymentInTx.status}, expected SUCCESS`
                );
              }

              paymentInTx.status = PaymentStatus.REFUNDING;
              await queryRunner.manager.save(Payment, paymentInTx);
              await queryRunner.commitTransaction();

              this.logger.log(
                `Saga step 1 completed: Payment ${paymentId} status set to REFUNDING`
              );
              return { refundingStatusSet: true };
            } catch (error) {
              await queryRunner.rollbackTransaction();
              throw error;
            } finally {
              await queryRunner.release();
            }
          },
          compensate: async (state: any) => {
            this.logger.log(
              `Saga step 1 compensation: Reverting payment ${paymentId} to SUCCESS status`
            );

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const paymentInTx = await queryRunner.manager.findOne(Payment, {
                where: { id: paymentId },
              });

              if (paymentInTx && paymentInTx.status === PaymentStatus.REFUNDING) {
                paymentInTx.status = PaymentStatus.SUCCESS;
                await queryRunner.manager.save(Payment, paymentInTx);
              }

              await queryRunner.commitTransaction();
              this.logger.log(
                `Saga step 1 compensation completed: Payment ${paymentId} reverted to SUCCESS`
              );
            } catch (error) {
              this.logger.error(`Saga step 1 compensation failed: ${error.message}`);
              await queryRunner.rollbackTransaction();
              // 不抛出异常，继续补偿其他步骤
            } finally {
              await queryRunner.release();
            }
          },
        } as SagaStep,

        // 步骤 2: 调用第三方支付平台退款 API
        {
          name: 'CALL_PROVIDER_REFUND',
          execute: async (state: any) => {
            this.logger.log(`Saga step 2: Calling provider refund API for payment ${paymentId}`);

            let result: any;
            const refundNo = this.generatePaymentNo();

            if (payment.method === PaymentMethod.WECHAT) {
              result = await this.wechatPayProvider.refund(
                payment.paymentNo,
                refundNo,
                payment.amount,
                refundDto.amount,
                refundDto.reason
              );
            } else if (payment.method === PaymentMethod.ALIPAY) {
              result = await this.alipayProvider.refund(
                payment.paymentNo,
                refundDto.amount,
                refundDto.reason
              );
            } else if (payment.method === PaymentMethod.BALANCE) {
              result = await this.balanceClient.refundBalance(
                order.userId,
                refundDto.amount,
                order.id
              );

              this.logger.log(
                `Balance refunded for user ${order.userId}: amount=${refundDto.amount}, newBalance=${result.newBalance}`
              );
            } else {
              throw new Error(`Unsupported payment method for refund: ${payment.method}`);
            }

            this.logger.log(`Saga step 2 completed: Provider refund API call succeeded`);
            return {
              providerRefundResult: result,
              refundNo,
            };
          },
          compensate: async (state: any) => {
            this.logger.warn(
              `Saga step 2 compensation: Cannot undo provider refund (manual intervention required)`
            );
            // 注意: 大多数支付平台的退款是不可逆的，无法自动补偿
            // 需要人工介入或记录到补偿队列
          },
        } as SagaStep,

        // 步骤 3: 更新支付状态为 REFUNDED（使用数据库事务）
        {
          name: 'UPDATE_PAYMENT_STATUS',
          execute: async (state: any) => {
            this.logger.log(`Saga step 3: Updating payment ${paymentId} to REFUNDED status`);

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const paymentInTx = await queryRunner.manager.findOne(Payment, {
                where: { id: paymentId },
              });

              if (!paymentInTx) {
                throw new Error(`Payment ${paymentId} not found in transaction`);
              }

              paymentInTx.status = PaymentStatus.REFUNDED;
              paymentInTx.refundAmount = refundDto.amount;
              paymentInTx.refundReason = refundDto.reason;
              paymentInTx.refundedAt = new Date();
              paymentInTx.rawResponse = {
                ...paymentInTx.rawResponse,
                refund: state.providerRefundResult,
              };

              await queryRunner.manager.save(Payment, paymentInTx);
              await queryRunner.commitTransaction();

              this.logger.log(`Saga step 3 completed: Payment ${paymentId} status set to REFUNDED`);
              return { paymentStatusUpdated: true };
            } catch (error) {
              await queryRunner.rollbackTransaction();
              throw error;
            } finally {
              await queryRunner.release();
            }
          },
          compensate: async (state: any) => {
            this.logger.log(
              `Saga step 3 compensation: Reverting payment ${paymentId} to REFUNDING status`
            );

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const paymentInTx = await queryRunner.manager.findOne(Payment, {
                where: { id: paymentId },
              });

              if (paymentInTx && paymentInTx.status === PaymentStatus.REFUNDED) {
                paymentInTx.status = PaymentStatus.REFUNDING;
                paymentInTx.refundAmount = null as any;
                paymentInTx.refundReason = null as any;
                paymentInTx.refundedAt = null as any;
                await queryRunner.manager.save(Payment, paymentInTx);
              }

              await queryRunner.commitTransaction();
              this.logger.log(`Saga step 3 compensation completed`);
            } catch (error) {
              this.logger.error(`Saga step 3 compensation failed: ${error.message}`);
              await queryRunner.rollbackTransaction();
            } finally {
              await queryRunner.release();
            }
          },
        } as SagaStep,

        // 步骤 4: 更新订单状态为 REFUNDED（使用数据库事务）
        {
          name: 'UPDATE_ORDER_STATUS',
          execute: async (state: any) => {
            this.logger.log(`Saga step 4: Updating order ${payment.orderId} to REFUNDED status`);

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const orderInTx = await queryRunner.manager.findOne(Order, {
                where: { id: payment.orderId },
              });

              if (orderInTx) {
                orderInTx.status = OrderStatus.REFUNDED;
                await queryRunner.manager.save(Order, orderInTx);
              }

              await queryRunner.commitTransaction();
              this.logger.log(
                `Saga step 4 completed: Order ${payment.orderId} status set to REFUNDED`
              );
              return { orderStatusUpdated: true };
            } catch (error) {
              await queryRunner.rollbackTransaction();
              throw error;
            } finally {
              await queryRunner.release();
            }
          },
          compensate: async (state: any) => {
            this.logger.log(`Saga step 4 compensation: Reverting order ${payment.orderId} status`);

            const queryRunner = this.dataSource.createQueryRunner();
            await queryRunner.connect();
            await queryRunner.startTransaction();

            try {
              const orderInTx = await queryRunner.manager.findOne(Order, {
                where: { id: payment.orderId },
              });

              if (orderInTx && orderInTx.status === OrderStatus.REFUNDED) {
                orderInTx.status = OrderStatus.PAID;
                await queryRunner.manager.save(Order, orderInTx);
              }

              await queryRunner.commitTransaction();
              this.logger.log(`Saga step 4 compensation completed`);
            } catch (error) {
              this.logger.error(`Saga step 4 compensation failed: ${error.message}`);
              await queryRunner.rollbackTransaction();
            } finally {
              await queryRunner.release();
            }
          },
        } as SagaStep,
      ],
    };

    // 4. 执行 Saga
    const sagaId = await this.sagaOrchestrator.executeSaga(refundSaga, {
      paymentId,
      orderId: payment.orderId,
      userId: order.userId,
      amount: refundDto.amount,
      reason: refundDto.reason,
      paymentMethod: payment.method,
      paymentNo: payment.paymentNo,
    });

    this.logger.log(`Refund saga initiated: ${sagaId}`);

    const updatedPayment = await this.paymentsRepository.findOne({ where: { id: paymentId } });
    if (!updatedPayment) {
      throw new NotFoundException(`Payment ${paymentId} not found after saga initiation`);
    }

    return {
      sagaId,
      payment: updatedPayment,
    };
  }

  /**
   * 定时任务：关闭过期未支付订单
   */
  @ClusterSafeCron(CronExpression.EVERY_5_MINUTES)
  async closeExpiredPayments() {
    this.logger.log('Checking expired payments...');

    const expiredPayments = await this.paymentsRepository.find({
      where: {
        status: PaymentStatus.PROCESSING,
        expiresAt: LessThan(new Date()),
      },
    });

    // 优化：收集所有需要更新的 orderId，批量更新（减少 N+1 查询）
    const orderIdsToUpdate: string[] = [];

    for (const payment of expiredPayments) {
      try {
        // 关闭第三方订单
        if (payment.method === PaymentMethod.WECHAT) {
          await this.wechatPayProvider.closeOrder(payment.paymentNo);
        } else if (payment.method === PaymentMethod.ALIPAY) {
          await this.alipayProvider.closeOrder(payment.paymentNo);
        }

        // 更新支付状态
        payment.status = PaymentStatus.CANCELLED;
        await this.paymentsRepository.save(payment);

        // 记录需要更新的订单 ID
        orderIdsToUpdate.push(payment.orderId);

        this.logger.log(`Closed expired payment: ${payment.paymentNo}`);
      } catch (error) {
        this.logger.error(`Failed to close payment ${payment.paymentNo}: ${error.message}`);
      }
    }

    // 批量更新订单状态（一次查询，避免循环中的 N 次查询）
    if (orderIdsToUpdate.length > 0) {
      await this.ordersRepository
        .createQueryBuilder()
        .update(Order)
        .set({ status: OrderStatus.CANCELLED })
        .where('id IN (:...ids) AND status = :status', {
          ids: orderIdsToUpdate,
          status: OrderStatus.PENDING,
        })
        .execute();

      this.logger.log(`Bulk updated ${orderIdsToUpdate.length} orders to CANCELLED status`);
    }
  }

  /**
   * 生成支付单号
   */
  private generatePaymentNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `PAY${timestamp}${random}`;
  }

  /**
   * 获取支付列表
   */
  async findAll(userId?: string): Promise<Payment[]> {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    return await this.paymentsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * 获取支付详情
   */
  async findOne(id: string): Promise<Payment> {
    // 优化：使用 QueryBuilder + leftJoinAndSelect，只查询需要的字段（消除 N+1 问题）
    const payment = await this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .where('payment.id = :id', { id })
      .select([
        'payment.id',
        'payment.orderId',
        'payment.userId',
        'payment.amount',
        'payment.currency',
        'payment.method',
        'payment.status',
        'payment.paymentNo',
        'payment.transactionId',
        'payment.paymentUrl',
        'payment.expiresAt',
        'payment.paidAt',
        'payment.refundAmount',
        'payment.refundReason',
        'payment.refundedAt',
        'payment.createdAt',
        'payment.updatedAt',
        'order.id',
        'order.userId',
        'order.planId',
        'order.amount',
        'order.status',
        'order.createdAt',
      ])
      .getOne();

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${id}`);
    }

    return payment;
  }
}
