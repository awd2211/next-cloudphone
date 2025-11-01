# 云手机平台功能实施计划 v2.0

> 基于现有微服务架构的功能扩展方案
> **原则**: 不新增微服务，在现有服务中扩展模块
> 生成日期: 2025-11-01

---

## 🎯 总体策略

### 现有微服务架构（6个服务）

```
api-gateway (30000)          - 路由、认证、限流
user-service (30001)         - 用户、权限、配额、工单、审计
device-service (30002)       - 设备管理、调度、批量操作
app-service (30003)          - 应用管理
billing-service (30005)      - 计费、支付、账单
notification-service (30006) - 通知
```

### 功能归属原则

1. **内聚性** - 功能归属到最相关的服务
2. **最小改动** - 优先扩展现有模块
3. **职责清晰** - 避免跨服务职责混乱
4. **易维护** - 保持服务边界清晰

---

## 📦 功能归属方案

### 方案总览

| 新功能 | 归属服务 | 新增模块 | 理由 |
|--------|---------|---------|------|
| 实时群控同步 | device-service | sync-control/ | 设备控制增强 |
| 脚本录制回放 | device-service | automation/ | 设备自动化 |
| 多云成本优化 | billing-service | cost-optimization/ | 计费分析增强 |
| 用户行为分析 | user-service | analytics/ | 已有事件存储 |
| Webhook系统 | notification-service | webhooks/ | 通知扩展 |

---

## 1️⃣ Device Service 扩展

### 当前模块结构
```
backend/device-service/src/
├── devices/              ✅ 设备CRUD
├── batch-operations.*    ✅ 批量操作
├── scheduler/            ✅ 调度系统
├── templates/            ✅ 设备模板
├── snapshots/            ✅ 快照管理
├── lifecycle/            ✅ 生命周期
├── failover/             ✅ 故障转移
├── providers/            ✅ 多云提供商
├── adb/                  ✅ ADB控制
└── docker/               ✅ Docker管理
```

### 新增模块

#### 1.1 实时群控同步 (sync-control/)

**目录结构**:
```typescript
backend/device-service/src/
└── sync-control/                    # 新增模块
    ├── dto/
    │   ├── create-sync-session.dto.ts
    │   ├── sync-command.dto.ts
    │   └── sync-status.dto.ts
    ├── entities/
    │   ├── sync-session.entity.ts   # 同步会话
    │   └── sync-command.entity.ts   # 同步命令
    ├── sync-control.controller.ts
    ├── sync-control.service.ts
    ├── sync-executor.service.ts     # 命令执行器
    ├── delay-compensator.service.ts # 延迟补偿
    └── sync-control.gateway.ts      # WebSocket网关
```

**核心功能**:
```typescript
// 1. 创建同步会话
POST /devices/sync-control/sessions
{
  "name": "游戏同步-001",
  "masterDeviceId": "device-001",      // 主控设备
  "slaveDeviceIds": ["device-002", "device-003", ...],
  "syncMode": "mirror",                 // mirror | coordinated
  "delayCompensation": true
}

// 2. 发送同步命令
POST /devices/sync-control/sessions/:sessionId/command
{
  "action": "click",
  "params": { "x": 100, "y": 200 }
}

// 3. WebSocket实时同步
WS /devices/sync-control/sessions/:sessionId/ws
- 监听主控设备事件
- 实时广播到从设备
- 返回执行结果
```

