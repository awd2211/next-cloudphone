# 云手机家宽代理集成设计文档

**日期**: 2025-11-02
**服务**: device-service + proxy-service
**状态**: 🔧 设计阶段

---

## 📋 需求概述

### 核心需求

**为每台云手机（Redroid 容器）分配独立的家宽代理 IP，让云手机的网络流量看起来像真实家庭用户**

### 业务价值

1. **反爬虫绕过**: 云手机行为更像真实用户，避免触发反爬虫机制
2. **地域模拟**: 不同云手机可以使用不同地区的 IP，模拟多地用户
3. **IP 隔离**: 每台云手机独立 IP，避免批量行为关联
4. **负载均衡**: 分散请求到多个 IP，避免单 IP 限流

---

## 🏗️ 架构设计

### 整体架构

```
┌─────────────────────────────────────────────┐
│            proxy-service (30007)            │
│  - 管理家宽代理池 (IPRoyal/Luminati)         │
│  - 代理分配/释放 API                         │
│  - 代理健康监控                              │
└─────────────────┬───────────────────────────┘
                  │
                  │ HTTP API
                  │ • POST /proxy/acquire  (分配代理)
                  │ • POST /proxy/release  (释放代理)
                  │ • GET  /proxy/:id      (查询代理)
                  │
┌─────────────────▼───────────────────────────┐
│         device-service (30002)              │
│  - 创建云手机时分配代理                      │
│  - 将代理配置注入容器                        │
│  - 管理代理生命周期                          │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┼─────────┬─────────┐
        ▼         ▼         ▼         ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │云手机 1 │ │云手机 2 │ │云手机 3 │ │云手机 N │
   │代理 A  │ │代理 B  │ │代理 C  │ │代理... │
   │IP: X.1 │ │IP: X.2 │ │IP: X.3 │ │IP: X.N │
   └────────┘ └────────┘ └────────┘ └────────┘
```

### 代理配置流程

```
1. 用户创建云手机
   ↓
2. device-service 调用 proxy-service 分配代理
   ↓
3. device-service 创建 Redroid 容器，注入代理配置
   ↓
4. 容器内所有 HTTP/HTTPS 请求通过代理
   ↓
5. 用户删除云手机时，释放代理回池中
```

---

## 💾 数据模型扩展

### 1. Device 实体扩展

**文件**: `backend/device-service/src/entities/device.entity.ts`

```typescript
@Entity('devices')
export class Device {
  // ... 现有字段

  // ========== 代理配置（新增） ==========

  /** 代理 ID（proxy-service 分配） */
  @Column({ name: 'proxy_id', type: 'varchar', nullable: true })
  @Index()
  proxyId: string | null;

  /** 代理主机 */
  @Column({ name: 'proxy_host', type: 'varchar', nullable: true })
  proxyHost: string | null;

  /** 代理端口 */
  @Column({ name: 'proxy_port', type: 'int', nullable: true })
  proxyPort: number | null;

  /** 代理类型 (HTTP/SOCKS5) */
  @Column({ name: 'proxy_type', type: 'varchar', nullable: true, default: 'HTTP' })
  proxyType: string | null;

  /** 代理用户名（可选） */
  @Column({ name: 'proxy_username', type: 'varchar', nullable: true })
  proxyUsername: string | null;

  /** 代理密码（加密存储，可选） */
  @Column({ name: 'proxy_password', type: 'varchar', nullable: true })
  proxyPassword: string | null;

  /** 代理国家代码 */
  @Column({ name: 'proxy_country', type: 'varchar', length: 2, nullable: true })
  proxyCountry: string | null;

  /** 代理分配时间 */
  @Column({ name: 'proxy_assigned_at', type: 'timestamp', nullable: true })
  proxyAssignedAt: Date | null;

  // ... 现有字段
}
```

### 2. 数据库迁移

**创建迁移文件**: `backend/device-service/migrations/add_proxy_fields.sql`

