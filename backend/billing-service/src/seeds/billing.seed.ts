import { DataSource } from 'typeorm';
import { Plan, PlanType, BillingCycle } from '../billing/entities/plan.entity';
import { Order, OrderStatus } from '../billing/entities/order.entity';
import { UserBalance } from '../balance/entities/user-balance.entity';
import { BalanceTransaction, TransactionType, TransactionStatus } from '../balance/entities/balance-transaction.entity';
import { BillingRule, ResourceType, RuleType, BillingUnit } from '../billing-rules/entities/billing-rule.entity';

export async function seedBilling(dataSource: DataSource, userIds: string[]) {
  const planRepository = dataSource.getRepository(Plan);
  const orderRepository = dataSource.getRepository(Order);
  const balanceRepository = dataSource.getRepository(UserBalance);
  const transactionRepository = dataSource.getRepository(BalanceTransaction);
  const billingRuleRepository = dataSource.getRepository(BillingRule);

  console.log('🌱 Seeding billing data (plans, orders, balances)...');

  // 1. 创建套餐
  const plans = [
    {
      name: '免费体验版',
      description: '适合新用户体验，包含基础功能',
      type: PlanType.FREE,
      price: 0,
      billingCycle: BillingCycle.MONTHLY,
      deviceQuota: 1,
      storageQuotaGB: 10,
      trafficQuotaGB: 5,
      features: ['基础设备控制', '单设备支持', '社区支持'],
      isActive: true,
      isPublic: true,
      metadata: { trial: true, maxDuration: 30 },
    },
    {
      name: '基础版',
      description: '适合个人开发者和小型团队',
      type: PlanType.BASIC,
      price: 99,
      billingCycle: BillingCycle.MONTHLY,
      deviceQuota: 5,
      storageQuotaGB: 50,
      trafficQuotaGB: 100,
      features: ['5台设备', 'ADB控制', '应用管理', '邮件支持'],
      isActive: true,
      isPublic: true,
      metadata: { popular: false },
    },
    {
      name: '专业版',
      description: '适合中型团队和企业',
      type: PlanType.PRO,
      price: 299,
      billingCycle: BillingCycle.MONTHLY,
      deviceQuota: 20,
      storageQuotaGB: 200,
      trafficQuotaGB: 500,
      features: ['20台设备', 'GPU加速', '批量操作', '快照管理', '优先支持'],
      isActive: true,
      isPublic: true,
      metadata: { popular: true, recommended: true },
    },
    {
      name: '企业版',
      description: '适合大型企业，提供定制化服务',
      type: PlanType.ENTERPRISE,
      price: 999,
      billingCycle: BillingCycle.MONTHLY,
      deviceQuota: 100,
      storageQuotaGB: 1000,
      trafficQuotaGB: 2000,
      features: ['100台设备', 'GPU加速', '专属节点', 'SLA保障', '7x24支持', 'API访问'],
      isActive: true,
      isPublic: true,
      metadata: { popular: false, enterprise: true },
    },
    {
      name: '年付专业版',
      description: '年付享8折优惠',
      type: PlanType.PRO,
      price: 2868,
      billingCycle: BillingCycle.YEARLY,
      deviceQuota: 20,
      storageQuotaGB: 200,
      trafficQuotaGB: 500,
      features: ['20台设备', 'GPU加速', '批量操作', '快照管理', '优先支持', '年付8折'],
      isActive: true,
      isPublic: true,
      metadata: { discount: 0.8, popular: true },
    },
  ];

  const createdPlans = [];
  for (const planData of plans) {
    const existing = await planRepository.findOne({ where: { name: planData.name } });
    if (!existing) {
      const plan = planRepository.create(planData);
      createdPlans.push(await planRepository.save(plan));
    } else {
      createdPlans.push(existing);
    }
  }
  console.log(`✅ Created ${createdPlans.length} plans`);

  // 2. 创建计费规则
  const billingRules = [
    {
      name: '设备按小时计费',
      resourceType: ResourceType.DEVICE,
      ruleType: RuleType.PAY_PER_USE,
      unitPrice: 0.5,
      billingUnit: BillingUnit.HOUR,
      description: '设备运行时按小时计费',
      isActive: true,
      metadata: { minCharge: 0.1 },
    },
    {
      name: '存储按GB计费',
      resourceType: ResourceType.STORAGE,
      ruleType: RuleType.VOLUME,
      unitPrice: 0.01,
      billingUnit: BillingUnit.GB,
      description: '存储空间按GB计费',
      isActive: true,
      metadata: { freeQuota: 10 },
    },
    {
      name: '流量按GB计费',
      resourceType: ResourceType.BANDWIDTH,
      ruleType: RuleType.VOLUME,
      unitPrice: 0.8,
      billingUnit: BillingUnit.GB,
      description: '网络流量按GB计费',
      isActive: true,
      metadata: { freeQuota: 5 },
    },
  ];

  for (const ruleData of billingRules) {
    const existing = await billingRuleRepository.findOne({ where: { name: ruleData.name } });
    if (!existing) {
      const rule = billingRuleRepository.create(ruleData);
      await billingRuleRepository.save(rule);
    }
  }
  console.log(`✅ Created ${billingRules.length} billing rules`);

  // 3. 为用户创建余额账户和订单
  for (let i = 0; i < userIds.length && i < 3; i++) {
    const userId = userIds[i];

    // 创建余额账户
    const existingBalance = await balanceRepository.findOne({ where: { userId } });
    if (!existingBalance) {
      const balance = balanceRepository.create({
        userId,
        balance: 1000 + i * 500,
        frozenAmount: 0,
        totalRecharge: 1000 + i * 500,
        totalConsumption: 0,
      });
      await balanceRepository.save(balance);

      // 创建充值交易记录
      const transaction = transactionRepository.create({
        userId,
        type: TransactionType.RECHARGE,
        amount: 1000 + i * 500,
        balanceBefore: 0,
        balanceAfter: 1000 + i * 500,
        status: TransactionStatus.SUCCESS,
        description: '初始充值',
        metadata: { method: 'admin', source: 'seed' },
      });
      await transactionRepository.save(transaction);
    }

    // 创建订单
    const planIndex = i % createdPlans.length;
    const plan = createdPlans[planIndex];

    const existingOrder = await orderRepository.findOne({
      where: { userId, planId: plan.id }
    });

    if (!existingOrder) {
      const order = orderRepository.create({
        userId,
        planId: plan.id,
        orderNumber: `ORD${Date.now()}${i}`,
        amount: plan.price,
        finalAmount: plan.price,
        status: i === 0 ? OrderStatus.PAID : OrderStatus.PENDING,
        paidAt: i === 0 ? new Date() : (null as any),
        metadata: {
          planName: plan.name,
          billingCycle: plan.billingCycle,
        },
      });
      await orderRepository.save(order);
    }
  }
  console.log(`✅ Created balances and orders for users`);

  console.log('\n🎉 Billing seed data completed!');
  return { plans: createdPlans };
}
