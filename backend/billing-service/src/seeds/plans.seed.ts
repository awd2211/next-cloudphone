import { DataSource } from 'typeorm';
import { Plan, PlanType, BillingCycle } from '../billing/entities/plan.entity';

export async function seedPlans(dataSource: DataSource) {
  const planRepository = dataSource.getRepository(Plan);

  // 检查是否已经有套餐数据
  const existingPlans = await planRepository.count();
  if (existingPlans > 0) {
    console.log('✅ Plans already seeded, skipping...');
    return;
  }

  const plans: Partial<Plan>[] = [
    {
      name: '免费版',
      description: '适合个人开发者和小型项目体验云手机功能',
      type: PlanType.FREE,
      billingCycle: BillingCycle.MONTHLY,
      price: 0,
      deviceQuota: 1,
      storageQuotaGB: 10,
      trafficQuotaGB: 50,
      features: ['basic_support', 'standard_performance'],
      isActive: true,
      isPublic: true,
      metadata: {
        maxCpuCores: 2,
        maxMemoryMB: 2048,
        maxApiCallsPerDay: 1000,
        badge: '免费',
        color: '#52c41a',
        sortOrder: 1,
      },
    },
    {
      name: '基础版',
      description: '适合小型团队和轻量级应用',
      type: PlanType.BASIC,
      billingCycle: BillingCycle.MONTHLY,
      price: 99,
      deviceQuota: 5,
      storageQuotaGB: 50,
      trafficQuotaGB: 200,
      features: ['email_support', 'standard_performance', 'basic_analytics', 'snapshot_backup'],
      isActive: true,
      isPublic: true,
      metadata: {
        maxCpuCores: 4,
        maxMemoryMB: 4096,
        maxApiCallsPerDay: 10000,
        originalPrice: 129,
        trialDays: 7,
        hasFreeTrial: true,
        badge: null,
        color: '#1890ff',
        sortOrder: 2,
      },
    },
    {
      name: '专业版',
      description: '适合中型团队和高性能需求',
      type: PlanType.PRO,
      billingCycle: BillingCycle.MONTHLY,
      price: 299,
      deviceQuota: 20,
      storageQuotaGB: 200,
      trafficQuotaGB: 1000,
      features: [
        'priority_support',
        'high_performance',
        'advanced_analytics',
        'snapshot_backup',
        'gpu_support',
        'custom_template',
        'api_access',
      ],
      isActive: true,
      isPublic: true,
      metadata: {
        maxCpuCores: 8,
        maxMemoryMB: 8192,
        maxApiCallsPerDay: 100000,
        originalPrice: 399,
        trialDays: 14,
        hasFreeTrial: true,
        isRecommended: true,
        badge: '推荐',
        color: '#722ed1',
        sortOrder: 3,
      },
    },
    {
      name: '企业版',
      description: '适合大型企业和定制化需求',
      type: PlanType.ENTERPRISE,
      billingCycle: BillingCycle.MONTHLY,
      price: 999,
      deviceQuota: 100,
      storageQuotaGB: 1000,
      trafficQuotaGB: 5000,
      features: [
        'dedicated_support',
        'ultra_performance',
        'advanced_analytics',
        'snapshot_backup',
        'gpu_support',
        'custom_template',
        'api_access',
        'private_deployment',
        'sla_guarantee',
        'custom_integration',
        'white_label',
      ],
      isActive: true,
      isPublic: true,
      metadata: {
        maxCpuCores: 32,
        maxMemoryMB: 32768,
        maxApiCallsPerDay: null,
        originalPrice: 1299,
        trialDays: 30,
        hasFreeTrial: true,
        badge: '企业',
        color: '#fa541c',
        sortOrder: 4,
      },
    },
  ];

  const createdPlans = planRepository.create(plans);
  await planRepository.save(createdPlans);

  console.log(`✅ Successfully seeded ${createdPlans.length} plans`);
}