**技术实现**:
```typescript
// sync-control.service.ts
@Injectable()
export class SyncControlService {
  constructor(
    private readonly adbService: AdbService,
    private readonly delayCompensator: DelayCompensatorService,
    @InjectRepository(SyncSession)
    private readonly sessionRepo: Repository<SyncSession>,
  ) {}

  // 创建同步会话
  async createSession(dto: CreateSyncSessionDto): Promise<SyncSession> {
    // 1. 验证所有设备在线
    // 2. 创建WebSocket连接池
    // 3. 初始化延迟补偿器
    // 4. 保存会话到数据库
  }

  // 执行同步命令
  async executeSyncCommand(
    sessionId: string,
    command: SyncCommandDto
  ): Promise<SyncExecutionResult> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });

    // 1. 计算延迟补偿
    const delays = await this.delayCompensator.calculate(session.slaveDeviceIds);

    // 2. 并行执行命令（带延迟补偿）
    const results = await Promise.all(
      session.slaveDeviceIds.map(async (deviceId, index) => {
        // 延迟补偿
        if (delays[deviceId] > 0) {
          await this.sleep(delays[deviceId]);
        }

        // 执行命令
        return this.adbService.executeCommand(deviceId, command);
      })
    );

    return {
      sessionId,
      commandId: command.id,
      results,
      averageDelay: this.calculateAverageDelay(results)
    };
  }
}

// delay-compensator.service.ts
@Injectable()
export class DelayCompensatorService {
  private latencyMap = new Map<string, number>();

  // 测量设备延迟
  async measureLatency(deviceId: string): Promise<number> {
    const start = Date.now();
    await this.adbService.ping(deviceId);
    const latency = Date.now() - start;

    this.latencyMap.set(deviceId, latency);
    return latency;
  }

  // 计算延迟补偿
  async calculate(deviceIds: string[]): Promise<Record<string, number>> {
    // 1. 测量所有设备的延迟
    const latencies = await Promise.all(
      deviceIds.map(id => this.measureLatency(id))
    );

    // 2. 找到最大延迟
    const maxLatency = Math.max(...latencies);

    // 3. 计算每个设备需要补偿的延迟
    const compensations: Record<string, number> = {};
    deviceIds.forEach((deviceId, index) => {
      compensations[deviceId] = maxLatency - latencies[index];
    });

    return compensations;
  }
}

// sync-control.gateway.ts (WebSocket)
@WebSocketGateway({
  namespace: 'sync-control',
  cors: { origin: '*' }
})
export class SyncControlGateway {
  @WebSocketServer()
  server: Server;

  // 客户端加入同步会话
  @SubscribeMessage('joinSession')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; deviceId: string }
  ) {
    client.join(`session-${data.sessionId}`);

    // 记录设备连接
    this.deviceConnections.set(data.deviceId, client.id);
  }

  // 主控设备发送命令
  @SubscribeMessage('syncCommand')
  async handleSyncCommand(
    @ConnectedSocket() client: Socket,
    @MessageBody() command: SyncCommandDto
  ) {
    // 广播到所有从设备
    this.server
      .to(`session-${command.sessionId}`)
      .emit('executeCommand', command);
  }

  // 从设备上报执行结果
  @SubscribeMessage('commandResult')
  handleCommandResult(
    @MessageBody() result: CommandResult
  ) {
    // 收集结果
    this.resultCollector.add(result);

    // 检查是否所有设备都完成
    if (this.resultCollector.isComplete()) {
      // 通知前端
      this.server
        .to(`session-${result.sessionId}`)
        .emit('commandCompleted', this.resultCollector.summary());
    }
  }
}
```

**数据库表**:
```typescript
// sync_sessions 表
@Entity('sync_sessions')
export class SyncSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  masterDeviceId: string;

  @Column('simple-array')
  slaveDeviceIds: string[];

  @Column({ default: 'active' })
  status: 'active' | 'paused' | 'stopped';

  @Column({ default: 'mirror' })
  syncMode: 'mirror' | 'coordinated';

  @Column({ default: true })
  delayCompensation: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  statistics: {
    commandsExecuted: number;
    averageDelay: number;
    successRate: number;
  };
}

// sync_commands 表
@Entity('sync_commands')
export class SyncCommand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  action: string; // click, swipe, input, etc.

  @Column({ type: 'jsonb' })
  params: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  results: Record<string, any>;

  @Column()
  executedAt: Date;

  @Column()
  duration: number; // 执行耗时（ms）
}
```

**前端组件**:
```tsx
// frontend/admin/src/pages/SyncControl/
SyncControlCenter.tsx       // 群控中心
CreateSession.tsx          // 创建会话
SessionMonitor.tsx         // 会话监控
DeviceGrid.tsx            // 设备网格（显示多设备实时状态）
```

**实施估算**:
- 开发周期: 3-4周
- 技术难度: 高（WebSocket连接池、延迟补偿）
- 依赖: 现有的ADB服务、设备管理

---

#### 1.2 脚本录制回放 (automation/)