```sql
-- 添加代理相关字段
ALTER TABLE devices ADD COLUMN proxy_id VARCHAR(255);
ALTER TABLE devices ADD COLUMN proxy_host VARCHAR(255);
ALTER TABLE devices ADD COLUMN proxy_port INTEGER;
ALTER TABLE devices ADD COLUMN proxy_type VARCHAR(50) DEFAULT 'HTTP';
ALTER TABLE devices ADD COLUMN proxy_username VARCHAR(255);
ALTER TABLE devices ADD COLUMN proxy_password VARCHAR(255);
ALTER TABLE devices ADD COLUMN proxy_country VARCHAR(2);
ALTER TABLE devices ADD COLUMN proxy_assigned_at TIMESTAMP;

-- 创建索引
CREATE INDEX idx_devices_proxy_id ON devices(proxy_id);

-- 注释
COMMENT ON COLUMN devices.proxy_id IS '代理 ID（proxy-service 分配）';
COMMENT ON COLUMN devices.proxy_host IS '代理主机地址';
COMMENT ON COLUMN devices.proxy_port IS '代理端口';
COMMENT ON COLUMN devices.proxy_type IS '代理类型 (HTTP/SOCKS5)';
COMMENT ON COLUMN devices.proxy_country IS '代理国家代码 (如 US, CN)';
```

---

## 🔄 代理分配流程

### Saga 流程扩展

**文件**: `backend/device-service/src/devices/devices.service.ts`

在设备创建 Saga 中添加新步骤：

```typescript
const deviceCreationSaga: SagaDefinition<DeviceCreationSagaState> = {
  type: SagaType.DEVICE_CREATION,
  steps: [
    // Step 1: 分配端口 (已有)
    {
      name: 'ALLOCATE_PORTS',
      execute: async (state) => { /* ... */ },
      compensate: async (state) => { /* ... */ },
    },

    // ✅ Step 1.5: 分配代理 (新增)
    {
      name: 'ALLOCATE_PROXY',
      execute: async (state: DeviceCreationSagaState) => {
        this.logger.log(`[SAGA] Step 1.5: Allocating proxy for device`);

        // 调用 proxy-service 分配代理
        const proxyResponse = await this.proxyClient.acquireProxy({
          criteria: {
            country: createDeviceDto.proxyCountry || 'US', // 默认美国
            minQuality: 75, // 中等质量
            maxLatency: 500, // 最大延迟 500ms
          },
          validate: true,
        });

        this.logger.log(
          `[SAGA] Proxy allocated: ${proxyResponse.host}:${proxyResponse.port} (${proxyResponse.country})`
        );

        return {
          proxyAllocated: true,
          proxy: {
            id: proxyResponse.id,
            host: proxyResponse.host,
            port: proxyResponse.port,
            type: proxyResponse.type,
            username: proxyResponse.username,
            password: proxyResponse.password,
            country: proxyResponse.country,
          },
        };
      },
      compensate: async (state: DeviceCreationSagaState) => {
        if (!state.proxyAllocated || !state.proxy) {
          return;
        }

        this.logger.warn(`[SAGA] Compensate: Releasing allocated proxy`);

        try {
          await this.proxyClient.releaseProxy(state.proxy.id);
          this.logger.log(`[SAGA] Proxy released: ${state.proxy.id}`);
        } catch (error) {
          this.logger.error(`[SAGA] Failed to release proxy`, error.stack);
        }
      },
    },

    // Step 2: 创建 Provider 设备 (修改，传入代理配置)
    {
      name: 'CREATE_PROVIDER_DEVICE',
      execute: async (state: DeviceCreationSagaState) => {
        this.logger.log(`[SAGA] Step 2: Creating device via ${providerType} provider`);

        const providerConfig: DeviceCreateConfig = {
          name: `cloudphone-${createDeviceDto.name}`,
          userId: createDeviceDto.userId,
          // ... 其他配置

          // ✅ 传递代理配置
          providerSpecificConfig: {
            proxy: state.proxy ? {
              host: state.proxy.host,
              port: state.proxy.port,
              type: state.proxy.type,
              username: state.proxy.username,
              password: state.proxy.password,
            } : null,
          },
        };

        const providerDevice = await provider.createDevice(providerConfig);

        return { providerDevice };
      },
      compensate: async (state) => { /* ... */ },
    },

    // Step 3: 创建数据库记录 (修改，保存代理信息)
    {
      name: 'CREATE_DATABASE_RECORD',
      execute: async (state: DeviceCreationSagaState) => {
        // ... 创建设备记录

        const device = queryRunner.manager.create(Device, {
          // ... 现有字段

          // ✅ 保存代理信息
          proxyId: state.proxy?.id || null,
          proxyHost: state.proxy?.host || null,
          proxyPort: state.proxy?.port || null,
          proxyType: state.proxy?.type || null,
          proxyUsername: state.proxy?.username || null,
          proxyPassword: state.proxy?.password || null, // ⚠️ 注意加密
          proxyCountry: state.proxy?.country || null,
          proxyAssignedAt: state.proxy ? new Date() : null,
        });

        // ... 保存到数据库
      },
      compensate: async (state) => { /* ... */ },
    },

    // ... 其他步骤
  ],
};
```

