# Proxy Service 扩展功能设计

> 管理员配置 + 用户选择 + 计费系统

## 概述

基于企业级Proxy Service，新增三大核心功能：
1. **管理员后台配置** - 灵活配置代理套餐和规则
2. **用户前端选择** - 用户可自主选择代理地区和套餐
3. **代理计费系统** - 基于使用量的精准计费

---

## 一、管理员后台配置功能

### 1.1 代理套餐管理

#### 数据模型

```typescript
// src/entities/proxy-plan.entity.ts
@Entity('proxy_plans')
export class ProxyPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // 套餐名称，如"美国标准套餐"

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string; // 套餐描述

  @Column({ type: 'jsonb' })
  regions: string[]; // 支持的地区列表 ['US', 'UK', 'CN']

  @Column({ type: 'jsonb', nullable: true })
  cities: string[]; // 支持的城市列表（可选）

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  pricePerGB: number; // 每GB价格（用户侧）

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  costPerGB: number; // 成本价格（管理员侧）

  @Column({ type: 'integer', default: 70 })
  minQuality: number; // 最低质量要求

  @Column({ type: 'enum', enum: ['http', 'https', 'socks5'] })
  protocol: string; // 协议类型

  @Column({ type: 'integer', default: 0 })
  monthlyQuotaGB: number; // 月度配额（0表示无限制）

  @Column({ type: 'boolean', default: true })
  enabled: boolean; // 是否启用

  @Column({ type: 'integer', default: 100 })
  priority: number; // 显示优先级

  @Column({ type: 'jsonb', nullable: true })
  tags: string[]; // 标签：['popular', 'recommended', 'enterprise']

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 管理员API

```typescript
// src/proxy/controllers/admin-proxy.controller.ts

@Controller('admin/proxy')
@ApiTags('admin')
@UseGuards(JwtAuthGuard, AdminGuard) // 需要管理员权限
export class AdminProxyController {
  constructor(private readonly adminProxyService: AdminProxyService) {}

  // ========== 套餐管理 ==========

  @Get('plans')
  @ApiOperation({ summary: '获取所有代理套餐' })
  async getPlans(@Query() query: GetPlansDto) {
    return this.adminProxyService.getPlans(query);
  }