**目录结构**:
```typescript
backend/device-service/src/
└── automation/                      # 新增模块
    ├── dto/
    │   ├── create-script.dto.ts
    │   ├── execute-script.dto.ts
    │   └── recording.dto.ts
    ├── entities/
    │   ├── script.entity.ts         # 脚本
    │   ├── script-version.entity.ts # 脚本版本
    │   └── execution-log.entity.ts  # 执行日志
    ├── automation.controller.ts
    ├── automation.service.ts
    ├── recorder.service.ts          # 录制服务
    ├── script-parser.service.ts     # 脚本解析
    └── script-executor.service.ts   # 脚本执行
```

**核心功能**:
```typescript
// 1. 开始录制
POST /devices/:deviceId/automation/start-recording
{
  "name": "登录流程",
  "description": "自动化登录测试"
}

// 2. 停止录制并生成脚本
POST /devices/:deviceId/automation/stop-recording
-> 返回: Script对象

// 3. 执行脚本
POST /automation/scripts/:scriptId/execute
{
  "deviceIds": ["device-001", "device-002"],
  "parameters": {
    "username": "test",
    "password": "123456"
  }
}

// 4. 批量执行
POST /automation/scripts/:scriptId/batch-execute
{
  "deviceIds": [...],
  "parallelism": 10  // 并发数
}
```

**脚本DSL设计**:
```yaml
# 脚本格式（存储为JSONB）
{
  "name": "登录测试",
  "version": "1.0.0",
  "parameters": [
    { "name": "username", "type": "string", "required": true },
    { "name": "password", "type": "string", "required": true, "secret": true }
  ],
  "steps": [
    {
      "id": "step-001",
      "name": "启动应用",
      "action": "launch_app",
      "params": {
        "package": "com.example.app"
      }
    },
    {
      "id": "step-002",
      "name": "等待登录页面",
      "action": "wait_for_element",
      "params": {
        "selector": "id/login_button",
        "timeout": 10
      }
    },
    {
      "id": "step-003",
      "name": "输入用户名",
      "action": "input_text",
      "params": {
        "selector": "id/username_input",
        "text": "{{username}}"  // 参数引用
      }
    },
    {
      "id": "step-004",
      "name": "输入密码",
      "action": "input_text",
      "params": {
        "selector": "id/password_input",
        "text": "{{password}}"
      }
    },
    {
      "id": "step-005",
      "name": "点击登录",
      "action": "click",
      "params": {
        "selector": "id/login_button"
      }
    },
    {
      "id": "step-006",
      "name": "验证登录成功",
      "action": "assert_element_exists",
      "params": {
        "selector": "id/home_screen",
        "timeout": 10
      },
      "onFailure": {
        "action": "retry",
        "maxAttempts": 3
      }
    }
  ]
}
```