---

## 🐳 Docker 容器代理配置

### RedroidConfig 扩展

**文件**: `backend/device-service/src/docker/docker.service.ts`

```typescript
export interface RedroidConfig {
  // ... 现有字段

  // ✅ 代理配置（新增）
  proxy?: {
    host: string;
    port: number;
    type: 'HTTP' | 'SOCKS5';
    username?: string;
    password?: string;
  };
}
```

### 容器创建修改

**文件**: `backend/device-service/src/docker/docker.service.ts`

```typescript
async createContainer(config: RedroidConfig): Promise<Dockerode.Container> {
  // ... 现有代码

  // ✅ 构建代理环境变量
  let proxyEnv: string[] = [];
  if (config.proxy) {
    const proxyUrl = config.proxy.username && config.proxy.password
      ? `http://${config.proxy.username}:${config.proxy.password}@${config.proxy.host}:${config.proxy.port}`
      : `http://${config.proxy.host}:${config.proxy.port}`;

    proxyEnv = [
      `HTTP_PROXY=${proxyUrl}`,
      `HTTPS_PROXY=${proxyUrl}`,
      `http_proxy=${proxyUrl}`,
      `https_proxy=${proxyUrl}`,
      `NO_PROXY=localhost,127.0.0.1,*.local`, // 本地地址不走代理
    ];

    this.logger.log(`Proxy configured for container: ${config.proxy.host}:${config.proxy.port}`);
  }

  // 构建环境变量（包含代理）
  const env = [
    `WIDTH=${width}`,
    `HEIGHT=${height}`,
    `DPI=${config.dpi}`,
    `fps=60`,
    ...proxyEnv, // ✅ 添加代理环境变量
  ];

  // 容器配置
  const containerConfig: Dockerode.ContainerCreateOptions = {
    name: config.name,
    Image: imageTag,
    Env: env, // ✅ 包含代理配置
    // ... 其他配置
  };

  return await this.docker.createContainer(containerConfig);
}
```

---

## 🔁 代理生命周期管理

### 代理分配场景

| 场景 | 操作 | 说明 |
|------|------|------|
| 创建云手机 | 分配代理 | 从代理池获取可用代理 |
| 启动云手机 | 无操作 | 使用已分配的代理 |
| 停止云手机 | 保留代理 | 代理仍绑定到设备 |
| 重启云手机 | 无操作 | 使用已分配的代理 |
| 删除云手机 | 释放代理 | 代理返回池中 |

### 代理释放逻辑

**文件**: `backend/device-service/src/devices/devices.service.ts`

```typescript
async remove(id: string): Promise<void> {
  const device = await this.findOne(id);

  // ✅ 释放代理（如果有）
  if (device.proxyId) {
    try {
      this.logger.log(`Releasing proxy for device ${id}: ${device.proxyId}`);
      await this.proxyClient.releaseProxy(device.proxyId);
      this.logger.log(`Proxy released successfully: ${device.proxyId}`);
    } catch (error) {
      this.logger.error(`Failed to release proxy ${device.proxyId}:`, error.message);
      // 不抛出异常，继续删除设备
    }
  }

  // ✅ 销毁容器
  if (device.providerType === DeviceProviderType.REDROID && device.externalId) {
    const container = this.docker.getContainer(device.externalId);
    try {
      await container.stop();
      await container.remove();
    } catch (error) {
      this.logger.error(`Failed to remove container: ${error.message}`);
    }
  }

  // ✅ 软删除设备记录
  device.status = DeviceStatus.DELETED;
  device.proxyId = null; // 清除代理关联
  device.proxyHost = null;
  device.proxyPort = null;
  await this.devicesRepository.save(device);

  // 发布设备删除事件
  await this.eventBus.publishDeviceEvent('deleted', {
    deviceId: device.id,
    userId: device.userId,
    proxyReleased: !!device.proxyId,
  });
}
```

---

## 🧪 测试验证

### 测试场景

#### 1. 代理分配测试

```bash
# 创建云手机，自动分配代理
curl -X POST http://localhost:30002/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "test-device-with-proxy",
    "userId": "user-123",
    "cpuCores": 2,
    "memoryMB": 4096,
    "proxyCountry": "US"
  }'

