import { Test, TestingModule } from '@nestjs/testing';
import { BillingRulesController } from './billing-rules.controller';
import { BillingRulesService } from './billing-rules.service';
import { ResourceType } from './entities/billing-rule.entity';

describe('BillingRulesController', () => {
  let controller: BillingRulesController;
  let rulesService: any;

  const mockBillingRulesService = {
    createRule: jest.fn(),
    listRules: jest.fn(),
    getRule: jest.fn(),
    updateRule: jest.fn(),
    deleteRule: jest.fn(),
    calculatePrice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingRulesController],
      providers: [
        {
          provide: BillingRulesService,
          useValue: mockBillingRulesService,
        },
      ],
    }).compile();

    controller = module.get<BillingRulesController>(BillingRulesController);
    rulesService = module.get(BillingRulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRule', () => {
    it('should create a new billing rule', async () => {
      const dto: any = {
        resourceType: ResourceType.DEVICE,
        name: 'Basic Device Pricing',
        pricePerUnit: 0.5,
        billingCycle: 'hourly',
      };

      const mockRule = {
        id: 'rule-123',
        ...dto,
        createdAt: new Date(),
      };

      rulesService.createRule.mockResolvedValue(mockRule);

      const result = await controller.createRule(dto);

      expect(result).toEqual(mockRule);
      expect(result.id).toBe('rule-123');
      expect(result.name).toBe('Basic Device Pricing');
      expect(rulesService.createRule).toHaveBeenCalledWith(dto);
    });

    it('should create rule for different resource types', async () => {
      const dto: any = {
        resourceType: ResourceType.STORAGE,
        name: 'Storage Pricing',
        pricePerUnit: 0.1,
        billingCycle: 'monthly',
      };

      const mockRule = {
        id: 'rule-456',
        ...dto,
      };

      rulesService.createRule.mockResolvedValue(mockRule);

      const result = await controller.createRule(dto);

      expect(result.resourceType).toBe(ResourceType.STORAGE);
      expect(rulesService.createRule).toHaveBeenCalledWith(dto);
    });

    it('should create rule with tiered pricing', async () => {
      const dto: any = {
        resourceType: ResourceType.DEVICE,
        name: 'Tiered Device Pricing',
        pricingTiers: [
          { minQuantity: 0, maxQuantity: 10, pricePerUnit: 1.0 },
          { minQuantity: 11, maxQuantity: 50, pricePerUnit: 0.8 },
          { minQuantity: 51, maxQuantity: null, pricePerUnit: 0.6 },
        ],
        billingCycle: 'hourly',
      };

      const mockRule = {
        id: 'rule-789',
        ...dto,
      };

      rulesService.createRule.mockResolvedValue(mockRule);

      const result = await controller.createRule(dto);

      expect(result.pricingTiers).toHaveLength(3);
      expect(rulesService.createRule).toHaveBeenCalledWith(dto);
    });
  });

  describe('listRules', () => {
    it('should return all billing rules', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          resourceType: ResourceType.DEVICE,
          name: 'Device Pricing',
          pricePerUnit: 0.5,
        },
        {
          id: 'rule-2',
          resourceType: ResourceType.STORAGE,
          name: 'Storage Pricing',
          pricePerUnit: 0.1,
        },
      ];

      rulesService.listRules.mockResolvedValue(mockRules);

      const result = await controller.listRules();

      expect(result).toEqual(mockRules);
      expect(result).toHaveLength(2);
      expect(rulesService.listRules).toHaveBeenCalledWith(undefined);
    });

    it('should filter rules by resource type', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          resourceType: ResourceType.DEVICE,
          name: 'Device Pricing',
          pricePerUnit: 0.5,
        },
      ];

      rulesService.listRules.mockResolvedValue(mockRules);

      const result = await controller.listRules(ResourceType.DEVICE);

      expect(result).toEqual(mockRules);
      expect(result).toHaveLength(1);
      expect(result[0].resourceType).toBe(ResourceType.DEVICE);
      expect(rulesService.listRules).toHaveBeenCalledWith(ResourceType.DEVICE);
    });

    it('should return empty array when no rules exist', async () => {
      rulesService.listRules.mockResolvedValue([]);

      const result = await controller.listRules();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should filter rules by bandwidth resource type', async () => {
      const mockRules = [
        {
          id: 'rule-3',
          resourceType: ResourceType.BANDWIDTH,
          name: 'Bandwidth Pricing',
          pricePerUnit: 0.05,
        },
      ];

      rulesService.listRules.mockResolvedValue(mockRules);

      const result = await controller.listRules(ResourceType.BANDWIDTH);

      expect(result[0].resourceType).toBe(ResourceType.BANDWIDTH);
    });
  });

  describe('getRule', () => {
    it('should return a specific billing rule', async () => {
      const mockRule = {
        id: 'rule-123',
        resourceType: ResourceType.DEVICE,
        name: 'Premium Device Pricing',
        pricePerUnit: 1.5,
        billingCycle: 'hourly',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      rulesService.getRule.mockResolvedValue(mockRule);

      const result = await controller.getRule('rule-123');

      expect(result).toEqual(mockRule);
      expect(result.id).toBe('rule-123');
      expect(result.name).toBe('Premium Device Pricing');
      expect(rulesService.getRule).toHaveBeenCalledWith('rule-123');
    });

    it('should return rule with complete details', async () => {
      const mockRule = {
        id: 'rule-456',
        resourceType: ResourceType.STORAGE,
        name: 'Storage Pricing',
        pricePerUnit: 0.1,
        billingCycle: 'monthly',
        description: 'Storage pricing per GB',
        metadata: {
          region: 'us-east-1',
          tier: 'standard',
        },
      };

      rulesService.getRule.mockResolvedValue(mockRule);

      const result = await controller.getRule('rule-456');

      expect(result.description).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.region).toBe('us-east-1');
    });
  });

  describe('updateRule', () => {
    it('should update an existing billing rule', async () => {
      const updates = {
        pricePerUnit: 0.8,
        name: 'Updated Device Pricing',
      };

      const mockUpdatedRule = {
        id: 'rule-123',
        resourceType: ResourceType.DEVICE,
        name: 'Updated Device Pricing',
        pricePerUnit: 0.8,
        updatedAt: new Date(),
      };

      rulesService.updateRule.mockResolvedValue(mockUpdatedRule);

      const result = await controller.updateRule('rule-123', updates);

      expect(result).toEqual(mockUpdatedRule);
      expect(result.name).toBe('Updated Device Pricing');
      expect(result.pricePerUnit).toBe(0.8);
      expect(rulesService.updateRule).toHaveBeenCalledWith('rule-123', updates);
    });

    it('should update rule status', async () => {
      const updates = {
        isActive: false,
      };

      const mockUpdatedRule = {
        id: 'rule-123',
        isActive: false,
      };

      rulesService.updateRule.mockResolvedValue(mockUpdatedRule);

      const result = await controller.updateRule('rule-123', updates);

      expect(result.isActive).toBe(false);
    });

    it('should update rule pricing tiers', async () => {
      const updates = {
        pricingTiers: [
          { minQuantity: 0, maxQuantity: 20, pricePerUnit: 1.2 },
          { minQuantity: 21, maxQuantity: null, pricePerUnit: 1.0 },
        ],
      };

      const mockUpdatedRule = {
        id: 'rule-789',
        ...updates,
      };

      rulesService.updateRule.mockResolvedValue(mockUpdatedRule);

      const result = await controller.updateRule('rule-789', updates);

      expect(result.pricingTiers).toHaveLength(2);
    });
  });

  describe('deleteRule', () => {
    it('should delete a billing rule', async () => {
      rulesService.deleteRule.mockResolvedValue(undefined);

      const result = await controller.deleteRule('rule-123');

      expect(result.message).toBe('删除成功');
      expect(rulesService.deleteRule).toHaveBeenCalledWith('rule-123');
    });

    it('should handle deletion of different rules', async () => {
      rulesService.deleteRule.mockResolvedValue(undefined);

      await controller.deleteRule('rule-456');
      await controller.deleteRule('rule-789');

      expect(rulesService.deleteRule).toHaveBeenCalledTimes(2);
      expect(rulesService.deleteRule).toHaveBeenNthCalledWith(1, 'rule-456');
      expect(rulesService.deleteRule).toHaveBeenNthCalledWith(2, 'rule-789');
    });
  });

  describe('calculatePrice', () => {
    it('should calculate price for device resources', async () => {
      const body = {
        resourceType: ResourceType.DEVICE,
        quantity: 10,
      };

      const mockPriceResult = {
        resourceType: ResourceType.DEVICE,
        quantity: 10,
        unitPrice: 0.5,
        totalPrice: 5.0,
        billingCycle: 'hourly',
      };

      rulesService.calculatePrice.mockResolvedValue(mockPriceResult);

      const result = await controller.calculatePrice(body);

      expect(result).toEqual(mockPriceResult);
      expect(result.totalPrice).toBe(5.0);
      expect(rulesService.calculatePrice).toHaveBeenCalledWith(
        ResourceType.DEVICE,
        10,
        undefined
      );
    });

    it('should calculate price with context', async () => {
      const body = {
        resourceType: ResourceType.DEVICE,
        quantity: 5,
        context: {
          userId: 'user-123',
          plan: 'premium',
        },
      };

      const mockPriceResult = {
        resourceType: ResourceType.DEVICE,
        quantity: 5,
        unitPrice: 0.4, // Discounted price
        totalPrice: 2.0,
        billingCycle: 'hourly',
        discount: 0.2,
      };

      rulesService.calculatePrice.mockResolvedValue(mockPriceResult);

      const result = await controller.calculatePrice(body);

      expect(result.discount).toBe(0.2);
      expect(rulesService.calculatePrice).toHaveBeenCalledWith(
        ResourceType.DEVICE,
        5,
        body.context
      );
    });

    it('should calculate price for storage resources', async () => {
      const body = {
        resourceType: ResourceType.STORAGE,
        quantity: 100, // 100 GB
      };

      const mockPriceResult = {
        resourceType: ResourceType.STORAGE,
        quantity: 100,
        unitPrice: 0.1,
        totalPrice: 10.0,
        billingCycle: 'monthly',
      };

      rulesService.calculatePrice.mockResolvedValue(mockPriceResult);

      const result = await controller.calculatePrice(body);

      expect(result.resourceType).toBe(ResourceType.STORAGE);
      expect(result.totalPrice).toBe(10.0);
    });

    it('should calculate price for bandwidth resources', async () => {
      const body = {
        resourceType: ResourceType.BANDWIDTH,
        quantity: 500, // 500 GB
      };

      const mockPriceResult = {
        resourceType: ResourceType.BANDWIDTH,
        quantity: 500,
        unitPrice: 0.05,
        totalPrice: 25.0,
        billingCycle: 'monthly',
      };

      rulesService.calculatePrice.mockResolvedValue(mockPriceResult);

      const result = await controller.calculatePrice(body);

      expect(result.resourceType).toBe(ResourceType.BANDWIDTH);
      expect(result.totalPrice).toBe(25.0);
    });

    it('should calculate price with tiered pricing', async () => {
      const body = {
        resourceType: ResourceType.DEVICE,
        quantity: 60,
      };

      const mockPriceResult = {
        resourceType: ResourceType.DEVICE,
        quantity: 60,
        tierBreakdown: [
          { tier: 1, quantity: 10, unitPrice: 1.0, subtotal: 10.0 },
          { tier: 2, quantity: 40, unitPrice: 0.8, subtotal: 32.0 },
          { tier: 3, quantity: 10, unitPrice: 0.6, subtotal: 6.0 },
        ],
        totalPrice: 48.0,
        billingCycle: 'hourly',
      };

      rulesService.calculatePrice.mockResolvedValue(mockPriceResult);

      const result = await controller.calculatePrice(body);

      expect(result.tierBreakdown).toHaveLength(3);
      expect(result.totalPrice).toBe(48.0);
    });

    it('should calculate price for zero quantity', async () => {
      const body = {
        resourceType: ResourceType.DEVICE,
        quantity: 0,
      };

      const mockPriceResult = {
        resourceType: ResourceType.DEVICE,
        quantity: 0,
        unitPrice: 0.5,
        totalPrice: 0.0,
      };

      rulesService.calculatePrice.mockResolvedValue(mockPriceResult);

      const result = await controller.calculatePrice(body);

      expect(result.totalPrice).toBe(0.0);
    });

    it('should calculate price with promotional discount', async () => {
      const body = {
        resourceType: ResourceType.DEVICE,
        quantity: 10,
        context: {
          promoCode: 'SAVE20',
        },
      };

      const mockPriceResult = {
        resourceType: ResourceType.DEVICE,
        quantity: 10,
        unitPrice: 0.5,
        basePrice: 5.0,
        discountAmount: 1.0,
        totalPrice: 4.0,
        promoCode: 'SAVE20',
      };

      rulesService.calculatePrice.mockResolvedValue(mockPriceResult);

      const result = await controller.calculatePrice(body);

      expect(result.basePrice).toBe(5.0);
      expect(result.discountAmount).toBe(1.0);
      expect(result.totalPrice).toBe(4.0);
      expect(result.promoCode).toBe('SAVE20');
    });
  });
});