**技术实现**:
```typescript
// recorder.service.ts
@Injectable()
export class RecorderService {
  private recordingSessions = new Map<string, RecordingSession>();

  // 开始录制
  async startRecording(deviceId: string, name: string): Promise<string> {
    const sessionId = uuid();

    // 1. 开启ADB事件监听
    await this.adbService.startEventMonitoring(deviceId);

    // 2. 创建录制会话
    const session = {
      id: sessionId,
      deviceId,
      name,
      startedAt: new Date(),
      events: []
    };

    this.recordingSessions.set(sessionId, session);

    // 3. 订阅ADB事件
    this.adbService.on('touch', (event) => {
      session.events.push({
        type: 'click',
        timestamp: Date.now() - session.startedAt.getTime(),
        params: { x: event.x, y: event.y }
      });
    });

    this.adbService.on('swipe', (event) => {
      session.events.push({
        type: 'swipe',
        timestamp: Date.now() - session.startedAt.getTime(),
        params: {
          startX: event.startX,
          startY: event.startY,
          endX: event.endX,
          endY: event.endY
        }
      });
    });

    return sessionId;
  }

  // 停止录制
  async stopRecording(sessionId: string): Promise<Script> {
    const session = this.recordingSessions.get(sessionId);

    // 1. 停止事件监听
    await this.adbService.stopEventMonitoring(session.deviceId);

    // 2. 事件优化（去重、合并）
    const optimizedEvents = this.optimizeEvents(session.events);

    // 3. 生成脚本
    const script = this.generateScript(session.name, optimizedEvents);

    // 4. 保存到数据库
    return this.scriptRepository.save(script);
  }

  // 事件优化
  private optimizeEvents(events: RecordedEvent[]): RecordedEvent[] {
    // 1. 去除重复的点击（1秒内的重复点击）
    // 2. 合并连续的滑动为一个滑动
    // 3. 过滤无效事件
    // 4. 添加等待时间

    return events; // 简化实现
  }
}

// script-executor.service.ts
@Injectable()
export class ScriptExecutorService {
  async executeScript(
    scriptId: string,
    deviceId: string,
    parameters: Record<string, any>
  ): Promise<ExecutionResult> {
    const script = await this.scriptRepository.findOne({ where: { id: scriptId } });

    // 1. 参数替换
    const resolvedScript = this.resolveParameters(script, parameters);

    // 2. 执行每一步
    const stepResults = [];

    for (const step of resolvedScript.steps) {
      try {
        const result = await this.executeStep(deviceId, step);
        stepResults.push(result);

        // 截图（可选）
        if (step.screenshot) {
          result.screenshot = await this.adbService.screenshot(deviceId);
        }

      } catch (error) {
        // 错误处理
        if (step.onFailure) {
          await this.handleStepFailure(deviceId, step, error);
        } else {
          throw error;
        }
      }

      // 等待
      if (step.delay) {
        await this.sleep(step.delay);
      }
    }

    return {
      scriptId,
      deviceId,
      status: 'success',
      steps: stepResults
    };
  }

  // 执行单步
  private async executeStep(deviceId: string, step: ScriptStep) {
    switch (step.action) {
      case 'click':
        return this.adbService.click(deviceId, step.params.x, step.params.y);

      case 'swipe':
        return this.adbService.swipe(deviceId,
          step.params.startX, step.params.startY,
          step.params.endX, step.params.endY
        );

      case 'input_text':
        return this.adbService.inputText(deviceId, step.params.text);

      case 'launch_app':
        return this.adbService.launchApp(deviceId, step.params.package);

      case 'wait':
        return this.sleep(step.params.duration);

      case 'assert_element_exists':
        return this.assertElementExists(deviceId, step.params.selector);

      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }
}
```

**数据库表**:
```typescript
// scripts 表
@Entity('automation_scripts')
export class Script {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  content: ScriptContent; // YAML格式的脚本内容

  @Column()
  version: string;

  @Column()
  authorId: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 0 })
  executionCount: number;

  @Column({ default: 0 })
  successCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// script_executions 表
@Entity('script_executions')
export class ScriptExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  scriptId: string;

  @Column()
  deviceId: string;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any>;

  @Column()
  status: 'running' | 'success' | 'failed';

  @Column({ type: 'jsonb', nullable: true })
  results: any;

  @Column({ nullable: true })
  error: string;

  @Column()
  duration: number; // ms

  @CreateDateColumn()
  executedAt: Date;
}
```

**前端组件**:
```tsx
// frontend/admin/src/pages/Automation/
ScriptLibrary.tsx          // 脚本库
ScriptRecorder.tsx         // 录制界面
ScriptEditor.tsx           // 可视化编辑器（拖拽式）
ExecutionCenter.tsx        // 执行中心
ExecutionReport.tsx        // 执行报告
```

**实施估算**:
- Phase 1 (基础录制回放): 2周
- Phase 2 (可视化编辑器): 2周
- Phase 3 (参数化、条件、循环): 2周
- 总计: 4-6周

---

## 2️⃣ Billing Service 扩展

### 当前模块结构
```
backend/billing-service/src/
├── billing/              ✅ 计费规则
├── invoices/             ✅ 账单管理
├── payments/             ✅ 支付处理
├── balance/              ✅ 余额管理
├── metering/             ✅ 使用计量
├── reports/              ✅ 报表生成
├── stats/                ✅ 统计分析
└── billing-rules/        ✅ 计费规则
```

### 新增模块

#### 2.1 多云成本优化 (cost-optimization/)

**目录结构**:
```typescript
backend/billing-service/src/
└── cost-optimization/               # 新增模块
    ├── dto/
    │   ├── cost-analysis.dto.ts
    │   ├── optimization-recommendation.dto.ts
    │   └── budget-alert.dto.ts
    ├── entities/
    │   ├── cloud-cost.entity.ts     # 云成本记录
    │   ├── cost-forecast.entity.ts  # 成本预测
    │   └── budget.entity.ts         # 预算管理
    ├── collectors/                  # 成本收集器
    │   ├── base-collector.ts
    │   ├── huawei-collector.service.ts
    │   ├── alibaba-collector.service.ts
    │   └── self-hosted-calculator.service.ts
    ├── analyzers/                   # 分析器
    │   ├── cost-analyzer.service.ts
    │   ├── trend-predictor.service.ts
    │   └── anomaly-detector.service.ts
    ├── optimizers/                  # 优化器
    │   ├── recommendation-engine.service.ts
    │   └── auto-optimizer.service.ts
    ├── cost-optimization.controller.ts
    └── cost-optimization.service.ts
```