# 查看设备详情，确认代理已分配
curl http://localhost:30002/devices/{deviceId}
# 返回：
# {
#   "proxyId": "proxy-abc123",
#   "proxyHost": "123.45.67.89",
#   "proxyPort": 8080,
#   "proxyCountry": "US"
# }
```

#### 2. 容器代理验证

```bash
# 进入容器
docker exec -it cloudphone-test-device sh

# 验证代理环境变量
echo $HTTP_PROXY
# 输出: http://123.45.67.89:8080

# 测试代理连接
curl -I https://ipinfo.io
# 应该返回代理 IP 的信息
```

#### 3. 代理释放测试

```bash
# 删除云手机
curl -X DELETE http://localhost:30002/devices/{deviceId}

# 检查代理是否已释放
curl http://localhost:30007/proxy/{proxyId}
# 返回: { "status": "available", "inUse": false }
```

---

## 📊 监控与统计

### 代理使用统计

```typescript
// 获取代理分配统计
GET /devices/stats/proxy-usage

Response:
{
  "totalDevices": 100,
  "devicesWithProxy": 95,
  "proxyUtilization": 0.95,
  "proxyCountDistribution": {
    "US": 50,
    "CN": 30,
    "JP": 15
  },
  "averageProxyQuality": 82.5
}
```

### 代理健康监控

```typescript
// 检查设备代理健康状态
GET /devices/{deviceId}/proxy/health

Response:
{
  "deviceId": "device-123",
  "proxyId": "proxy-abc",
  "proxyStatus": "healthy",
  "latency": 120, // ms
  "successRate": 0.98,
  "lastChecked": "2025-11-02T10:30:00Z"
}
```

---

## 🚨 异常处理

### 1. 代理分配失败

**场景**: proxy-service 无可用代理

**处理**:
1. 重试 3 次（间隔 2 秒）
2. 仍失败：创建设备但不分配代理（容器直连网络）
3. 记录告警日志
4. 通知管理员补充代理池

### 2. 代理质量下降

**场景**: 代理延迟高或失败率高

**处理**:
1. proxy-service 自动标记不健康代理
2. 下次创建设备时自动避开
3. 可选：热迁移（为已创建设备更换代理）

### 3. 代理泄漏

**场景**: 设备删除但代理未释放

**处理**:
1. 定时任务扫描孤儿代理（proxyId 存在但设备已删除）
2. 自动释放回池
3. 记录告警日志

---

## 🔐 安全考虑

### 1. 代理密码加密

```typescript
import { createCipher, createDecipher } from 'crypto';