  @Post('plans')
  @ApiOperation({ summary: '创建代理套餐' })
  async createPlan(@Body() dto: CreateProxyPlanDto) {
    return this.adminProxyService.createPlan(dto);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: '更新代理套餐' })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateProxyPlanDto,
  ) {
    return this.adminProxyService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: '删除代理套餐' })
  async deletePlan(@Param('id') id: string) {
    return this.adminProxyService.deletePlan(id);
  }

  @Post('plans/:id/toggle')
  @ApiOperation({ summary: '启用/禁用套餐' })
  async togglePlan(@Param('id') id: string) {
    return this.adminProxyService.togglePlan(id);
  }

  // ========== 供应商配置 ==========

  @Get('providers')
  @ApiOperation({ summary: '获取所有供应商配置' })
  async getProviders() {
    return this.adminProxyService.getProviders();
  }

  @Put('providers/:name')
  @ApiOperation({ summary: '更新供应商配置' })
  async updateProvider(
    @Param('name') name: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.adminProxyService.updateProvider(name, dto);
  }

  @Post('providers/:name/toggle')
  @ApiOperation({ summary: '启用/禁用供应商' })
  async toggleProvider(@Param('name') name: string) {
    return this.adminProxyService.toggleProvider(name);
  }

  @Post('providers/:name/test')
  @ApiOperation({ summary: '测试供应商连接' })
  async testProvider(@Param('name') name: string) {
    return this.adminProxyService.testProviderConnection(name);
  }

  // ========== 全局配置 ==========

  @Get('config')
  @ApiOperation({ summary: '获取全局配置' })
  async getGlobalConfig() {
    return this.adminProxyService.getGlobalConfig();
  }

  @Put('config')
  @ApiOperation({ summary: '更新全局配置' })
  async updateGlobalConfig(@Body() dto: UpdateGlobalConfigDto) {
    return this.adminProxyService.updateGlobalConfig(dto);
  }

  // ========== 使用统计 ==========

  @Get('stats/overview')
  @ApiOperation({ summary: '总览统计' })
  async getOverviewStats(@Query() query: StatsQueryDto) {
    return this.adminProxyService.getOverviewStats(query);
  }

  @Get('stats/providers')
  @ApiOperation({ summary: '供应商统计' })
  async getProviderStats(@Query() query: StatsQueryDto) {
    return this.adminProxyService.getProviderStats(query);
  }

  @Get('stats/users')
  @ApiOperation({ summary: '用户使用统计' })
  async getUserStats(@Query() query: StatsQueryDto) {
    return this.adminProxyService.getUserStats(query);
  }

  @Get('stats/cost-analysis')
  @ApiOperation({ summary: '成本分析' })
  async getCostAnalysis(@Query() query: StatsQueryDto) {
    return this.adminProxyService.getCostAnalysis(query);
  }

  // ========== 健康监控 ==========

  @Get('health/pools')
  @ApiOperation({ summary: '代理池健康状态' })
  async getPoolHealth() {
    return this.adminProxyService.getPoolHealth();
  }

  @Get('health/proxies')
  @ApiOperation({ summary: '所有代理健康状态' })
  async getAllProxiesHealth(@Query() query: HealthQueryDto) {
    return this.adminProxyService.getAllProxiesHealth(query);
  }

  @Post('health/refresh/:region')
  @ApiOperation({ summary: '刷新指定地区代理池' })
  async refreshPool(@Param('region') region: string) {
    return this.adminProxyService.refreshPool(region);
  }
}
```

#### DTO定义

```typescript
// src/proxy/dto/admin/create-proxy-plan.dto.ts