**API设计**:
```typescript
// 1. 获取成本概览
GET /billing/cost-optimization/overview?period=last30days
-> 返回: { totalCost, byProvider, trend, forecast }

// 2. 获取优化建议
GET /billing/cost-optimization/recommendations
-> 返回: [ { category, title, impact, actions, automatable } ]

// 3. 云提供商成本对比
GET /billing/cost-optimization/provider-comparison
-> 返回: { specs: [], providers: {}, cheapest: {} }

// 4. 成本趋势和预测
GET /billing/cost-optimization/forecast?horizon=30
-> 返回: { historical, predicted, confidence }

// 5. 预算管理
POST /billing/cost-optimization/budgets
PUT /billing/cost-optimization/budgets/:id/alerts
```

**技术实现**:
```typescript
// huawei-collector.service.ts
@Injectable()
export class HuaweiCostCollectorService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  @Cron('0 2 * * *') // 每天凌晨2点
  async collectDailyCosts() {
    const credentials = this.configService.get('HUAWEI_CLOUD');

    // 1. 调用华为云账单API
    const billDetails = await this.huaweiClient.billing.queryBillDetail({
      cycleType: 'daily',
      cycle: moment().subtract(1, 'day').format('YYYY-MM-DD')
    });

    // 2. 转换为统一格式
    const costs = this.transformToCostModel(billDetails);

    // 3. 存储
    await this.cloudCostRepository.bulkInsert(costs);

    // 4. 触发分析
    await this.eventBus.publish('cost.collected', {
      provider: 'huawei',
      totalCost: costs.reduce((sum, c) => sum + c.finalCost, 0)
    });
  }

  // 实时成本估算
  async estimateRealtimeCost(): Promise<number> {
    // 获取华为云正在运行的设备
    const devices = await this.deviceService.findByProvider('huawei_cph');

    // 根据规格和运行时长估算
    const estimated = devices.reduce((sum, device) => {
      const hourlyRate = this.getHourlyRate(device.spec);
      const hours = this.calculateRunningHours(device.startedAt);
      return sum + (hourlyRate * hours);
    }, 0);

    return estimated;
  }
}

// recommendation-engine.service.ts
@Injectable()
export class RecommendationEngineService {
  async generateRecommendations(): Promise<Recommendation[]> {
    const recommendations = [];

    // 1. 检测闲置资源
    const idleDevices = await this.detectIdleDevices();
    if (idleDevices.length > 0) {
      recommendations.push({
        id: 'idle-devices',
        category: 'cost_reduction',
        priority: 'high',
        title: `删除${idleDevices.length}台闲置设备`,
        description: `发现${idleDevices.length}台设备已停止超过7天`,
        impact: {
          monthlySavings: idleDevices.length * 50,
          roi: 1000
        },
        actions: [
          { type: 'batch_delete', deviceIds: idleDevices.map(d => d.id) }
        ],
        automatable: true
      });
    }

    // 2. 云提供商价格对比
    const comparisons = await this.compareProviderPricing();
    for (const comp of comparisons) {
      if (comp.savingsPercentage > 10) {
        recommendations.push({
          id: `migrate-${comp.spec}`,
          category: 'cost_reduction',
          priority: 'medium',
          title: `迁移${comp.spec}到${comp.cheapestProvider}`,
          description: `可节省${comp.savingsPercentage}%成本`,
          impact: {
            monthlySavings: comp.monthlySavings,
            roi: comp.roi
          },
          actions: [
            { type: 'provider_migration', spec: comp.spec, to: comp.cheapestProvider }
          ],
          automatable: false
        });
      }
    }

    // 3. 预留实例建议
    // 4. 自动关机策略
    // ...

    return recommendations.sort((a, b) => b.impact.roi - a.impact.roi);
  }
}
```

