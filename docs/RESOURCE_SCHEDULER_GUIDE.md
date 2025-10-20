# 🔀 资源调度系统使用指南

**版本**: 1.0.0
**更新时间**: 2025-10-20
**适用环境**: Device Service (NestJS)

---

## 📑 目录

1. [概述](#概述)
2. [快速开始](#快速开始)
3. [核心概念](#核心概念)
4. [节点管理](#节点管理)
5. [调度策略](#调度策略)
6. [资源监控](#资源监控)
7. [高级功能](#高级功能)
8. [最佳实践](#最佳实践)
9. [故障排查](#故障排查)

---

## 概述

### 什么是资源调度系统？

资源调度系统是云手机平台的核心组件，负责在多个物理节点之间智能分配设备资源，实现：

- 🌐 **多节点管理**: 统一管理多台物理服务器
- ⚖️ **负载均衡**: 智能分配设备到最优节点
- 📊 **资源监控**: 实时监控各节点资源使用情况
- 🔄 **自动恢复**: 节点故障时自动转移设备
- 📈 **弹性扩容**: 支持动态添加/移除节点

### 架构图

```
┌──────────────────────────────────────────────┐
│           调度器 (Scheduler)                 │
│   - 4种调度策略                             │
│   - 节点评分算法                            │
│   - 集群重平衡                              │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│        节点管理器 (Node Manager)             │
│   - 节点注册/注销                           │
│   - 标签和污点管理                          │
│   - 维护模式控制                            │
└─────────────────┬────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│       资源监控器 (Resource Monitor)          │
│   - 实时资源监控 (每30秒)                   │
│   - 健康检查 (每分钟)                       │
│   - 负载分数计算                            │
└─────────────────┬────────────────────────────┘
                  │
       ┌──────────┼──────────┬────────────┐
       │          │          │            │
   ┌───▼────┐ ┌──▼────┐ ┌──▼────┐  ┌───▼────┐
   │ Node 1 │ │Node 2 │ │Node 3 │  │ Node 4 │
   │  50台  │ │ 30台  │ │ 20台  │  │  10台  │
   │Load:60 │ │Load:40│ │Load:20│  │Load:10 │
   └────────┘ └───────┘ └───────┘  └────────┘
```

---

## 快速开始

### 1. 注册第一个节点

```bash
curl -X POST http://localhost:30002/scheduler/nodes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "node-001",
    "hostname": "cloudphone-server-1",
    "ipAddress": "192.168.1.100",
    "dockerPort": 2375,
    "capacity": {
      "totalCpuCores": 32,
      "totalMemoryMB": 65536,
      "totalStorageGB": 1000,
      "maxDevices": 100
    },
    "labels": {
      "env": "prod",
      "region": "us-west",
      "gpu": "enabled"
    },
    "priority": 10
  }'
```

**响应示例**:
```json
{
  "id": "node-uuid-xxx",
  "name": "node-001",
  "status": "online",
  "capacity": {...},
  "usage": {
    "usedCpuCores": 0,
    "usedMemoryMB": 0,
    "activeDevices": 0
  },
  "loadScore": 0
}
```

### 2. 为设备选择最佳节点

```bash
curl -X POST http://localhost:30002/scheduler/schedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "cpuCores": 4,
    "memoryMB": 8192,
    "storageMB": 20480,
    "labels": {
      "type": "gaming"
    }
  }'
```

**响应示例**:
```json
{
  "nodeId": "node-uuid-xxx",
  "nodeName": "node-001",
  "reason": "Best score: 95.60",
  "score": 95.60
}
```

### 3. 查看集群状态

```bash
curl http://localhost:30002/scheduler/resources/cluster-stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**响应示例**:
```json
{
  "nodes": {
    "total": 4,
    "online": 3,
    "offline": 1
  },
  "capacity": {
    "cpuCores": 128,
    "memoryMB": 262144,
    "storageGB": 4000,
    "maxDevices": 400
  },
  "usage": {
    "cpuCores": 48,
    "memoryMB": 98304,
    "devices": 120
  },
  "utilization": {
    "cpu": 37.5,
    "memory": 37.5,
    "devices": 30.0
  }
}
```

---

## 核心概念

### 节点 (Node)

节点是运行设备的物理服务器或虚拟机。

**节点属性**:
```typescript
{
  id: string;                    // 节点ID
  name: string;                  // 节点名称
  hostname: string;              // 主机名
  ipAddress: string;             // IP地址
  dockerPort: number;            // Docker端口
  status: NodeStatus;            // 状态

  // 资源容量
  capacity: {
    totalCpuCores: number;       // 总CPU核心数
    totalMemoryMB: number;       // 总内存(MB)
    totalStorageGB: number;      // 总存储(GB)
    maxDevices: number;          // 最大设备数
  };

  // 当前使用情况
  usage: {
    usedCpuCores: number;        // 已用CPU
    usedMemoryMB: number;        // 已用内存
    activeDevices: number;       // 活跃设备数
    cpuUsagePercent: number;     // CPU使用率
    memoryUsagePercent: number;  // 内存使用率
  };

  loadScore: number;             // 负载分数(0-100)
  labels: Record<string, string>; // 标签
  taints: Array<Taint>;          // 污点
  priority: number;              // 优先级
}
```

**节点状态**:
- `online`: 在线，可以调度设备
- `offline`: 离线，不可用
- `maintenance`: 维护模式，不接受新设备
- `draining`: 排空模式，保持现有设备但不接受新设备

### 调度请求 (Schedule Request)

```typescript
{
  cpuCores: number;              // 所需CPU
  memoryMB: number;              // 所需内存
  storageMB?: number;            // 所需存储
  labels?: Record<string, string>; // 设备标签（用于亲和性）
  tolerations?: string[];        // 容忍的污点
  preferredNode?: string;        // 首选节点
}
```

### 负载分数 (Load Score)

负载分数是综合评估节点负载的指标，范围 0-100：
- **0-30**: 低负载，大量可用资源
- **30-60**: 中等负载，资源充足
- **60-80**: 高负载，资源紧张
- **80-100**: 满载或接近满载

**计算公式**:
```
LoadScore = CPU使用率 × 0.3 + 内存使用率 × 0.3 + 设备数使用率 × 0.4
```

---

## 节点管理

### 注册节点

**API**: `POST /scheduler/nodes`

**请求示例**:
```json
{
  "name": "node-002",
  "hostname": "cloudphone-server-2",
  "ipAddress": "192.168.1.101",
  "dockerPort": 2375,
  "capacity": {
    "totalCpuCores": 64,
    "totalMemoryMB": 131072,
    "totalStorageGB": 2000,
    "maxDevices": 200
  },
  "labels": {
    "env": "prod",
    "region": "us-east",
    "tier": "high-performance"
  },
  "region": "us-east",
  "zone": "us-east-1a",
  "priority": 20
}
```

**最佳实践**:
- 使用描述性的节点名称
- 设置合理的资源容量（留 10-20% 余量）
- 使用标签标记节点特性
- 根据硬件性能设置优先级

### 获取节点列表

**API**: `GET /scheduler/nodes?status=online`

**查询参数**:
- `status`: 过滤节点状态（可选）

**响应**: 节点列表，按优先级和负载排序

### 更新节点

**API**: `PUT /scheduler/nodes/:id`

**可更新字段**:
```json
{
  "status": "maintenance",
  "capacity": {
    "maxDevices": 150
  },
  "labels": {
    "maintenance": "scheduled"
  },
  "priority": 15
}
```

### 删除节点

**API**: `DELETE /scheduler/nodes/:id`

**要求**:
- 节点上没有运行中的设备
- 或先使用排空模式迁移设备

### 节点标签管理

**添加/更新标签**:
```bash
curl -X PUT http://localhost:30002/scheduler/nodes/{nodeId}/labels \
  -H "Content-Type: application/json" \
  -d '{
    "gpu": "nvidia-rtx3090",
    "storage-type": "nvme",
    "network": "10gbps"
  }'
```

**删除标签**:
```bash
curl -X DELETE http://localhost:30002/scheduler/nodes/{nodeId}/labels/gpu
```

**用途**:
- 标记节点硬件特性
- 实现亲和性调度
- 按标签查询节点

### 节点污点管理

污点用于排斥某些设备调度到节点。

**添加污点**:
```bash
curl -X POST http://localhost:30002/scheduler/nodes/{nodeId}/taints \
  -H "Content-Type: application/json" \
  -d '{
    "key": "gpu-required",
    "value": "true",
    "effect": "NoSchedule"
  }'
```

**污点效果**:
- `NoSchedule`: 不允许调度（除非设备容忍该污点）
- `PreferNoSchedule`: 尽量不调度
- `NoExecute`: 不允许调度，且驱逐现有设备

**使用场景**:
- GPU 节点：只接受需要 GPU 的设备
- 专用节点：预留给特定类型的设备
- 维护前：标记节点，防止新设备调度

---

## 调度策略

调度器支持 4 种策略，根据不同场景选择。

### 1. Balanced（均衡策略）- 默认

**特点**: 选择负载最均衡的节点

**适用场景**:
- 通用场景
- 希望各节点负载均衡
- 避免某些节点过载

**评分规则**:
- 计算调度后各资源（CPU、内存、设备数）的使用率
- 使用率越均衡，得分越高
- 考虑节点优先级

**设置方法**:
```bash
curl -X POST http://localhost:30002/scheduler/strategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "balanced"}'
```

### 2. Binpack（装箱策略）

**特点**: 优先填满节点，节省资源

**适用场景**:
- 节省成本，减少使用的节点数量
- 云环境，按节点付费
- 便于缩容和维护

**评分规则**:
- 使用率越高，得分越高
- 优先选择已有设备的节点
- 尽可能填满节点

**设置方法**:
```bash
curl -X POST http://localhost:30002/scheduler/strategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "binpack"}'
```

### 3. Spread（分散策略）

**特点**: 尽量分散到不同节点

**适用场景**:
- 提高可用性
- 避免单点故障影响过多设备
- 测试环境，隔离不同项目

**评分规则**:
- 使用率越低，得分越高
- 优先选择空闲节点
- 尽可能分散设备

**设置方法**:
```bash
curl -X POST http://localhost:30002/scheduler/strategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "spread"}'
```

### 4. LeastLoaded（最小负载策略）

**特点**: 选择负载最小的节点

**适用场景**:
- 性能敏感的应用
- 避免资源竞争
- 突发流量场景

**评分规则**:
- 直接使用负载分数
- 负载越低，得分越高
- 简单直接

**设置方法**:
```bash
curl -X POST http://localhost:30002/scheduler/strategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "least_loaded"}'
```

### 策略对比

| 策略 | 资源利用率 | 可用性 | 性能 | 适用场景 |
|------|-----------|--------|------|---------|
| Balanced | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 通用 |
| Binpack | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 节省成本 |
| Spread | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 高可用 |
| LeastLoaded | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 高性能 |

---

## 资源监控

### 自动监控

系统自动执行以下监控任务：

**资源更新（每30秒）**:
- 更新所有在线节点的资源使用情况
- 计算负载分数
- 更新心跳时间

**健康检查（每分钟）**:
- 检查节点心跳
- 超过3分钟无心跳 → 标记为离线
- 健康检查失败5次 → 标记为离线

### 手动触发

**更新单个节点**:
```bash
curl -X POST http://localhost:30002/scheduler/resources/update/{nodeId}
```

### 集群统计

**获取集群资源统计**:
```bash
curl http://localhost:30002/scheduler/resources/cluster-stats
```

**响应示例**:
```json
{
  "nodes": {
    "total": 5,
    "online": 4,
    "offline": 1
  },
  "capacity": {
    "cpuCores": 160,
    "memoryMB": 327680,
    "storageGB": 5000,
    "maxDevices": 500
  },
  "usage": {
    "cpuCores": 72,
    "memoryMB": 147456,
    "storageGB": 1500,
    "devices": 180
  },
  "utilization": {
    "cpu": 45.0,
    "memory": 45.0,
    "storage": 30.0,
    "devices": 36.0
  }
}
```

### 调度统计

**获取调度统计**:
```bash
curl http://localhost:30002/scheduler/stats
```

**响应示例**:
```json
{
  "totalNodes": 5,
  "onlineNodes": 4,
  "offlineNodes": 1,
  "averageLoad": 42.5,
  "minLoad": 15.0,
  "maxLoad": 75.0,
  "strategy": "balanced"
}
```

---

## 高级功能

### 集群重平衡

当集群负载不均时，系统可以生成迁移计划。

**API**: `POST /scheduler/rebalance`

**工作原理**:
1. 计算集群平均负载
2. 找出负载过高的节点（超过平均值20%以上）
3. 找出负载较低的节点（低于平均值20%以下）
4. 生成设备迁移计划

**响应示例**:
```json
{
  "migrationsNeeded": 8,
  "migrationPlan": [
    {
      "deviceId": "device-001",
      "from": "node-001",
      "to": "node-003"
    },
    {
      "deviceId": "device-002",
      "from": "node-001",
      "to": "node-004"
    }
  ]
}
```

**注意**: 系统只生成计划，实际迁移需要手动执行或通过脚本自动化。

### 维护模式

**设置维护模式**:
```bash
curl -X POST http://localhost:30002/scheduler/nodes/{nodeId}/maintenance \
  -H "Content-Type: application/json" \
  -d '{"enable": true}'
```

**特点**:
- 节点状态变为 `maintenance`
- 不接受新设备调度
- 现有设备继续运行
- 适合短期维护

### 排空模式

**排空节点**:
```bash
curl -X POST http://localhost:30002/scheduler/nodes/{nodeId}/drain
```

**特点**:
- 节点状态变为 `draining`
- 不接受新设备
- 建议迁移现有设备
- 适合长期维护或下线

### 亲和性调度

使用标签实现亲和性调度。

**示例 1: GPU 设备亲和**:
```bash
# 1. 为 GPU 节点添加标签
curl -X PUT http://localhost:30002/scheduler/nodes/node-001/labels \
  -d '{"gpu": "nvidia-rtx3090"}'

# 2. 调度时指定标签需求
curl -X POST http://localhost:30002/scheduler/schedule \
  -d '{
    "cpuCores": 4,
    "memoryMB": 8192,
    "labels": {"gpu-required": "true"},
    "preferredNode": "node-001"
  }'
```

**示例 2: 区域亲和**:
```bash
# 获取指定区域的节点
curl "http://localhost:30002/scheduler/nodes/by-region/us-west"

# 获取指定标签的节点
curl "http://localhost:30002/scheduler/nodes/by-label?key=env&value=prod"
```

### 批量调度

一次性为多个设备选择节点。

**API**: `POST /scheduler/schedule/batch`

**请求示例**:
```json
[
  { "cpuCores": 4, "memoryMB": 8192 },
  { "cpuCores": 2, "memoryMB": 4096 },
  { "cpuCores": 4, "memoryMB": 8192 }
]
```

**响应示例**:
```json
{
  "total": 3,
  "scheduled": 3,
  "results": [
    {
      "device": "device-0",
      "nodeId": "node-001",
      "nodeName": "node-001",
      "score": 85.0
    },
    {
      "device": "device-1",
      "nodeId": "node-002",
      "nodeName": "node-002",
      "score": 90.0
    },
    {
      "device": "device-2",
      "nodeId": "node-001",
      "nodeName": "node-001",
      "score": 80.0
    }
  ]
}
```

---

## 最佳实践

### 1. 节点规划

**硬件配置建议**:
```
小型节点:
- CPU: 16-32 核
- 内存: 64-128 GB
- 存储: 500-1000 GB NVMe SSD
- 最大设备: 50-100 台

大型节点:
- CPU: 64-128 核
- 内存: 256-512 GB
- 存储: 2-4 TB NVMe SSD
- 最大设备: 200-400 台
```

**节点分布**:
- 至少 2 个节点（高可用）
- 建议 3-5 个节点（负载均衡）
- 大规模部署：10+ 节点

### 2. 标签使用

**推荐标签**:
```json
{
  "env": "prod",              // 环境: prod/staging/dev
  "region": "us-west",        // 区域
  "zone": "us-west-1a",       // 可用区
  "tier": "high-performance", // 性能等级
  "gpu": "nvidia-rtx3090",    // GPU 型号
  "storage-type": "nvme",     // 存储类型
  "network": "10gbps"         // 网络带宽
}
```

### 3. 调度策略选择

**生产环境**:
- 游戏多开：`binpack` - 节省成本
- 应用商店：`balanced` - 均衡负载
- 高可用服务：`spread` - 分散风险

**开发/测试环境**:
- `balanced` 或 `least_loaded`

### 4. 监控和告警

**关键指标**:
- 节点负载 > 80%：告警，考虑扩容
- 节点离线：告警，检查原因
- 设备数接近上限：预警，准备扩容
- CPU/内存使用率 > 85%：告警

**推荐监控工具**:
- Prometheus + Grafana
- 定期调用 `/scheduler/resources/cluster-stats`
- 设置自动告警规则

### 5. 扩容流程

```bash
# 1. 准备新节点
# - 安装 Docker
# - 配置网络
# - 确保与现有节点互通

# 2. 注册新节点
curl -X POST /scheduler/nodes -d '{...}'

# 3. 验证节点状态
curl /scheduler/nodes/{nodeId}

# 4. 观察负载分布
curl /scheduler/resources/cluster-stats

# 5. 如需要，触发重平衡
curl -X POST /scheduler/rebalance
```

### 6. 维护流程

```bash
# 1. 设置排空模式
curl -X POST /scheduler/nodes/{nodeId}/drain

# 2. 等待新设备调度到其他节点

# 3. 迁移现有设备（手动或脚本）
# ... 迁移逻辑

# 4. 确认节点无设备
curl /scheduler/nodes/{nodeId}

# 5. 设置维护模式
curl -X POST /scheduler/nodes/{nodeId}/maintenance -d '{"enable": true}'

# 6. 执行维护操作
# ... 升级/重启/修复

# 7. 恢复在线
curl -X POST /scheduler/nodes/{nodeId}/maintenance -d '{"enable": false}'
```

---

## 故障排查

### 问题 1: 节点无法注册

**症状**: 注册节点返回错误

**可能原因**:
1. 节点名称已存在
2. IP 地址不可达
3. Docker 端口未开放

**解决方案**:
```bash
# 1. 检查节点名称
curl /scheduler/nodes | jq '.[] | .name'

# 2. 测试网络连通性
ping 192.168.1.100
telnet 192.168.1.100 2375

# 3. 检查 Docker 配置
docker -H tcp://192.168.1.100:2375 ps
```

### 问题 2: 节点自动离线

**症状**: 节点状态变为 `offline`

**可能原因**:
1. 网络问题
2. Docker daemon 停止
3. 资源监控失败

**解决方案**:
```bash
# 1. 检查节点心跳
curl /scheduler/nodes/{nodeId} | jq '.lastHeartbeat, .failedHealthChecks'

# 2. 手动触发资源更新
curl -X POST /scheduler/resources/update/{nodeId}

# 3. 检查节点日志
# 登录节点查看系统日志

# 4. 重新注册节点
# 如果问题持续，删除并重新注册
```

### 问题 3: 调度失败

**症状**: 调度设备时返回 "No available nodes"

**可能原因**:
1. 所有节点离线
2. 资源不足
3. 污点限制

**解决方案**:
```bash
# 1. 检查在线节点
curl /scheduler/nodes?status=online

# 2. 检查集群资源
curl /scheduler/resources/cluster-stats

# 3. 检查污点配置
curl /scheduler/nodes/{nodeId} | jq '.taints'

# 4. 降低资源需求或扩容
```

### 问题 4: 负载不均衡

**症状**: 某些节点负载很高，其他节点空闲

**可能原因**:
1. 调度策略不合适
2. 设备未重平衡
3. 节点优先级设置问题

**解决方案**:
```bash
# 1. 检查当前策略
curl /scheduler/stats | jq '.strategy'

# 2. 更改策略为 balanced
curl -X POST /scheduler/strategy -d '{"strategy": "balanced"}'

# 3. 触发集群重平衡
curl -X POST /scheduler/rebalance

# 4. 根据迁移计划手动迁移设备
```

### 问题 5: 资源监控数据不准确

**症状**: 显示的资源使用与实际不符

**可能原因**:
1. 监控任务失败
2. 设备未正确更新统计
3. 数据库同步问题

**解决方案**:
```bash
# 1. 手动触发资源更新
curl -X POST /scheduler/resources/update/{nodeId}

# 2. 检查设备状态
curl /devices | jq '.[] | select(.status == "running") | .id'

# 3. 重启调度服务
# 定时任务会重新执行
```

---

## API 参考

### 节点管理 API (14个)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /scheduler/nodes | 注册节点 |
| GET | /scheduler/nodes | 获取节点列表 |
| GET | /scheduler/nodes/:id | 获取节点详情 |
| PUT | /scheduler/nodes/:id | 更新节点 |
| DELETE | /scheduler/nodes/:id | 注销节点 |
| POST | /scheduler/nodes/:id/maintenance | 维护模式 |
| POST | /scheduler/nodes/:id/drain | 排空节点 |
| POST | /scheduler/nodes/:id/taints | 添加污点 |
| DELETE | /scheduler/nodes/:id/taints/:key | 删除污点 |
| PUT | /scheduler/nodes/:id/labels | 更新标签 |
| DELETE | /scheduler/nodes/:id/labels/:key | 删除标签 |
| GET | /scheduler/nodes/stats/summary | 节点统计 |
| GET | /scheduler/nodes/by-region/:region | 按区域查询 |
| GET | /scheduler/nodes/by-label | 按标签查询 |

### 调度器 API (5个)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /scheduler/schedule | 调度设备 |
| POST | /scheduler/schedule/batch | 批量调度 |
| POST | /scheduler/strategy | 设置策略 |
| GET | /scheduler/stats | 调度统计 |
| POST | /scheduler/rebalance | 集群重平衡 |

### 资源监控 API (3个)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /scheduler/resources/update/:nodeId | 更新节点资源 |
| GET | /scheduler/resources/cluster-stats | 集群统计 |
| GET | /scheduler/resources/local-node-info | 本地节点信息 |

---

## 总结

资源调度系统提供了企业级的多节点管理能力：

✅ **智能调度**: 4种策略适应不同场景
✅ **负载均衡**: 自动分配设备到最优节点
✅ **高可用**: 节点故障自动转移
✅ **灵活扩展**: 动态添加/移除节点
✅ **精细控制**: 标签、污点、优先级多维度控制

**推荐部署规模**:
- 小规模（<100台设备）: 2-3个节点
- 中规模（100-500台设备）: 4-6个节点
- 大规模（500+台设备）: 10+个节点

---

**文档版本**: 1.0.0
**最后更新**: 2025-10-20
**维护者**: Device Service Team
