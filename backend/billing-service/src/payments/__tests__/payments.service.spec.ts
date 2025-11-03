import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { Order, OrderStatus } from '../../billing/entities/order.entity';
import { WeChatPayProvider } from '../providers/wechat-pay.provider';
import { AlipayProvider } from '../providers/alipay.provider';
import { StripeProvider } from '../providers/stripe.provider';
import { PayPalProvider } from '../providers/paypal.provider';
import { PaddleProvider } from '../providers/paddle.provider';
import { BalanceClientService } from '../clients/balance-client.service';
import { SagaOrchestratorService, EventBusService } from '@cloudphone/shared';
import { createMockPayment, createMockOrder } from '../../__tests__/helpers/mock-factories';

describe('PaymentsService - Core Functions', () => {
  let service: PaymentsService;
  let paymentsRepository: jest.Mocked<Repository<Payment>>;
  let ordersRepository: jest.Mocked<Repository<Order>>;
  let balanceClient: jest.Mocked<BalanceClientService>;
  let wechatPayProvider: jest.Mocked<WeChatPayProvider>;
  let alipayProvider: jest.Mocked<AlipayProvider>;
  let stripeProvider: jest.Mocked<StripeProvider>;
  let paypalProvider: jest.Mocked<PayPalProvider>;
  let paddleProvider: jest.Mocked<PaddleProvider>;
  let sagaOrchestrator: jest.Mocked<SagaOrchestratorService>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: jest.Mocked<DataSource>;
  let eventBus: jest.Mocked<EventBusService>;

  const mockOrder: Order = createMockOrder({
    id: 'order-123',
    userId: 'user-123',
    amount: 99.99,
    status: OrderStatus.PENDING,
  });

  const mockPayment: Payment = createMockPayment({
    id: 'payment-123',
    orderId: 'order-123',
    userId: 'user-123',
    amount: 99.99,
    method: PaymentMethod.WECHAT,
    status: PaymentStatus.PENDING,
  });

  beforeEach(async () => {
    const mockPaymentsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockOrdersRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }), // TypeORM update 返回 UpdateResult
    };

    const mockBalanceClient = {
      checkBalance: jest.fn(),
      deductBalance: jest.fn(),
      refundBalance: jest.fn(),
    };

    const mockWeChatPayProvider = {
      createNativeOrder: jest.fn(),
      queryOrder: jest.fn(),
      verifyNotification: jest.fn(),
    };

    const mockAlipayProvider = {
      createQrCodeOrder: jest.fn(),
      queryOrder: jest.fn(),
      verifyNotification: jest.fn(),
    };

    const mockStripeProvider = {
      createOneTimePayment: jest.fn(),
    };

    const mockPayPalProvider = {
      createOneTimePayment: jest.fn(),
    };

    const mockPaddleProvider = {
      createOneTimePayment: jest.fn(),
    };

    const mockSagaOrchestrator = {
      executeSaga: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          API_GATEWAY_URL: 'http://localhost:3000',
          FRONTEND_URL: 'http://localhost:5173',
        };
        return config[key];
      }),
    };

    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
    };

    const mockDataSource = {
      createQueryRunner: jest.fn(() => mockQueryRunner),
    };

    const mockEventBus = {
      publishPaymentEvent: jest.fn().mockResolvedValue(undefined),
      publishBillingEvent: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue(undefined),
      publishSystemError: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentsRepository,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrdersRepository,
        },
        {
          provide: WeChatPayProvider,
          useValue: mockWeChatPayProvider,
        },
        {
          provide: AlipayProvider,
          useValue: mockAlipayProvider,
        },
        {
          provide: StripeProvider,
          useValue: mockStripeProvider,
        },
        {
          provide: PayPalProvider,
          useValue: mockPayPalProvider,
        },
        {
          provide: PaddleProvider,
          useValue: mockPaddleProvider,
        },
        {
          provide: BalanceClientService,
          useValue: mockBalanceClient,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SagaOrchestratorService,
          useValue: mockSagaOrchestrator,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentsRepository = module.get(getRepositoryToken(Payment));
    ordersRepository = module.get(getRepositoryToken(Order));
    balanceClient = module.get(BalanceClientService);
    wechatPayProvider = module.get(WeChatPayProvider);
    alipayProvider = module.get(AlipayProvider);
    stripeProvider = module.get(StripeProvider);
    paypalProvider = module.get(PayPalProvider);
    paddleProvider = module.get(PaddleProvider);
    sagaOrchestrator = module.get(SagaOrchestratorService);
    configService = module.get(ConfigService);
    dataSource = module.get(getDataSourceToken());
    eventBus = module.get(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Creation', () => {
    it('should create a WeChat payment successfully', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.WECHAT,
        amount: 99.99,
      };

      ordersRepository.findOne.mockResolvedValue(mockOrder);
      paymentsRepository.create.mockReturnValue(mockPayment);
      paymentsRepository.save.mockResolvedValue(
        createMockPayment({
          ...mockPayment,
          status: PaymentStatus.PROCESSING,
          transactionId: 'wx_prepay_123',
          paymentUrl: 'weixin://wxpay/bizpayurl?pr=abc123',
        })
      );
      wechatPayProvider.createNativeOrder.mockResolvedValue({
        prepayId: 'wx_prepay_123',
        codeUrl: 'weixin://wxpay/bizpayurl?pr=abc123',
      });

      const result = await service.createPayment(createDto, 'user-123');

      expect(result.status).toBe(PaymentStatus.PROCESSING);
      expect(result.transactionId).toBe('wx_prepay_123');
      expect(result.paymentUrl).toBeDefined();
      expect(wechatPayProvider.createNativeOrder).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      const createDto = {
        orderId: 'non-existent',
        method: PaymentMethod.WECHAT,
        amount: 99.99,
      };

      ordersRepository.findOne.mockResolvedValue(null);

      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(NotFoundException);
      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow('订单不存在');
    });

    it('should throw BadRequestException when order status is not PENDING', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.WECHAT,
        amount: 99.99,
      };

      ordersRepository.findOne.mockResolvedValue(
        createMockOrder({
          ...mockOrder,
          status: OrderStatus.PAID,
        })
      );

      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(
        '订单状态不允许支付'
      );
    });

    it('should throw BadRequestException when payment amount does not match order amount', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.WECHAT,
        amount: 88.88,
      };

      ordersRepository.findOne.mockResolvedValue(mockOrder);

      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(
        '支付金额与订单金额不一致'
      );
    });

    it('should handle payment provider failure gracefully', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.WECHAT,
        amount: 99.99,
      };

      ordersRepository.findOne.mockResolvedValue(mockOrder);
      paymentsRepository.create.mockReturnValue(mockPayment);
      paymentsRepository.save.mockResolvedValue(mockPayment);
      wechatPayProvider.createNativeOrder.mockRejectedValue(new Error('WeChat API error'));

      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow('支付创建失败');

      // Verify payment was marked as failed
      expect(paymentsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.FAILED,
          failureReason: 'WeChat API error',
        })
      );
    });

    it('should create a Stripe payment successfully', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.STRIPE,
        amount: 99.99,
        currency: 'USD',
      };

      ordersRepository.findOne.mockResolvedValue(mockOrder);
      paymentsRepository.create.mockReturnValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.STRIPE,
        })
      );
      paymentsRepository.save.mockResolvedValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.PROCESSING,
          transactionId: 'pi_stripe_123',
          paymentUrl: 'https://checkout.stripe.com/pay/cs_test_123',
          clientSecret: 'pi_stripe_123_secret_abc',
          customerId: 'cus_stripe_user123',
        })
      );
      stripeProvider.createOneTimePayment.mockResolvedValue({
        transactionId: 'pi_stripe_123',
        paymentUrl: 'https://checkout.stripe.com/pay/cs_test_123',
        clientSecret: 'pi_stripe_123_secret_abc',
        customerId: 'cus_stripe_user123',
        metadata: { orderId: 'order-123' },
      });

      const result = await service.createPayment(createDto, 'user-123');

      expect(result.status).toBe(PaymentStatus.PROCESSING);
      expect(result.transactionId).toBe('pi_stripe_123');
      expect(result.paymentUrl).toBeDefined();
      expect(result.clientSecret).toBe('pi_stripe_123_secret_abc');
      expect(result.customerId).toBe('cus_stripe_user123');
      expect(stripeProvider.createOneTimePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99.99,
          currency: 'USD',
          description: '订单支付-order-123',
          metadata: { orderId: 'order-123' },
        })
      );
    });

    it('should create a PayPal payment successfully', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.PAYPAL,
        amount: 99.99,
        currency: 'USD',
      };

      ordersRepository.findOne.mockResolvedValue(mockOrder);
      paymentsRepository.create.mockReturnValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.PAYPAL,
        })
      );
      paymentsRepository.save.mockResolvedValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.PAYPAL,
          status: PaymentStatus.PROCESSING,
          transactionId: 'paypal_order_123',
          paymentUrl: 'https://www.paypal.com/checkoutnow?token=abc123',
        })
      );
      paypalProvider.createOneTimePayment.mockResolvedValue({
        transactionId: 'paypal_order_123',
        paymentUrl: 'https://www.paypal.com/checkoutnow?token=abc123',
        metadata: { orderId: 'order-123' },
      });

      const result = await service.createPayment(createDto, 'user-123');

      expect(result.status).toBe(PaymentStatus.PROCESSING);
      expect(result.transactionId).toBe('paypal_order_123');
      expect(result.paymentUrl).toBeDefined();
      expect(paypalProvider.createOneTimePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99.99,
          currency: 'USD',
          description: '订单支付-order-123',
        })
      );
    });

    it('should create a Paddle payment successfully', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.PADDLE,
        amount: 99.99,
        currency: 'USD',
      };

      ordersRepository.findOne.mockResolvedValue(mockOrder);
      paymentsRepository.create.mockReturnValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.PADDLE,
        })
      );
      paymentsRepository.save.mockResolvedValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.PADDLE,
          status: PaymentStatus.PROCESSING,
          transactionId: 'paddle_txn_123',
          paymentUrl: 'https://pay.paddle.com/checkout/abc123',
        })
      );
      paddleProvider.createOneTimePayment.mockResolvedValue({
        transactionId: 'paddle_txn_123',
        paymentUrl: 'https://pay.paddle.com/checkout/abc123',
        metadata: { orderId: 'order-123' },
      });

      const result = await service.createPayment(createDto, 'user-123');

      expect(result.status).toBe(PaymentStatus.PROCESSING);
      expect(result.transactionId).toBe('paddle_txn_123');
      expect(result.paymentUrl).toBeDefined();
      expect(paddleProvider.createOneTimePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99.99,
          currency: 'USD',
          description: '订单支付-order-123',
        })
      );
    });

    it('should handle international payment provider failure', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.STRIPE,
        amount: 99.99,
        currency: 'USD',
      };

      ordersRepository.findOne.mockResolvedValue(mockOrder);
      paymentsRepository.create.mockReturnValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.STRIPE,
        })
      );

      // Mock save to capture the payment object
      let savedPayment: any;
      paymentsRepository.save.mockImplementation((payment: any) => {
        savedPayment = payment;
        return Promise.resolve(payment);
      });

      stripeProvider.createOneTimePayment.mockRejectedValue(new Error('Stripe API error'));

      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow('支付创建失败');

      // Verify payment was marked as failed (check last saved state)
      const savedCalls = (paymentsRepository.save as jest.Mock).mock.calls;
      const lastSave = savedCalls[savedCalls.length - 1][0];
      expect(lastSave.status).toBe(PaymentStatus.FAILED);
      expect(lastSave.failureReason).toBe('Stripe API error');
    });
  });

  describe('Balance Payment', () => {
    it('should process balance payment successfully', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.BALANCE,
        amount: 99.99,
      };

      ordersRepository.findOne.mockResolvedValue(
        createMockOrder({
          ...mockOrder,
          status: OrderStatus.PENDING,
        })
      );
      paymentsRepository.create.mockReturnValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.BALANCE,
        })
      );

      let savedPayment: any;
      paymentsRepository.save.mockImplementation((payment: any) => {
        savedPayment = payment;
        return Promise.resolve(payment as any);
      });

      balanceClient.checkBalance.mockResolvedValue({
        allowed: true,
        balance: 200.0,
      });

      balanceClient.deductBalance.mockResolvedValue({
        success: true,
        transactionId: 'bal_tx_123',
        newBalance: 100.01,
      });

      ordersRepository.save.mockResolvedValue(
        createMockOrder({
          ...mockOrder,
          status: OrderStatus.PAID,
        })
      );

      const result = await service.createPayment(createDto, 'user-123');

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.transactionId).toBe('bal_tx_123');
      expect(balanceClient.checkBalance).toHaveBeenCalledWith('user-123', 99.99);
      expect(balanceClient.deductBalance).toHaveBeenCalledWith('user-123', 99.99, 'order-123');
      // 验证订单状态被更新为已支付（使用 update 而不是 save，性能优化）
      expect(ordersRepository.update).toHaveBeenCalledWith(
        { id: 'order-123' },
        expect.objectContaining({
          status: OrderStatus.PAID,
        })
      );
    });

    it('should fail when balance is insufficient', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.BALANCE,
        amount: 99.99,
      };

      ordersRepository.findOne.mockResolvedValue(
        createMockOrder({
          ...mockOrder,
          status: OrderStatus.PENDING,
        })
      );
      paymentsRepository.create.mockReturnValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.BALANCE,
        })
      );
      paymentsRepository.save.mockImplementation((payment: any) => Promise.resolve(payment as any));

      balanceClient.checkBalance.mockResolvedValue({
        allowed: false,
        balance: 50.0,
      });

      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow('支付创建失败');

      expect(balanceClient.deductBalance).not.toHaveBeenCalled();

      // Verify payment was marked as failed
      const savedCalls = (paymentsRepository.save as jest.Mock).mock.calls;
      const lastSave = savedCalls[savedCalls.length - 1][0];
      expect(lastSave.status).toBe(PaymentStatus.FAILED);
    });

    it('should handle balance deduction failure', async () => {
      const createDto = {
        orderId: 'order-123',
        method: PaymentMethod.BALANCE,
        amount: 99.99,
      };

      ordersRepository.findOne.mockResolvedValue(
        createMockOrder({
          ...mockOrder,
          status: OrderStatus.PENDING,
        })
      );
      paymentsRepository.create.mockReturnValue(
        createMockPayment({
          ...mockPayment,
          method: PaymentMethod.BALANCE,
        })
      );
      paymentsRepository.save.mockImplementation((payment: any) => Promise.resolve(payment as any));

      balanceClient.checkBalance.mockResolvedValue({
        allowed: true,
        balance: 200.0,
      });

      balanceClient.deductBalance.mockRejectedValue(new Error('Deduction failed'));

      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.createPayment(createDto, 'user-123')).rejects.toThrow('支付创建失败');

      // Verify payment was marked as failed
      const savedCalls = (paymentsRepository.save as jest.Mock).mock.calls;
      const lastSave = savedCalls[savedCalls.length - 1][0];
      expect(lastSave.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('Payment Refund', () => {
    it('should initiate refund successfully', async () => {
      const successfulPayment = createMockPayment({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
      });

      const refundDto = {
        amount: 99.99,
        reason: 'Customer request',
      };

      paymentsRepository.findOne
        .mockResolvedValueOnce(successfulPayment) // First call in refundPayment
        .mockResolvedValueOnce(successfulPayment); // Second call after saga execution

      ordersRepository.findOne.mockResolvedValue(mockOrder);
      sagaOrchestrator.executeSaga.mockResolvedValue('saga-123');

      const result = await service.refundPayment('payment-123', refundDto);

      expect(result.sagaId).toBe('saga-123');
      expect(result.payment).toBeDefined();
      expect(sagaOrchestrator.executeSaga).toHaveBeenCalled();

      // Verify saga definition was passed correctly
      const sagaDef = (sagaOrchestrator.executeSaga as jest.Mock).mock.calls[0][0];
      expect(sagaDef.type).toBe('PAYMENT_REFUND');
      expect(sagaDef.steps).toHaveLength(4); // SET_REFUNDING_STATUS, CALL_PROVIDER_REFUND, UPDATE_PAYMENT_STATUS, UPDATE_ORDER_STATUS
      expect(sagaDef.steps[0].name).toBe('SET_REFUNDING_STATUS');
      expect(sagaDef.steps[1].name).toBe('CALL_PROVIDER_REFUND');
      expect(sagaDef.steps[2].name).toBe('UPDATE_PAYMENT_STATUS');
      expect(sagaDef.steps[3].name).toBe('UPDATE_ORDER_STATUS');
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      paymentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refundPayment('non-existent', { amount: 99.99, reason: 'Test' })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.refundPayment('non-existent', { amount: 99.99, reason: 'Test' })
      ).rejects.toThrow('支付记录不存在');
    });

    it('should throw BadRequestException when payment is not successful', async () => {
      const pendingPayment = createMockPayment({
        ...mockPayment,
        status: PaymentStatus.PENDING,
      });

      paymentsRepository.findOne.mockResolvedValue(pendingPayment);

      await expect(
        service.refundPayment('payment-123', { amount: 99.99, reason: 'Test' })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.refundPayment('payment-123', { amount: 99.99, reason: 'Test' })
      ).rejects.toThrow('只能对支付成功的订单进行退款');
    });

    it('should throw BadRequestException when refund amount exceeds payment amount', async () => {
      const successfulPayment = createMockPayment({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
        amount: 99.99,
      });

      paymentsRepository.findOne.mockResolvedValue(successfulPayment);

      await expect(
        service.refundPayment('payment-123', { amount: 150.0, reason: 'Test' })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.refundPayment('payment-123', { amount: 150.0, reason: 'Test' })
      ).rejects.toThrow('退款金额不能大于支付金额');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      const successfulPayment = createMockPayment({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });

      paymentsRepository.findOne.mockResolvedValue(successfulPayment);
      ordersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refundPayment('payment-123', { amount: 99.99, reason: 'Test' })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.refundPayment('payment-123', { amount: 99.99, reason: 'Test' })
      ).rejects.toThrow('订单不存在');
    });
  });

  describe('Payment Query', () => {
    it('should query payment by payment number', async () => {
      const completedPayment = createMockPayment({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });

      paymentsRepository.findOne.mockResolvedValue(completedPayment);

      const result = await service.queryPayment('PAY20251030000001');

      expect(result).toBeDefined();
      expect(paymentsRepository.findOne).toHaveBeenCalledWith({
        where: { paymentNo: 'PAY20251030000001' },
      });
    });

    it('should throw NotFoundException when payment does not exist', async () => {
      paymentsRepository.findOne.mockResolvedValue(null);

      await expect(service.queryPayment('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.queryPayment('non-existent')).rejects.toThrow('支付记录不存在');
    });
  });

  describe('Payment Provider Selection', () => {
    it('should return correct provider for WeChat', () => {
      const provider = service['getPaymentProvider'](PaymentMethod.WECHAT);
      expect(provider).toBe(wechatPayProvider);
    });

    it('should return correct provider for Alipay', () => {
      const provider = service['getPaymentProvider'](PaymentMethod.ALIPAY);
      expect(provider).toBe(alipayProvider);
    });

    it('should return null for Balance payment', () => {
      const provider = service['getPaymentProvider'](PaymentMethod.BALANCE);
      expect(provider).toBeNull();
    });

    it('should throw BadRequestException for unsupported payment method', () => {
      expect(() => service['getPaymentProvider']('INVALID' as any)).toThrow(BadRequestException);
      expect(() => service['getPaymentProvider']('INVALID' as any)).toThrow(
        'Unsupported payment method'
      );
    });
  });

  describe('Payment Notifications', () => {
    describe('handleWeChatNotification', () => {
      it('should process successful WeChat payment notification', async () => {
        const processingPayment = createMockPayment({
          ...mockPayment,
          status: PaymentStatus.PROCESSING,
        });

        const notificationBody = {
          resource: {
            out_trade_no: processingPayment.paymentNo,
            trade_state: 'SUCCESS',
            transaction_id: 'wx_tx_123456',
          },
        };

        const headers = {
          'wechatpay-timestamp': '1234567890',
          'wechatpay-nonce': 'abc123',
          'wechatpay-signature': 'valid_signature',
        };

        paymentsRepository.findOne.mockResolvedValue(processingPayment);
        wechatPayProvider.verifyNotification.mockReturnValue(true);
        paymentsRepository.save.mockResolvedValue({
          ...processingPayment,
          status: PaymentStatus.SUCCESS,
          transactionId: 'wx_tx_123456',
        });
        ordersRepository.update.mockResolvedValue({ affected: 1 } as any);

        await service.handleWeChatNotification(notificationBody, headers);

        expect(wechatPayProvider.verifyNotification).toHaveBeenCalledWith(
          headers['wechatpay-timestamp'],
          headers['wechatpay-nonce'],
          JSON.stringify(notificationBody),
          headers['wechatpay-signature']
        );
        expect(paymentsRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: PaymentStatus.SUCCESS,
            transactionId: 'wx_tx_123456',
          })
        );
        expect(ordersRepository.update).toHaveBeenCalledWith(
          { id: processingPayment.orderId },
          expect.objectContaining({
            status: OrderStatus.PAID,
          })
        );
      });

      it('should handle closed WeChat payment', async () => {
        const processingPayment = createMockPayment({
          ...mockPayment,
          status: PaymentStatus.PROCESSING,
        });

        const notificationBody = {
          resource: {
            out_trade_no: processingPayment.paymentNo,
            trade_state: 'CLOSED',
            transaction_id: 'wx_tx_closed',
          },
        };

        const headers = {
          'wechatpay-timestamp': '1234567890',
          'wechatpay-nonce': 'abc123',
          'wechatpay-signature': 'valid_signature',
        };

        paymentsRepository.findOne.mockResolvedValue(processingPayment);
        wechatPayProvider.verifyNotification.mockReturnValue(true);
        paymentsRepository.save.mockResolvedValue({
          ...processingPayment,
          status: PaymentStatus.CANCELLED,
        });

        await service.handleWeChatNotification(notificationBody, headers);

        expect(paymentsRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: PaymentStatus.CANCELLED,
          })
        );
      });

      it('should throw BadRequestException when signature is invalid', async () => {
        const notificationBody = { resource: {} };
        const headers = {
          'wechatpay-timestamp': '1234567890',
          'wechatpay-nonce': 'abc123',
          'wechatpay-signature': 'invalid_signature',
        };

        wechatPayProvider.verifyNotification.mockReturnValue(false);

        await expect(service.handleWeChatNotification(notificationBody, headers)).rejects.toThrow(
          BadRequestException
        );
        await expect(service.handleWeChatNotification(notificationBody, headers)).rejects.toThrow(
          '签名验证失败'
        );
      });

      it('should throw NotFoundException when payment does not exist', async () => {
        const notificationBody = {
          resource: {
            out_trade_no: 'non-existent',
            trade_state: 'SUCCESS',
          },
        };

        const headers = {
          'wechatpay-timestamp': '1234567890',
          'wechatpay-nonce': 'abc123',
          'wechatpay-signature': 'valid_signature',
        };

        wechatPayProvider.verifyNotification.mockReturnValue(true);
        paymentsRepository.findOne.mockResolvedValue(null);

        await expect(service.handleWeChatNotification(notificationBody, headers)).rejects.toThrow(
          NotFoundException
        );
        await expect(service.handleWeChatNotification(notificationBody, headers)).rejects.toThrow(
          '支付记录不存在: non-existent'
        );
      });
    });

    describe('handleAlipayNotification', () => {
      it('should process successful Alipay payment notification', async () => {
        const processingPayment = createMockPayment({
          ...mockPayment,
          method: PaymentMethod.ALIPAY,
          status: PaymentStatus.PROCESSING,
        });

        const notificationParams = {
          out_trade_no: processingPayment.paymentNo,
          trade_status: 'TRADE_SUCCESS',
          trade_no: 'alipay_tx_123456',
        };

        paymentsRepository.findOne.mockResolvedValue(processingPayment);
        alipayProvider.verifyNotification.mockReturnValue(true);
        paymentsRepository.save.mockResolvedValue({
          ...processingPayment,
          status: PaymentStatus.SUCCESS,
          transactionId: 'alipay_tx_123456',
        });
        ordersRepository.update.mockResolvedValue({ affected: 1 } as any);

        await service.handleAlipayNotification(notificationParams);

        expect(alipayProvider.verifyNotification).toHaveBeenCalledWith(notificationParams);
        expect(paymentsRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: PaymentStatus.SUCCESS,
            transactionId: 'alipay_tx_123456',
          })
        );
        expect(ordersRepository.update).toHaveBeenCalled();
      });

      it('should handle TRADE_FINISHED status', async () => {
        const processingPayment = createMockPayment({
          ...mockPayment,
          method: PaymentMethod.ALIPAY,
          status: PaymentStatus.PROCESSING,
        });

        const notificationParams = {
          out_trade_no: processingPayment.paymentNo,
          trade_status: 'TRADE_FINISHED',
          trade_no: 'alipay_tx_finished',
        };

        paymentsRepository.findOne.mockResolvedValue(processingPayment);
        alipayProvider.verifyNotification.mockReturnValue(true);
        paymentsRepository.save.mockResolvedValue({
          ...processingPayment,
          status: PaymentStatus.SUCCESS,
        });
        ordersRepository.update.mockResolvedValue({ affected: 1 } as any);

        await service.handleAlipayNotification(notificationParams);

        expect(paymentsRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: PaymentStatus.SUCCESS,
          })
        );
      });

      it('should handle closed Alipay payment', async () => {
        const processingPayment = createMockPayment({
          ...mockPayment,
          method: PaymentMethod.ALIPAY,
          status: PaymentStatus.PROCESSING,
        });

        const notificationParams = {
          out_trade_no: processingPayment.paymentNo,
          trade_status: 'TRADE_CLOSED',
          trade_no: 'alipay_tx_closed',
        };

        paymentsRepository.findOne.mockResolvedValue(processingPayment);
        alipayProvider.verifyNotification.mockReturnValue(true);
        paymentsRepository.save.mockResolvedValue({
          ...processingPayment,
          status: PaymentStatus.CANCELLED,
        });

        await service.handleAlipayNotification(notificationParams);

        expect(paymentsRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: PaymentStatus.CANCELLED,
          })
        );
      });

      it('should throw BadRequestException when signature is invalid', async () => {
        const notificationParams = {
          out_trade_no: 'test',
          trade_status: 'TRADE_SUCCESS',
        };

        alipayProvider.verifyNotification.mockReturnValue(false);

        await expect(service.handleAlipayNotification(notificationParams)).rejects.toThrow(
          BadRequestException
        );
        await expect(service.handleAlipayNotification(notificationParams)).rejects.toThrow(
          '签名验证失败'
        );
      });

      it('should throw NotFoundException when payment does not exist', async () => {
        const notificationParams = {
          out_trade_no: 'non-existent',
          trade_status: 'TRADE_SUCCESS',
          trade_no: 'alipay_tx_123',
        };

        alipayProvider.verifyNotification.mockReturnValue(true);
        paymentsRepository.findOne.mockResolvedValue(null);

        await expect(service.handleAlipayNotification(notificationParams)).rejects.toThrow(
          NotFoundException
        );
        await expect(service.handleAlipayNotification(notificationParams)).rejects.toThrow(
          '支付记录不存在: non-existent'
        );
      });
    });
  });

  describe('Payment Query with Third-Party Sync', () => {
    it('should sync WeChat payment status when PROCESSING', async () => {
      const processingPayment = createMockPayment({
        ...mockPayment,
        method: PaymentMethod.WECHAT,
        status: PaymentStatus.PROCESSING,
      });

      paymentsRepository.findOne.mockResolvedValue(processingPayment);
      wechatPayProvider.queryOrder.mockResolvedValue({
        tradeState: 'SUCCESS',
        transactionId: 'wx_sync_tx_123',
      });
      paymentsRepository.save.mockResolvedValue({
        ...processingPayment,
        status: PaymentStatus.SUCCESS,
        transactionId: 'wx_sync_tx_123',
      });
      ordersRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.queryPayment(processingPayment.paymentNo);

      expect(wechatPayProvider.queryOrder).toHaveBeenCalledWith(processingPayment.paymentNo);
      expect(paymentsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.SUCCESS,
          transactionId: 'wx_sync_tx_123',
        })
      );
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should sync Alipay payment status when PROCESSING', async () => {
      const processingPayment = createMockPayment({
        ...mockPayment,
        method: PaymentMethod.ALIPAY,
        status: PaymentStatus.PROCESSING,
      });

      paymentsRepository.findOne.mockResolvedValue(processingPayment);
      alipayProvider.queryOrder.mockResolvedValue({
        tradeStatus: 'TRADE_SUCCESS',
        tradeNo: 'alipay_sync_tx_123',
      });
      paymentsRepository.save.mockResolvedValue({
        ...processingPayment,
        status: PaymentStatus.SUCCESS,
        transactionId: 'alipay_sync_tx_123',
      });
      ordersRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.queryPayment(processingPayment.paymentNo);

      expect(alipayProvider.queryOrder).toHaveBeenCalledWith(processingPayment.paymentNo);
      expect(paymentsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.SUCCESS,
          transactionId: 'alipay_sync_tx_123',
        })
      );
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should handle Alipay TRADE_FINISHED status during sync', async () => {
      const processingPayment = createMockPayment({
        ...mockPayment,
        method: PaymentMethod.ALIPAY,
        status: PaymentStatus.PROCESSING,
      });

      paymentsRepository.findOne.mockResolvedValue(processingPayment);
      alipayProvider.queryOrder.mockResolvedValue({
        tradeStatus: 'TRADE_FINISHED',
        tradeNo: 'alipay_finished_tx',
      });
      paymentsRepository.save.mockResolvedValue({
        ...processingPayment,
        status: PaymentStatus.SUCCESS,
      });
      ordersRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.queryPayment(processingPayment.paymentNo);

      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should not sync when payment is already completed', async () => {
      const completedPayment = createMockPayment({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });

      paymentsRepository.findOne.mockResolvedValue(completedPayment);

      const result = await service.queryPayment(completedPayment.paymentNo);

      expect(wechatPayProvider.queryOrder).not.toHaveBeenCalled();
      expect(alipayProvider.queryOrder).not.toHaveBeenCalled();
      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it('should handle third-party query errors gracefully', async () => {
      const processingPayment = createMockPayment({
        ...mockPayment,
        method: PaymentMethod.WECHAT,
        status: PaymentStatus.PROCESSING,
      });

      paymentsRepository.findOne.mockResolvedValue(processingPayment);
      wechatPayProvider.queryOrder.mockRejectedValue(new Error('Third-party API error'));

      // 应该返回原始支付状态，不抛出异常
      const result = await service.queryPayment(processingPayment.paymentNo);

      expect(result.status).toBe(PaymentStatus.PROCESSING);
      expect(wechatPayProvider.queryOrder).toHaveBeenCalled();
    });
  });
});