**数据库表**:
```typescript
// cloud_costs 表
@Entity('cloud_costs')
export class CloudCost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: 'huawei' | 'alibaba' | 'self_hosted';

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'jsonb' })
  breakdown: {
    compute: number;
    storage: number;
    network: number;
    support: number;
  };

  @Column({ type: 'jsonb' })
  usage: {
    deviceHours: number;
    storageGB: number;
    networkGB: number;
  };

  @Column('decimal', { precision: 10, scale: 2 })
  totalCost: number;

  @Column('decimal', { precision: 10, scale: 2 })
  finalCost: number;

  @Column({ type: 'jsonb', nullable: true })
  tags: Record<string, string>;
}

// budgets 表
@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal')
  amount: number;

  @Column({ default: 'monthly' })
  period: 'daily' | 'monthly' | 'yearly';

  @Column({ type: 'jsonb' })
  thresholds: Array<{
    percentage: number;
    action: 'notify' | 'restrict' | 'block';
    triggered: boolean;
  }>;

  @Column({ default: true })
  active: boolean;
}
```

**前端组件**:
```tsx
// frontend/admin/src/pages/CostOptimization/
CostDashboard.tsx          // 成本总览
ProviderComparison.tsx     // 云对比
Recommendations.tsx        // 优化建议
BudgetManagement.tsx       // 预算管理
CostAnalytics.tsx         // 成本分析
```

**实施估算**:
- 开发周期: 4-5周
- 技术难度: 中（主要是多云API集成）
- 依赖: 华为云和阿里云的账单API权限

---

## 3️⃣ User Service 扩展

### 当前模块结构
```
backend/user-service/src/
├── users/                ✅ 用户管理
├── roles/                ✅ 角色管理
├── permissions/          ✅ 权限管理
├── quotas/               ✅ 配额管理
├── tickets/              ✅ 工单系统
├── api-keys/             ✅ API密钥
├── audit-logs/           ✅ 审计日志
├── users/events/         ✅ 事件存储 (Event Sourcing)
└── cache/                ✅ 缓存管理
```

### 新增模块

#### 3.1 用户行为分析 (analytics/)

**目录结构**:
```typescript
backend/user-service/src/
└── analytics/                       # 新增模块
    ├── dto/
    │   ├── user-behavior.dto.ts
    │   ├── cohort-analysis.dto.ts
    │   └── funnel-analysis.dto.ts
    ├── entities/
    │   ├── user-behavior-event.entity.ts
    │   └── analytics-report.entity.ts
    ├── analyzers/
    │   ├── rfm-analyzer.service.ts       # RFM分析
    │   ├── cohort-analyzer.service.ts    # 群组分析
    │   ├── funnel-analyzer.service.ts    # 漏斗分析
    │   └── retention-analyzer.service.ts # 留存分析
    ├── analytics.controller.ts
    └── analytics.service.ts
```

**关键点**:
- ✅ 已有 `audit-logs` 和 `users/events/event-store`，可以直接利用
- ✅ 无需新建事件追踪，复用现有数据
- ⚠️ 可选：增加时序数据库（ClickHouse）提升查询性能

**API设计**:
```typescript
// 1. RFM用户分群
GET /analytics/users/rfm-segments

// 2. 用户留存率
GET /analytics/users/retention?cohortDate=2025-01-01

// 3. 转化漏斗
GET /analytics/funnel?steps=register,create_device,payment

// 4. 用户活跃度
GET /analytics/users/activity?period=last30days
```

**技术实现**:
```typescript
// 直接利用现有的 audit-logs 和 event-store
@Injectable()
export class RFMAnalyzerService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    @InjectRepository(UserEvent)
    private userEventRepo: Repository<UserEvent>,
  ) {}

  async performRFMAnalysis(): Promise<RFMReport> {
    const users = await this.userRepository.findAll();

    const rfmScores = await Promise.all(
      users.map(async user => {
        // R - Recency (从audit_logs获取最后活跃时间)
        const lastActivity = await this.auditLogRepo
          .createQueryBuilder('log')
          .where('log.userId = :userId', { userId: user.id })
          .orderBy('log.createdAt', 'DESC')
          .limit(1)
          .getOne();

        const recency = moment().diff(lastActivity?.createdAt, 'days');
        const rScore = this.calculateScore(recency, [0, 7, 30, 90], true);

        // F - Frequency (从audit_logs统计活动频率)
        const activityCount = await this.auditLogRepo.count({
          where: {
            userId: user.id,
            createdAt: MoreThan(moment().subtract(30, 'days').toDate())
          }
        });
        const fScore = this.calculateScore(activityCount, [0, 5, 20, 50]);

        // M - Monetary (从billing获取消费金额)
        // 跨服务调用或从events中获取
        const totalSpend = await this.getTotalSpend(user.id);
        const mScore = this.calculateScore(totalSpend, [0, 100, 1000, 5000]);

        return {
          userId: user.id,
          r: rScore,
          f: fScore,
          m: mScore,
          segment: this.determineSegment(rScore, fScore, mScore)
        };
      })
    );

    return { users: rfmScores, summary: this.calculateSummary(rfmScores) };
  }
}
```

