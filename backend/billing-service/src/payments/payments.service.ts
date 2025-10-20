import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { WeChatPayProvider } from './providers/wechat-pay.provider';
import { AlipayProvider } from './providers/alipay.provider';
import {
  CreatePaymentDto,
  RefundPaymentDto,
  QueryPaymentDto,
} from './dto/create-payment.dto';

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
    private configService: ConfigService,
  ) {}

  /**
   * 创建支付订单
   */
  async createPayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<Payment> {
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
      throw new BadRequestException(
        `支付金额与订单金额不一致: ${amount} vs ${order.amount}`,
      );
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
          notifyUrl,
        );
        payment.transactionId = wechatResult.prepayId;
        payment.paymentUrl = wechatResult.codeUrl;
        payment.status = PaymentStatus.PROCESSING;
        break;

      case PaymentMethod.ALIPAY:
        const alipayResult = await this.alipayProvider.createQrCodeOrder(
          payment.paymentNo,
          `订单支付-${order.id}`,
          payment.amount,
          notifyUrl,
        );
        payment.transactionId = alipayResult.tradeNo;
        payment.paymentUrl = alipayResult.qrCode;
        payment.status = PaymentStatus.PROCESSING;
        break;

      case PaymentMethod.BALANCE:
        // 余额支付直接标记为成功（需要先扣减余额）
        payment.status = PaymentStatus.SUCCESS;
        payment.paidAt = new Date();
        await this.handlePaymentSuccess(payment);
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
      headers['wechatpay-signature'],
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

    // 更新订单状态
    const order = await this.ordersRepository.findOne({
      where: { id: payment.orderId },
    });

    if (order) {
      order.status = OrderStatus.PAID;
      order.paidAt = new Date();
      await this.ordersRepository.save(order);
    }
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
          if (
            result.tradeStatus === 'TRADE_SUCCESS' ||
            result.tradeStatus === 'TRADE_FINISHED'
          ) {
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
   * 申请退款
   */
  async refundPayment(
    paymentId: string,
    refundDto: RefundPaymentDto,
  ): Promise<Payment> {
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

    // 调用第三方平台退款
    payment.status = PaymentStatus.REFUNDING;
    await this.paymentsRepository.save(payment);

    try {
      let result: any;

      if (payment.method === PaymentMethod.WECHAT) {
        const refundNo = this.generatePaymentNo();
        result = await this.wechatPayProvider.refund(
          payment.paymentNo,
          refundNo,
          payment.amount,
          refundDto.amount,
          refundDto.reason,
        );
      } else if (payment.method === PaymentMethod.ALIPAY) {
        result = await this.alipayProvider.refund(
          payment.paymentNo,
          refundDto.amount,
          refundDto.reason,
        );
      }

      payment.status = PaymentStatus.REFUNDED;
      payment.refundAmount = refundDto.amount;
      payment.refundReason = refundDto.reason;
      payment.refundedAt = new Date();
      payment.rawResponse = { ...payment.rawResponse, refund: result };

      // 更新订单状态
      const order = await this.ordersRepository.findOne({
        where: { id: payment.orderId },
      });
      if (order) {
        order.status = OrderStatus.REFUNDED;
        await this.ordersRepository.save(order);
      }
    } catch (error) {
      this.logger.error(`Refund failed: ${error.message}`);
      payment.status = PaymentStatus.SUCCESS; // 恢复为支付成功状态
      throw new InternalServerErrorException('退款失败');
    }

    return await this.paymentsRepository.save(payment);
  }

  /**
   * 定时任务：关闭过期未支付订单
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async closeExpiredPayments() {
    this.logger.log('Checking expired payments...');

    const expiredPayments = await this.paymentsRepository.find({
      where: {
        status: PaymentStatus.PROCESSING,
        expiresAt: LessThan(new Date()),
      },
    });

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

        // 更新订单状态
        const order = await this.ordersRepository.findOne({
          where: { id: payment.orderId },
        });
        if (order && order.status === OrderStatus.PENDING) {
          order.status = OrderStatus.CANCELLED;
          await this.ordersRepository.save(order);
        }

        this.logger.log(`Closed expired payment: ${payment.paymentNo}`);
      } catch (error) {
        this.logger.error(
          `Failed to close payment ${payment.paymentNo}: ${error.message}`,
        );
      }
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
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: ['order'],
    });

    if (!payment) {
      throw new NotFoundException(`支付记录不存在: ${id}`);
    }

    return payment;
  }
}