export class CreateProxyPlanDto {
  @ApiProperty({ description: '套餐名称', example: '美国标准套餐' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '套餐描述', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '支持的地区', example: ['US', 'UK'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  regions: string[];

  @ApiProperty({ description: '支持的城市', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cities?: string[];

  @ApiProperty({ description: '用户价格（每GB）', example: 8.99 })
  @IsNumber()
  @Min(0)
  pricePerGB: number;

  @ApiProperty({ description: '成本价格（每GB）', example: 5.88 })
  @IsNumber()
  @Min(0)
  costPerGB: number;

  @ApiProperty({ description: '最低质量', example: 70 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minQuality?: number;

  @ApiProperty({ description: '协议类型', enum: ['http', 'https', 'socks5'] })
  @IsEnum(['http', 'https', 'socks5'])
  protocol: string;

  @ApiProperty({ description: '月度配额（GB）', example: 100 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyQuotaGB?: number;

  @ApiProperty({ description: '标签', example: ['popular', 'recommended'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
```

---

### 1.2 全局配置管理

```typescript
// src/entities/proxy-config.entity.ts

@Entity('proxy_config')
export class ProxyConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string; // 配置键

  @Column({ type: 'jsonb' })
  value: any; // 配置值

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string; // 配置说明

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 全局配置项

```typescript
// 可配置项列表
export enum ProxyConfigKey {
  // 代理池配置
  POOL_MIN_SIZE = 'pool.minSize',
  POOL_TARGET_SIZE = 'pool.targetSize',
  POOL_MAX_SIZE = 'pool.maxSize',
  POOL_REFRESH_INTERVAL = 'pool.refreshInterval',

  // 健康检查配置
  HEALTH_CHECK_INTERVAL = 'health.checkInterval',
  HEALTH_CHECK_TIMEOUT = 'health.checkTimeout',
  HEALTH_CHECK_RETRIES = 'health.checkRetries',

  // 成本控制配置
  MONTHLY_BUDGET = 'cost.monthlyBudget',
  COST_ALERT_THRESHOLD = 'cost.alertThreshold',
  COST_PROTECTION_THRESHOLD = 'cost.protectionThreshold',

  // 供应商优先级
  PROVIDER_PRIORITY = 'provider.priority',
  PROVIDER_FALLBACK_STRATEGY = 'provider.fallbackStrategy',

  // 用户限制
  USER_DEFAULT_QUOTA_GB = 'user.defaultQuotaGB',
  USER_MAX_CONCURRENT_PROXIES = 'user.maxConcurrentProxies',

  // 计费配置
  BILLING_CYCLE = 'billing.cycle', // 'monthly' | 'daily' | 'hourly'
  BILLING_ROUNDING = 'billing.rounding', // 'up' | 'down' | 'nearest'
}
```

---

## 二、用户前端选择功能

### 2.1 数据模型

```typescript
// src/entities/user-proxy-subscription.entity.ts

@Entity('user_proxy_subscriptions')
export class UserProxySubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string; // 用户ID

  @Column({ type: 'uuid' })
  planId: string; // 套餐ID

  @Column({ type: 'varchar', length: 20 })
  status: string; // 'active' | 'suspended' | 'expired'

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  usedGB: number; // 已使用流量（GB）

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  quotaGB: number; // 配额（GB）

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // 过期时间

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ProxyPlan)
  @JoinColumn({ name: 'planId' })
  plan: ProxyPlan;
}
```

```typescript
// src/entities/user-proxy-preference.entity.ts

@Entity('user_proxy_preferences')
export class UserProxyPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  @Index()
  userId: string; // 用户ID

  @Column({ type: 'varchar', length: 10, nullable: true })
  preferredCountry: string; // 偏好国家

  @Column({ type: 'varchar', length: 100, nullable: true })
  preferredCity: string; // 偏好城市

  @Column({ type: 'enum', enum: ['http', 'https', 'socks5'], default: 'http' })
  preferredProtocol: string; // 偏好协议

  @Column({ type: 'boolean', default: false })
  autoRotation: boolean; // 自动轮换

  @Column({ type: 'integer', default: 3600 })
  rotationInterval: number; // 轮换间隔（秒）

  @Column({ type: 'boolean', default: true })
  sessionSticky: boolean; // 会话保持

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2.2 用户API

```typescript
// src/proxy/controllers/user-proxy.controller.ts

@Controller('user/proxy')
@ApiTags('user')
@UseGuards(JwtAuthGuard)
export class UserProxyController {
  constructor(private readonly userProxyService: UserProxyService) {}

  // ========== 套餐查询 ==========

  @Get('plans')
  @ApiOperation({ summary: '获取可用套餐列表' })
  async getAvailablePlans(@Query() query: GetAvailablePlansDto) {
    return this.userProxyService.getAvailablePlans(query);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: '获取套餐详情' })
  async getPlanDetail(@Param('id') id: string) {
    return this.userProxyService.getPlanDetail(id);
  }

  // ========== 订阅管理 ==========

  @Get('subscriptions')
  @ApiOperation({ summary: '获取我的订阅' })
  async getMySubscriptions(@CurrentUser() user: User) {
    return this.userProxyService.getMySubscriptions(user.id);
  }

  @Post('subscriptions')
  @ApiOperation({ summary: '订阅套餐' })
  async subscribe(
    @CurrentUser() user: User,
    @Body() dto: SubscribePlanDto,
  ) {
    return this.userProxyService.subscribe(user.id, dto);
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: '取消订阅' })
  async unsubscribe(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.userProxyService.unsubscribe(user.id, id);
  }

  // ========== 偏好设置 ==========

  @Get('preferences')
  @ApiOperation({ summary: '获取我的偏好设置' })
  async getPreferences(@CurrentUser() user: User) {
    return this.userProxyService.getPreferences(user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: '更新偏好设置' })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.userProxyService.updatePreferences(user.id, dto);
  }

  // ========== 代理选择 ==========

  @Post('select')
  @ApiOperation({ summary: '选择并获取代理' })
  async selectProxy(
    @CurrentUser() user: User,
    @Body() dto: SelectProxyDto,
  ) {
    return this.userProxyService.selectProxy(user.id, dto);
  }

  @Get('current')
  @ApiOperation({ summary: '获取当前使用的代理' })
  async getCurrentProxies(@CurrentUser() user: User) {
    return this.userProxyService.getCurrentProxies(user.id);
  }

  @Post('rotate')
  @ApiOperation({ summary: '手动轮换代理' })
  async rotateProxy(
    @CurrentUser() user: User,
    @Body() dto: RotateProxyDto,
  ) {
    return this.userProxyService.rotateProxy(user.id, dto);
  }

  // ========== 使用统计 ==========

  @Get('usage')
  @ApiOperation({ summary: '获取我的使用统计' })
  async getUsageStats(
    @CurrentUser() user: User,
    @Query() query: UsageQueryDto,
  ) {
    return this.userProxyService.getUsageStats(user.id, query);
  }

  @Get('quota')
  @ApiOperation({ summary: '获取配额信息' })
  async getQuota(@CurrentUser() user: User) {
    return this.userProxyService.getQuota(user.id);
  }
}
```

#### 用户DTO

```typescript
// src/proxy/dto/user/select-proxy.dto.ts

export class SelectProxyDto {
  @ApiProperty({ description: '套餐ID', required: false })
  @IsUuid()
  @IsOptional()
  planId?: string; // 如果用户订阅多个套餐，可以指定

  @ApiProperty({ description: '国家代码', example: 'US', required: false })
  @IsString()
  @IsOptional()
  country?: string; // 覆盖套餐配置

  @ApiProperty({ description: '城市名称', example: 'New York', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: '设备ID', required: false })
  @IsString()
  @IsOptional()
  deviceId?: string; // 用于绑定代理到设备

  @ApiProperty({ description: '会话保持', default: true })
  @IsBoolean()
  @IsOptional()
  sessionSticky?: boolean;
}
```

---

## 三、代理计费系统

### 3.1 计费模型设计

#### 计费方式

1. **按流量计费（推荐）** - 按实际使用的流量（GB）计费
2. **按时长计费** - 按代理使用时长（小时）计费
3. **按请求数计费** - 按API调用次数计费
4. **套餐包计费** - 月度/年度固定套餐

#### 数据模型

```typescript
// src/entities/proxy-bill.entity.ts

@Entity('proxy_bills')
export class ProxyBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string; // 用户ID

  @Column({ type: 'uuid', nullable: true })
  subscriptionId: string; // 订阅ID

  @Column({ type: 'varchar', length: 20 })
  billingType: string; // 'traffic' | 'duration' | 'requests' | 'package'

  @Column({ type: 'date' })
  @Index()
  billingDate: Date; // 账单日期

  @Column({ type: 'varchar', length: 20 })
  period: string; // 计费周期：'daily' | 'monthly'

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  usageAmount: number; // 使用量（GB/小时/次数）

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  unitPrice: number; // 单价

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  subtotal: number; // 小计

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  discount: number; // 折扣

  @Column({ type: 'decimal', precision: 15, scale: 4, default: 0 })
  total: number; // 总计

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string; // 货币单位

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string; // 'pending' | 'paid' | 'failed' | 'refunded'

  @Column({ type: 'jsonb', nullable: true })
  details: any; // 详细信息（JSON）

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

```typescript
// src/entities/proxy-transaction.entity.ts

@Entity('proxy_transactions')
export class ProxyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string; // 用户ID

  @Column({ type: 'uuid' })
  @Index()
  billId: string; // 账单ID

  @Column({ type: 'varchar', length: 50 })
  transactionType: string; // 'charge' | 'refund' | 'adjustment'

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  amount: number; // 金额

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentMethod: string; // 支付方式

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionNo: string; // 第三方交易号

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: string; // 'completed' | 'failed' | 'pending'

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string; // 描述

  @CreateDateColumn()
  createdAt: Date;
}
```

### 3.2 计费服务实现

```typescript
// src/statistics/services/billing.service.ts

@Injectable()
export class ProxyBillingService {
  constructor(
    @InjectRepository(ProxyBill)
    private billRepository: Repository<ProxyBill>,
    @InjectRepository(ProxyTransaction)
    private transactionRepository: Repository<ProxyTransaction>,
    @InjectRepository(ProxyUsage)
    private usageRepository: Repository<ProxyUsage>,
    @InjectRepository(UserProxySubscription)
    private subscriptionRepository: Repository<UserProxySubscription>,
    private eventBus: EventBusService,
  ) {}

  /**
   * 生成用户账单（定时任务）
   */
  @Cron('0 0 * * *') // 每天凌晨生成前一天的账单
  async generateDailyBills() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // 获取所有活跃订阅
    const subscriptions = await this.subscriptionRepository.find({
      where: { status: 'active' },
      relations: ['plan'],
    });

    for (const subscription of subscriptions) {
      await this.generateUserBill(subscription.userId, yesterday, subscription);
    }
  }

  /**
   * 为单个用户生成账单
   */
  private async generateUserBill(
    userId: string,
    billingDate: Date,
    subscription: UserProxySubscription,
  ): Promise<ProxyBill> {
    // 1. 统计当天使用量
    const startOfDay = new Date(billingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(billingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const usageRecords = await this.usageRepository.find({
      where: {
        deviceId: Like(`${userId}%`), // 假设deviceId包含userId
        usedAt: Between(startOfDay, endOfDay),
      },
    });

    // 2. 计算总使用量
    const totalBandwidthMB = usageRecords.reduce(
      (sum, record) => sum + record.bandwidthMB,
      0,
    );
    const totalBandwidthGB = totalBandwidthMB / 1024;

    // 3. 计算费用
    const unitPrice = subscription.plan.pricePerGB;
    const subtotal = totalBandwidthGB * unitPrice;

    // 4. 应用折扣（如果有）
    const discount = await this.calculateDiscount(
      userId,
      subtotal,
      totalBandwidthGB,
    );

    const total = subtotal - discount;

    // 5. 创建账单
    const bill = this.billRepository.create({
      userId,
      subscriptionId: subscription.id,
      billingType: 'traffic',
      billingDate,
      period: 'daily',
      usageAmount: totalBandwidthGB,
      unitPrice,
      subtotal,
      discount,
      total,
      currency: 'USD',
      status: 'pending',
      details: {
        planName: subscription.plan.name,
        requestCount: usageRecords.length,
        avgQuality: this.calculateAvgQuality(usageRecords),
      },
    });

    await this.billRepository.save(bill);

    // 6. 更新订阅使用量
    subscription.usedGB += totalBandwidthGB;
    await this.subscriptionRepository.save(subscription);

    // 7. 发布账单生成事件
    await this.eventBus.publish('cloudphone.events', 'proxy.bill.generated', {
      userId,
      billId: bill.id,
      amount: total,
      timestamp: new Date(),
    });

    return bill;
  }

  /**
   * 计算折扣
   */
  private async calculateDiscount(
    userId: string,
    subtotal: number,
    usageGB: number,
  ): Promise<number> {
    let discount = 0;

    // 折扣规则1: 大流量折扣
    if (usageGB > 100) {
      discount += subtotal * 0.1; // 超过100GB，享受10%折扣
    } else if (usageGB > 50) {
      discount += subtotal * 0.05; // 超过50GB，享受5%折扣
    }

    // 折扣规则2: VIP用户折扣
    const isVip = await this.checkUserVipStatus(userId);
    if (isVip) {
      discount += subtotal * 0.15; // VIP用户额外15%折扣
    }

    return Math.min(discount, subtotal); // 折扣不能超过小计
  }

  /**
   * 处理支付
   */
  async processPayment(billId: string, paymentInfo: PaymentInfo): Promise<void> {
    const bill = await this.billRepository.findOne({ where: { id: billId } });

    if (!bill) {
      throw new NotFoundException(`Bill ${billId} not found`);
    }

    if (bill.status !== 'pending') {
      throw new BadRequestException(`Bill ${billId} is not in pending status`);
    }

    // 调用Billing Service进行支付
    const paymentResult = await this.callBillingService({
      userId: bill.userId,
      amount: bill.total,
      currency: bill.currency,
      description: `Proxy service for ${bill.billingDate.toISOString().split('T')[0]}`,
      ...paymentInfo,
    });

    if (paymentResult.success) {
      // 支付成功
      bill.status = 'paid';
      await this.billRepository.save(bill);

      // 记录交易
      await this.transactionRepository.save({
        userId: bill.userId,
        billId: bill.id,
        transactionType: 'charge',
        amount: bill.total,
        currency: bill.currency,
        paymentMethod: paymentInfo.method,
        transactionNo: paymentResult.transactionNo,
        status: 'completed',
        description: `Payment for bill ${bill.id}`,
      });

      // 发布支付成功事件
      await this.eventBus.publish('cloudphone.events', 'proxy.payment.success', {
        userId: bill.userId,
        billId: bill.id,
        amount: bill.total,
        timestamp: new Date(),
      });
    } else {
      // 支付失败
      bill.status = 'failed';
      await this.billRepository.save(bill);

      throw new BadRequestException(`Payment failed: ${paymentResult.error}`);
    }
  }

  /**
   * 获取用户账单列表
   */
  async getUserBills(
    userId: string,
    query: BillQueryDto,
  ): Promise<{ bills: ProxyBill[]; total: number }> {
    const { page = 1, limit = 20, startDate, endDate, status } = query;

    const queryBuilder = this.billRepository
      .createQueryBuilder('bill')
      .where('bill.userId = :userId', { userId });

    if (startDate) {
      queryBuilder.andWhere('bill.billingDate >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('bill.billingDate <= :endDate', { endDate });
    }

    if (status) {
      queryBuilder.andWhere('bill.status = :status', { status });
    }

    const [bills, total] = await queryBuilder
      .orderBy('bill.billingDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { bills, total };
  }

  /**
   * 获取账单详情
   */
  async getBillDetail(billId: string): Promise<BillDetailDto> {
    const bill = await this.billRepository.findOne({
      where: { id: billId },
    });

    if (!bill) {
      throw new NotFoundException(`Bill ${billId} not found`);
    }

    // 获取详细的使用记录
    const startOfDay = new Date(bill.billingDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(bill.billingDate);
    endOfDay.setHours(23, 59, 59, 999);

    const usageRecords = await this.usageRepository.find({
      where: {
        deviceId: Like(`${bill.userId}%`),
        usedAt: Between(startOfDay, endOfDay),
      },
      order: { usedAt: 'DESC' },
    });

    return {
      ...bill,
      usageRecords: usageRecords.map((record) => ({
        deviceId: record.deviceId,
        provider: record.provider,
        country: record.country,
        city: record.city,
        bandwidthMB: record.bandwidthMB,
        cost: record.cost,
        usedAt: record.usedAt,
      })),
    };
  }

  /**
   * 与Billing Service集成
   */
  private async callBillingService(paymentData: any): Promise<any> {
    // 调用billing-service的API
    try {
      const response = await axios.post(
        'http://billing-service:30005/payment/create',
        paymentData,
      );
      return { success: true, ...response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private calculateAvgQuality(usageRecords: ProxyUsage[]): number {
    const successRecords = usageRecords.filter((r) => r.success);
    if (successRecords.length === 0) return 0;
    return (successRecords.length / usageRecords.length) * 100;
  }

  private async checkUserVipStatus(userId: string): Promise<boolean> {
    // 调用user-service查询用户VIP状态
    try {
      const response = await axios.get(
        `http://user-service:30001/users/${userId}/vip-status`,
      );
      return response.data.isVip;
    } catch (error) {
      return false;
    }
  }
}
```

### 3.3 计费API

```typescript
// src/statistics/controllers/billing.controller.ts

@Controller('proxy/billing')
@ApiTags('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: ProxyBillingService) {}

  @Get('bills')
  @ApiOperation({ summary: '获取我的账单列表' })
  async getMyBills(
    @CurrentUser() user: User,
    @Query() query: BillQueryDto,
  ) {
    return this.billingService.getUserBills(user.id, query);
  }

  @Get('bills/:id')
  @ApiOperation({ summary: '获取账单详情' })
  async getBillDetail(@Param('id') id: string) {
    return this.billingService.getBillDetail(id);
  }

  @Post('bills/:id/pay')
  @ApiOperation({ summary: '支付账单' })
  async payBill(
    @Param('id') id: string,
    @Body() paymentInfo: PaymentInfoDto,
  ) {
    return this.billingService.processPayment(id, paymentInfo);
  }

  @Get('summary')
  @ApiOperation({ summary: '获取账单汇总' })
  async getBillSummary(
    @CurrentUser() user: User,
    @Query() query: SummaryQueryDto,
  ) {
    return this.billingService.getBillSummary(user.id, query);
  }

  @Get('transactions')
  @ApiOperation({ summary: '获取交易记录' })
  async getTransactions(
    @CurrentUser() user: User,
    @Query() query: TransactionQueryDto,
  ) {
    return this.billingService.getTransactions(user.id, query);
  }
}
```

---

## 四、前端集成方案

### 4.1 管理员后台页面（Admin Frontend）

#### 页面列表

1. **代理套餐管理** (`/admin/proxy/plans`)
   - 套餐列表
   - 创建/编辑套餐
   - 启用/禁用套餐

2. **供应商配置** (`/admin/proxy/providers`)
   - 供应商列表
   - 配置编辑
   - 连接测试

3. **代理池监控** (`/admin/proxy/pools`)
   - 实时代理池状态
   - 各地区分布
   - 健康度监控

4. **成本分析** (`/admin/proxy/cost`)
   - 成本趋势图
   - 供应商成本对比
   - 优化建议

5. **用户使用统计** (`/admin/proxy/users`)
   - 用户使用排行
   - 流量统计
   - 异常检测

#### 示例页面组件

```typescript
// frontend/admin/src/pages/Proxy/PlanList.tsx

export const ProxyPlanList: React.FC = () => {
  const [plans, setPlans] = useState<ProxyPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await proxyApi.getPlans();
      setPlans(response.data);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (planId: string) => {
    await proxyApi.togglePlan(planId);
    await fetchPlans();
  };

  const columns = [
    {
      title: '套餐名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '支持地区',
      dataIndex: 'regions',
      key: 'regions',
      render: (regions: string[]) => regions.join(', '),
    },
    {
      title: '用户价格',
      dataIndex: 'pricePerGB',
      key: 'pricePerGB',
      render: (price: number) => `$${price.toFixed(2)}/GB`,
    },
    {
      title: '成本价格',
      dataIndex: 'costPerGB',
      key: 'costPerGB',
      render: (cost: number) => `$${cost.toFixed(2)}/GB`,
    },
    {
      title: '利润率',
      key: 'profit',
      render: (_, record: ProxyPlan) => {
        const profit = ((record.pricePerGB - record.costPerGB) / record.pricePerGB * 100);
        return `${profit.toFixed(1)}%`;
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Badge status={enabled ? 'success' : 'default'} text={enabled ? '启用' : '禁用'} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: ProxyPlan) => (
        <Space>
          <Button size="small" onClick={() => handleEdit(record.id)}>编辑</Button>
          <Button size="small" onClick={() => handleToggle(record.id)}>
            {record.enabled ? '禁用' : '启用'}
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={() => setCreateModalVisible(true)}>
            创建套餐
          </Button>
          <Button onClick={fetchPlans}>刷新</Button>
        </Space>
        <Table
          columns={columns}
          dataSource={plans}
          loading={loading}
          rowKey="id"
        />
      </Card>
    </PageContainer>
  );
};
```

---

### 4.2 用户前台页面（User Frontend）

#### 页面列表

1. **代理套餐选择** (`/user/proxy/plans`)
   - 套餐卡片展示
   - 套餐对比
   - 订阅购买

2. **我的代理** (`/user/proxy/my`)
   - 当前使用的代理信息
   - 流量使用情况
   - 手动轮换

3. **偏好设置** (`/user/proxy/preferences`)
   - 地区偏好
   - 自动轮换设置
   - 协议选择

4. **使用统计** (`/user/proxy/usage`)
   - 流量使用趋势
   - 地区分布
   - 成本分析

5. **账单管理** (`/user/proxy/bills`)
   - 账单列表
   - 账单详情
   - 在线支付

#### 示例页面组件

```typescript
// frontend/user/src/pages/Proxy/PlanSelect.tsx

export const ProxyPlanSelect: React.FC = () => {
  const [plans, setPlans] = useState<ProxyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailablePlans();
  }, []);

  const fetchAvailablePlans = async () => {
    const response = await proxyApi.getAvailablePlans();
    setPlans(response.data);
  };

  const handleSubscribe = async (planId: string) => {
    try {
      await proxyApi.subscribePlan({ planId });
      message.success('订阅成功！');
      // 跳转到我的代理页面
      history.push('/user/proxy/my');
    } catch (error) {
      message.error('订阅失败：' + error.message);
    }
  };

  return (
    <PageContainer title="选择代理套餐">
      <Row gutter={[16, 16]}>
        {plans.map((plan) => (
          <Col key={plan.id} xs={24} sm={12} lg={8}>
            <Card
              hoverable
              actions={[
                <Button
                  type="primary"
                  block
                  onClick={() => handleSubscribe(plan.id)}
                >
                  立即订阅
                </Button>,
              ]}
            >
              <Statistic
                title={plan.name}
                value={plan.pricePerGB}
                prefix="$"
                suffix="/GB"
              />
              <Divider />
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <GlobalOutlined /> 支持地区：
                  {plan.regions.map((region) => (
                    <Tag key={region}>{region}</Tag>
                  ))}
                </div>
                <div>
                  <ThunderboltOutlined /> 协议：{plan.protocol.toUpperCase()}
                </div>
                <div>
                  <CheckCircleOutlined /> 最低质量：{plan.minQuality}%
                </div>
                {plan.monthlyQuotaGB > 0 && (
                  <div>
                    <DatabaseOutlined /> 月度配额：{plan.monthlyQuotaGB}GB
                  </div>
                )}
                {plan.tags?.includes('popular') && (
                  <Tag color="red">热门</Tag>
                )}
                {plan.tags?.includes('recommended') && (
                  <Tag color="blue">推荐</Tag>
                )}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
};
```

---

## 五、实施优先级

### Phase 1: 基础功能（Week 1-2）
- [ ] 套餐数据模型和API
- [ ] 管理员创建/编辑套餐
- [ ] 用户查看可用套餐

### Phase 2: 订阅和选择（Week 3-4）
- [ ] 用户订阅套餐
- [ ] 根据订阅选择代理
- [ ] 偏好设置功能

### Phase 3: 计费系统（Week 5-6）
- [ ] 使用量统计
- [ ] 自动生成账单
- [ ] 账单查询和支付

### Phase 4: 高级功能（Week 7-8）
- [ ] 管理员成本分析
- [ ] 用户使用统计
- [ ] 优化和监控

---

`★ Insight ─────────────────────────────────────`
**关键洞察：**

1. **B2C商业模式** - 通过管理员配置套餐+用户自主选择，实现灵活的B2C服务模式

2. **成本加成定价** - 管理员设置成本价和销售价，自动计算利润率，实现精细化成本控制

3. **用户自主权** - 用户可以根据需求选择不同地区和套餐，提升用户体验和满意度

4. **自动计费** - 定时任务自动生成账单，减少人工介入，提高运营效率

5. **与Billing Service集成** - 复用现有的billing-service，避免重复开发支付逻辑
`─────────────────────────────────────────────────`

**这套方案将Proxy Service从基础设施服务升级为可商业化的产品！**