**实施估算**:
- 开发周期: 3-4周
- 技术难度: 中
- 依赖: 现有的audit-logs和event-store

---

## 4️⃣ Notification Service 扩展

### 当前模块结构
```
backend/notification-service/src/
├── notifications/        ✅ 通知管理
├── templates/            ✅ 模板系统
├── preferences/          ✅ 用户偏好
├── rabbitmq/             ✅ 事件消费
└── websocket/            ✅ WebSocket
```

### 新增模块

#### 4.1 Webhook系统 (webhooks/)

**目录结构**:
```typescript
backend/notification-service/src/
└── webhooks/                        # 新增模块
    ├── dto/
    │   ├── create-webhook.dto.ts
    │   ├── webhook-event.dto.ts
    │   └── webhook-log.dto.ts
    ├── entities/
    │   ├── webhook-config.entity.ts
    │   └── webhook-delivery.entity.ts
    ├── webhooks.controller.ts
    ├── webhooks.service.ts
    ├── webhook-sender.service.ts
    └── webhook-verifier.service.ts
```

**API设计**:
```typescript
// 1. 订阅Webhook
POST /webhooks/subscribe
{
  "url": "https://example.com/webhook",
  "events": ["device.created", "payment.success"],
  "secret": "your-secret-key"
}

// 2. 取消订阅
DELETE /webhooks/:webhookId

// 3. 测试Webhook
POST /webhooks/:webhookId/test

// 4. 查看Webhook日志
GET /webhooks/:webhookId/deliveries
```

**技术实现**:
```typescript
// webhook-sender.service.ts
@Injectable()
export class WebhookSenderService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(WebhookDelivery)
    private deliveryRepo: Repository<WebhookDelivery>,
  ) {}

  // 订阅RabbitMQ事件（复用现有的事件系统）
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: '*.*',  // 监听所有事件
    queue: 'webhooks.all-events'
  })
  async handleEvent(event: any, context: RabbitContext) {
    const routingKey = context.getMessage().fields.routingKey;

    // 1. 找到订阅此事件的Webhook
    const webhooks = await this.webhookRepo.find({
      where: {
        events: ArrayContains([routingKey]),
        active: true
      }
    });

    // 2. 并发发送到所有Webhook
    await Promise.allSettled(
      webhooks.map(webhook => this.sendWebhook(webhook, event, routingKey))
    );
  }

  // 发送Webhook
  private async sendWebhook(
    webhook: WebhookConfig,
    event: any,
    eventType: string
  ): Promise<void> {
    const payload = {
      event: eventType,
      data: event,
      timestamp: Date.now()
    };

    // 生成签名
    const signature = this.generateSignature(payload, webhook.secret);

    try {
      const response = await this.httpService.axiosRef.post(
        webhook.url,
        payload,
        {
          headers: {
            'X-CloudPhone-Signature': signature,
            'X-CloudPhone-Event': eventType,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      // 记录成功
      await this.deliveryRepo.save({
        webhookId: webhook.id,
        eventType,
        payload,
        statusCode: response.status,
        response: response.data,
        deliveredAt: new Date()
      });

    } catch (error) {
      // 记录失败并重试
      await this.deliveryRepo.save({
        webhookId: webhook.id,
        eventType,
        payload,
        statusCode: error.response?.status || 0,
        error: error.message,
        deliveredAt: new Date()
      });

      // 加入重试队列
      await this.enqueueRetry(webhook, payload, eventType);
    }
  }

  // 生成签名（HMAC-SHA256）
  private generateSignature(payload: any, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
```

