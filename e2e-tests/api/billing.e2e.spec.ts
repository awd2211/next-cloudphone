import { billingService } from '../helpers/api-client';
import { createTestUser, deleteTestUser, sleep } from '../helpers/test-helpers';

describe('Billing & Balance E2E Tests', () => {
  let testUserId: string;
  let testToken: string;

  beforeAll(async () => {
    // Create a test user for all billing tests
    const user = await createTestUser();
    testUserId = user.id!;
    testToken = user.token!;
  });

  afterAll(async () => {
    // Cleanup test user
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
  });

  describe('Balance Retrieval', () => {
    it('should retrieve user balance', async () => {
      const response = await billingService.get<any>(`/balance/user/${testUserId}`);

      expect(response).toBeDefined();
      expect(response.userId).toBe(testUserId);
      expect(response.balance).toBeDefined();
      expect(typeof response.balance).toBe('number');
      expect(response.frozenBalance).toBeDefined();
      expect(response.totalRecharge).toBeDefined();
      expect(response.totalConsume).toBeDefined();
    });

    it('should return balance with correct initial values', async () => {
      const response = await billingService.get<any>(`/balance/user/${testUserId}`);

      // New user should have 0 balance
      expect(Number(response.balance)).toBe(0);
      expect(Number(response.frozenBalance)).toBe(0);
      expect(Number(response.totalRecharge)).toBe(0);
      expect(Number(response.totalConsume)).toBe(0);
    });
  });

  describe('Balance Recharge', () => {
    it('should successfully recharge balance', async () => {
      const rechargeData = {
        userId: testUserId,
        amount: 1000,
        description: 'E2E test recharge',
      };

      const response = await billingService.post<any>('/balance/recharge', rechargeData);

      expect(response).toBeDefined();
      expect(response.balance).toBeDefined();
      expect(Number(response.balance.balance)).toBeGreaterThanOrEqual(1000);
      expect(Number(response.balance.totalRecharge)).toBeGreaterThanOrEqual(1000);
    });

    it('should reject recharge with negative amount', async () => {
      const rechargeData = {
        userId: testUserId,
        amount: -500,
        description: 'Invalid recharge',
      };

      await expect(billingService.post('/balance/recharge', rechargeData)).rejects.toThrow();
    });

    it('should reject recharge with zero amount', async () => {
      const rechargeData = {
        userId: testUserId,
        amount: 0,
        description: 'Invalid recharge',
      };

      await expect(billingService.post('/balance/recharge', rechargeData)).rejects.toThrow();
    });

    it('should create transaction record for recharge', async () => {
      await billingService.post('/balance/recharge', {
        userId: testUserId,
        amount: 500,
        description: 'Test transaction record',
      });

      // Wait a bit for transaction to be recorded
      await sleep(1000);

      const transactions = await billingService.get<any[]>(
        `/transactions/user/${testUserId}?limit=10`
      );

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThan(0);

      const rechargeTransaction = transactions.find(
        (t) => t.type === 'recharge' && t.description === 'Test transaction record'
      );
      expect(rechargeTransaction).toBeDefined();
      expect(Number(rechargeTransaction!.amount)).toBe(500);
    });
  });

  describe('Balance Consumption', () => {
    beforeEach(async () => {
      // Ensure user has sufficient balance before each consumption test
      await billingService.post('/balance/recharge', {
        userId: testUserId,
        amount: 5000,
        description: 'Test setup recharge',
      });
    });

    it('should successfully consume balance', async () => {
      const balanceBefore = await billingService.get<any>(`/balance/user/${testUserId}`);

      const consumeData = {
        userId: testUserId,
        amount: 100,
        description: 'E2E test consumption',
      };

      const response = await billingService.post<any>('/balance/consume', consumeData);

      expect(response).toBeDefined();
      expect(Number(response.balance.balance)).toBe(Number(balanceBefore.balance) - 100);
      expect(Number(response.balance.totalConsume)).toBeGreaterThanOrEqual(100);
    });

    it('should reject consumption exceeding available balance', async () => {
      const balance = await billingService.get<any>(`/balance/user/${testUserId}`);

      const consumeData = {
        userId: testUserId,
        amount: Number(balance.balance) + 1000,
        description: 'Exceeding balance',
      };

      await expect(billingService.post('/balance/consume', consumeData)).rejects.toThrow();
    });

    it('should reject consumption with negative amount', async () => {
      const consumeData = {
        userId: testUserId,
        amount: -100,
        description: 'Invalid consumption',
      };

      await expect(billingService.post('/balance/consume', consumeData)).rejects.toThrow();
    });

    it('should create transaction record for consumption', async () => {
      await billingService.post('/balance/consume', {
        userId: testUserId,
        amount: 200,
        description: 'Test consumption record',
      });

      await sleep(1000);

      const transactions = await billingService.get<any[]>(
        `/transactions/user/${testUserId}?limit=10`
      );

      const consumeTransaction = transactions.find(
        (t) => t.type === 'consume' && t.description === 'Test consumption record'
      );
      expect(consumeTransaction).toBeDefined();
      expect(Number(consumeTransaction!.amount)).toBe(200);
    });
  });

  describe('Balance Freeze/Unfreeze', () => {
    beforeEach(async () => {
      // Ensure user has sufficient balance
      await billingService.post('/balance/recharge', {
        userId: testUserId,
        amount: 3000,
        description: 'Test setup for freeze',
      });
    });

    it('should freeze balance', async () => {
      const balanceBefore = await billingService.get<any>(`/balance/user/${testUserId}`);

      const freezeData = {
        userId: testUserId,
        amount: 500,
        description: 'E2E freeze test',
      };

      const response = await billingService.post<any>('/balance/freeze', freezeData);

      expect(response).toBeDefined();
      expect(Number(response.balance.balance)).toBe(Number(balanceBefore.balance) - 500);
      expect(Number(response.balance.frozenBalance)).toBe(
        Number(balanceBefore.frozenBalance) + 500
      );
    });

    it('should unfreeze balance', async () => {
      // First freeze some balance
      await billingService.post('/balance/freeze', {
        userId: testUserId,
        amount: 300,
        description: 'Freeze before unfreeze',
      });

      const balanceBefore = await billingService.get<any>(`/balance/user/${testUserId}`);

      const unfreezeData = {
        userId: testUserId,
        amount: 300,
        description: 'E2E unfreeze test',
      };

      const response = await billingService.post<any>('/balance/unfreeze', unfreezeData);

      expect(response).toBeDefined();
      expect(Number(response.balance.balance)).toBe(Number(balanceBefore.balance) + 300);
      expect(Number(response.balance.frozenBalance)).toBe(
        Number(balanceBefore.frozenBalance) - 300
      );
    });

    it('should reject freeze exceeding available balance', async () => {
      const balance = await billingService.get<any>(`/balance/user/${testUserId}`);

      const freezeData = {
        userId: testUserId,
        amount: Number(balance.balance) + 1000,
        description: 'Exceeding freeze',
      };

      await expect(billingService.post('/balance/freeze', freezeData)).rejects.toThrow();
    });

    it('should reject unfreeze exceeding frozen balance', async () => {
      const balance = await billingService.get<any>(`/balance/user/${testUserId}`);

      const unfreezeData = {
        userId: testUserId,
        amount: Number(balance.frozenBalance) + 1000,
        description: 'Exceeding unfreeze',
      };

      await expect(billingService.post('/balance/unfreeze', unfreezeData)).rejects.toThrow();
    });
  });

  describe('Transaction History', () => {
    beforeEach(async () => {
      // Create some transactions
      await billingService.post('/balance/recharge', {
        userId: testUserId,
        amount: 1000,
        description: 'History test recharge 1',
      });

      await billingService.post('/balance/recharge', {
        userId: testUserId,
        amount: 500,
        description: 'History test recharge 2',
      });

      await billingService.post('/balance/consume', {
        userId: testUserId,
        amount: 200,
        description: 'History test consume',
      });

      await sleep(1000);
    });

    it('should retrieve transaction history', async () => {
      const response = await billingService.get<any[]>(`/transactions/user/${testUserId}?limit=20`);

      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);

      // Should contain our test transactions
      const hasRecharge = response.some((t) => t.description === 'History test recharge 1');
      const hasConsume = response.some((t) => t.description === 'History test consume');

      expect(hasRecharge).toBe(true);
      expect(hasConsume).toBe(true);
    });

    it('should filter transactions by type', async () => {
      const rechargeTransactions = await billingService.get<any[]>(
        `/transactions/user/${testUserId}?type=recharge&limit=20`
      );

      expect(Array.isArray(rechargeTransactions)).toBe(true);
      rechargeTransactions.forEach((t) => {
        expect(t.type).toBe('recharge');
      });
    });

    it('should paginate transaction results', async () => {
      const page1 = await billingService.get<any[]>(
        `/transactions/user/${testUserId}?limit=2&offset=0`
      );

      const page2 = await billingService.get<any[]>(
        `/transactions/user/${testUserId}?limit=2&offset=2`
      );

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);

      // Pages should have different transactions
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });

    it('should sort transactions by date descending', async () => {
      const transactions = await billingService.get<any[]>(
        `/transactions/user/${testUserId}?limit=10`
      );

      if (transactions.length > 1) {
        for (let i = 0; i < transactions.length - 1; i++) {
          const date1 = new Date(transactions[i].createdAt).getTime();
          const date2 = new Date(transactions[i + 1].createdAt).getTime();
          expect(date1).toBeGreaterThanOrEqual(date2);
        }
      }
    });
  });

  describe('Subscription Plans', () => {
    it('should list available plans', async () => {
      const response = await billingService.get<any[]>('/plans/active');

      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);

      // Verify plan structure
      response.forEach((plan) => {
        expect(plan.id).toBeDefined();
        expect(plan.name).toBeDefined();
        expect(plan.price).toBeDefined();
        expect(plan.duration).toBeDefined();
        expect(plan.features).toBeDefined();
      });
    });

    it('should retrieve plan details', async () => {
      const plans = await billingService.get<any[]>('/plans/active');
      const planId = plans[0].id;

      const response = await billingService.get<any>(`/plans/${planId}`);

      expect(response).toBeDefined();
      expect(response.id).toBe(planId);
      expect(response.name).toBeDefined();
    });
  });

  describe('Usage Metering', () => {
    beforeEach(async () => {
      // Ensure user has balance for metering
      await billingService.post('/balance/recharge', {
        userId: testUserId,
        amount: 2000,
        description: 'Metering test recharge',
      });
    });

    it('should record device usage', async () => {
      const usageData = {
        userId: testUserId,
        deviceId: 'test-device-001',
        resourceType: 'device_time',
        quantity: 60, // 60 minutes
        unitPrice: 1, // 1 yuan per minute
      };

      const response = await billingService.post<any>('/usage/record', usageData);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.totalCost).toBe(60);
    });

    it('should retrieve usage statistics', async () => {
      // Record some usage first
      await billingService.post('/usage/record', {
        userId: testUserId,
        deviceId: 'test-device-002',
        resourceType: 'device_time',
        quantity: 30,
        unitPrice: 1,
      });

      await sleep(1000);

      const response = await billingService.get<any>(
        `/usage/user/${testUserId}/statistics?period=day`
      );

      expect(response).toBeDefined();
      expect(response.totalUsage).toBeDefined();
      expect(response.totalCost).toBeDefined();
    });

    it('should deduct balance for recorded usage', async () => {
      const balanceBefore = await billingService.get<any>(`/balance/user/${testUserId}`);

      await billingService.post('/usage/record', {
        userId: testUserId,
        deviceId: 'test-device-003',
        resourceType: 'device_time',
        quantity: 10,
        unitPrice: 5,
      });

      const balanceAfter = await billingService.get<any>(`/balance/user/${testUserId}`);

      expect(Number(balanceAfter.balance)).toBe(Number(balanceBefore.balance) - 50);
    });
  });

  describe('Invoice Generation', () => {
    it('should generate invoice for user', async () => {
      // Ensure there are some transactions
      await billingService.post('/balance/recharge', {
        userId: testUserId,
        amount: 1000,
        description: 'Invoice test recharge',
      });

      const invoiceData = {
        userId: testUserId,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        endDate: new Date().toISOString(),
      };

      const response = await billingService.post<any>('/invoices/generate', invoiceData);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.userId).toBe(testUserId);
      expect(response.totalAmount).toBeDefined();
    });

    it('should list user invoices', async () => {
      const response = await billingService.get<any[]>(`/invoices/user/${testUserId}`);

      expect(Array.isArray(response)).toBe(true);
    });
  });

  describe('Low Balance Alert', () => {
    it('should detect low balance condition', async () => {
      // First get current balance
      const currentBalance = await billingService.get<any>(`/balance/user/${testUserId}`);

      // Consume most of the balance
      if (Number(currentBalance.balance) > 100) {
        await billingService.post('/balance/consume', {
          userId: testUserId,
          amount: Number(currentBalance.balance) - 50,
          description: 'Reduce to low balance',
        });
      }

      // Check if low balance alert is triggered
      const response = await billingService.get<any>(`/balance/user/${testUserId}/alerts`);

      expect(response).toBeDefined();
      // Should have low balance warning if balance is below threshold
      if (Number(currentBalance.balance) < 100) {
        expect(response.hasLowBalanceAlert).toBe(true);
      }
    });
  });
});