// 加密代理密码
function encryptPassword(password: string, secret: string): string {
  const cipher = createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 解密代理密码
function decryptPassword(encryptedPassword: string, secret: string): string {
  const decipher = createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 2. 代理信息隐藏

```typescript
// 查询设备时，不返回代理密码
async findOne(id: string): Promise<Device> {
  const device = await this.devicesRepository.findOne({ where: { id } });

  // ✅ 隐藏敏感信息
  if (device.proxyPassword) {
    device.proxyPassword = '***masked***';
  }

  return device;
}
```

---

## 💰 成本估算

### 代理成本分析

**假设**:
- 代理供应商: IPRoyal Residential ($1.75/GB)
- 平均每台云手机流量: 5GB/天
- 云手机数量: 100 台

**成本计算**:
```
单台云手机/天 = 5GB × $1.75 = $8.75
100 台云手机/天 = $875
100 台云手机/月 = $875 × 30 = $26,250
```

**优化建议**:
1. 使用低流量代理供应商（如 Bright Data Pay-As-You-Go）
2. 限制云手机带宽（通过 Docker cgroup）
3. 缓存常用资源，减少外部请求

---

## 📝 实现清单

### Phase 1: 基础集成 (P0)

- [ ] 1. 扩展 Device 实体，添加代理字段
- [ ] 2. 创建数据库迁移
- [ ] 3. 在 DevicesService 中集成 ProxyClientService
- [ ] 4. 扩展设备创建 Saga，添加代理分配步骤
- [ ] 5. 修改 DockerService，支持代理环境变量
- [ ] 6. 修改设备删除逻辑，释放代理
- [ ] 7. 测试端到端流程

### Phase 2: 完善功能 (P1)

- [ ] 8. 添加代理使用统计 API
- [ ] 9. 添加代理健康检查
- [ ] 10. 实现孤儿代理清理定时任务
- [ ] 11. 添加代理密码加密
- [ ] 12. 完善错误处理和重试逻辑

### Phase 3: 高级特性 (P2)

- [ ] 13. 支持代理热迁移（不重启容器）
- [ ] 14. 支持多代理负载均衡
- [ ] 15. 添加代理成本追踪
- [ ] 16. 实现智能代理选择（基于质量和成本）

---

## 🎯 后续优化方向

### 1. 代理池自动扩缩容

根据云手机数量自动调整代理池大小：
```typescript
// 监听设备创建事件，动态扩展代理池
@OnEvent('device.created')
async handleDeviceCreated(event: DeviceCreatedEvent) {
  const totalDevices = await this.devicesRepository.count();
  const totalProxies = await this.proxyClient.getPoolStats();

  // 确保代理数量 >= 设备数量 × 1.2 (20% buffer)
  if (totalProxies.available < totalDevices * 1.2) {
    await this.proxyClient.expandPool(totalDevices * 1.2 - totalProxies.available);
  }
}
```

### 2. 代理质量评分系统

基于历史使用数据评估代理质量：
```typescript
interface ProxyQualityScore {
  proxyId: string;
  successRate: number;      // 成功率 (0-1)
  averageLatency: number;    // 平均延迟 (ms)
  totalRequests: number;     // 总请求数
  score: number;             // 综合评分 (0-100)
}

// 计算代理质量评分
function calculateQualityScore(proxy: ProxyQualityScore): number {
  const successWeight = 0.6;
  const latencyWeight = 0.3;
  const reliabilityWeight = 0.1;

  const successScore = proxy.successRate * 100;
  const latencyScore = Math.max(0, 100 - proxy.averageLatency / 10);
  const reliabilityScore = Math.min(100, proxy.totalRequests / 100);

  return (
    successScore * successWeight +
    latencyScore * latencyWeight +
    reliabilityScore * reliabilityWeight
  );
}
```

### 3. 智能代理分配策略

根据设备用途选择最佳代理：
```typescript
interface DeviceProxyStrategy {
  deviceType: string;        // 设备类型
  targetCountry: string;     // 目标国家
  requiredQuality: number;   // 所需质量
  maxLatency: number;        // 最大延迟
  budgetPerGB: number;       // 预算
}

// 游戏类云手机：低延迟优先
const gamingStrategy: DeviceProxyStrategy = {
  deviceType: 'gaming',
  targetCountry: 'US',
  requiredQuality: 90,
  maxLatency: 100,  // 100ms
  budgetPerGB: 5,   // $5/GB
};

// 爬虫类云手机：成本优先
const scrapingStrategy: DeviceProxyStrategy = {
  deviceType: 'scraping',
  targetCountry: 'US',
  requiredQuality: 70,
  maxLatency: 1000, // 1s
  budgetPerGB: 2,   // $2/GB
};
```

---

**文档版本**: v1.0
**作者**: Claude Code
**最后更新**: 2025-11-02