**数据库表**:
```typescript
// webhook_configs 表
@Entity('webhook_configs')
export class WebhookConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  url: string;

  @Column('simple-array')
  events: string[]; // ['device.created', 'payment.success']

  @Column()
  secret: string;

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'jsonb', default: { maxRetries: 3, backoff: 'exponential' } })
  retryPolicy: {
    maxRetries: number;
    backoff: 'exponential' | 'linear';
  };

  @CreateDateColumn()
  createdAt: Date;
}

// webhook_deliveries 表
@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  webhookId: string;

  @Column()
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column()
  statusCode: number;

  @Column({ type: 'text', nullable: true })
  response: string;

  @Column({ type: 'text', nullable: true })
  error: string;

  @Column()
  deliveredAt: Date;
}
```

**实施估算**:
- 开发周期: 2-3周
- 技术难度: 低
- 依赖: 现有的RabbitMQ事件系统

---

## 📅 实施时间表

### Phase 1: P0核心功能 (3-4个月)

**Month 1-2: 实时群控 + Webhook**
```
Week 1-2:   Webhook系统（快速交付）
Week 3-6:   实时群控同步
Week 7-8:   测试和优化
```

**Month 3-4: 脚本录制回放**
```
Week 9-10:  基础录制回放
Week 11-12: 可视化编辑器
Week 13-14: 参数化和高级功能
Week 15-16: 测试和文档
```

### Phase 2: P1增强功能 (2-3个月)

**Month 5: 成本优化**
```
Week 17-18: 多云成本收集
Week 19-20: 分析和优化引擎
Week 21:    预算管理和告警
```

**Month 6: 用户分析**
```
Week 22-23: 基础分析（RFM、留存）
Week 24:    漏斗分析
Week 25:    实时看板
```

---

## 🎯 开发优先级建议

### 立即开始（本月）

**推荐顺序**:
1. **Webhook系统** (2-3周)
   - 技术难度最低
   - 快速交付，提升士气
   - 为其他服务提供事件通知能力

2. **实时群控同步** (3-4周)
   - 商业价值最高
   - 复用batch-operations的大部分代码
   - 游戏工作室核心需求

3. **脚本录制回放** (4-6周)
   - 扩大用户群
   - 降低自动化门槛
   - 分阶段交付MVP

### 下一阶段（Q2）

4. **成本优化** (4-5周)
   - 直接降本，核心卖点
   - 需要云服务API权限

5. **用户分析** (3-4周)
   - 提升留存和转化
   - 复用现有数据

---

## 💡 关键成功因素

### 技术层面

1. **模块化设计** - 每个新功能独立模块，降低耦合
2. **复用现有能力** - 最大化利用现有服务和数据
3. **渐进式交付** - 先MVP，后完善

### 组织层面

1. **明确Owner** - 每个功能指定负责人
2. **周期性Review** - 每周代码审查
3. **文档同步** - 开发同时更新文档

### 质量保证

1. **单元测试覆盖** - 新功能 > 80%覆盖率
2. **集成测试** - 关键流程端到端测试
3. **性能测试** - 压测关键接口

---

## 📦 总结

### 优势

✅ **不增加运维复杂度** - 保持6个微服务
✅ **快速交付** - 复用现有代码和基础设施
✅ **易维护** - 模块化设计，边界清晰
✅ **低风险** - 渐进式扩展，不影响现有功能

### 架构合理性

| 服务 | 新增模块 | 模块数 | 职责清晰度 |
|------|---------|--------|-----------|
| device-service | +2 | 31 | ⭐⭐⭐⭐ |
| billing-service | +1 | 9 | ⭐⭐⭐⭐⭐ |
| user-service | +1 | 10 | ⭐⭐⭐⭐⭐ |
| notification-service | +1 | 5 | ⭐⭐⭐⭐⭐ |

**说明**: device-service会有31个模块，稍显臃肿，但仍在可控范围。

### 后续优化建议

如果未来device-service确实太重，可以考虑：
- 将scheduler/独立为`scheduler-service`
- 将automation/独立为`automation-service`

但目前阶段，**不建议拆分**，先把功能做出来最重要！

---

**文档版本**: v2.0
**更新日期**: 2025-11-01
**下次审阅**: 完成Phase 1后（3-4个月后）

