# Consul 服务注册问题分析报告

## 📊 问题现状

**日期**: 2025-11-03
**状态**: ⚠️ 服务注册失败（健康检查问题）

---

## 🔍 问题发现

### 查询结果

```bash
$ docker exec cloudphone-consul consul catalog services
consul
device-service  # ❌ 但很快会被注销
```

```bash
$ curl -s http://localhost:8500/v1/catalog/services | jq '.'
{
  "consul": []
}
```

**关键发现**: Consul 中几乎没有注册的服务（偶尔出现但很快消失）

---

## 🔬 深入分析

### 1. 服务代码检查

检查了所有微服务的配置：

| 服务 | ConsulModule | registerService() | 状态 |
|------|-------------|-------------------|------|
| api-gateway | ✅ | ✅ (main.ts:136) | 已配置 |
| user-service | ✅ | ✅ (main.ts:124) | 已配置 |
| device-service | ✅ | ✅ (main.ts:139) | 已配置 |
| app-service | ✅ | ✅ (main.ts:98) | 已配置 |
| billing-service | ✅ | ✅ (main.ts:106) | 已配置 |
| notification-service | ✅ | ✅ (main.ts:96) | 已配置 |
| proxy-service | ✅ | ✅ (main.ts) | 已配置 |
| sms-receive-service | ✅ | ❌ | **缺失** |

**结论**: 除 sms-receive-service 外，所有服务都已正确配置 Consul 注册代码。

---

### 2. Consul 容器日志分析

关键日志信息：

```log
2025-11-03T04:46:05.447Z [INFO]  agent: Deregistered service: service=user-service-dev-eric-1762144943407
2025-11-03T04:46:05.447Z [INFO]  agent: deregistered service with critical health due to exceeding health check's 'deregister_critical_service_after' timeout: service=user-service-dev-eric-1762144943407 check=service:user-service-dev-eric-1762144943407 timeout=3m0s

2025-11-03T04:46:05.449Z [INFO]  agent: Deregistered service: service=notification-service-dev-eric-1762144943789
2025-11-03T04:46:05.449Z [INFO]  agent: deregistered service with critical health due to exceeding health check's 'deregister_critical_service_after' timeout: service=notification-service-dev-eric-1762144943789 check=service:notification-service-dev-eric-1762144943789 timeout=3m0s

2025-11-03T05:13:23.902Z [WARN]  agent: Check is now critical: check=service:device-service-dev-eric-1762146798806
2025-11-03T05:13:38.902Z [WARN]  agent: Check is now critical: check=service:device-service-dev-eric-1762146798806
...
2025-11-03T05:16:35.489Z [INFO]  agent: Deregistered service: service=device-service-dev-eric-1762146798806
2025-11-03T05:16:35.489Z [INFO]  agent: deregistered service with critical health due to exceeding health check's 'deregister_critical_service_after' timeout: service=device-service-dev-eric-1762146798806 check=service:device-service-dev-eric-1762146798806 timeout=3m0s
```

**关键发现**:
1. ✅ 服务**成功注册**到 Consul
2. ⚠️ 健康检查**立即失败**（标记为 critical）
3. ⏱️ **3 分钟后自动注销**（deregister_critical_service_after: 3m）
4. 🔄 循环重复（服务重启时重新注册，再次失败）

---

### 3. 根本原因分析

#### 问题代码位置
`backend/shared/src/consul/consul.service.ts:56-66`

```typescript
async registerService(
  name: string,
  port: number,
  tags: string[] = [],
  healthPath: string = '/health'
): Promise<string | null> {
  const serviceId = `${name}-${process.env.HOSTNAME || 'dev'}-${Date.now()}`;
  const address = process.env.SERVICE_HOST || '127.0.0.1';  // ❌ 问题在这里

  const config = {
    id: serviceId,
    name,
    address,  // 使用 127.0.0.1
    port,
    tags: ['cloudphone', process.env.NODE_ENV || 'development', ...tags],
    check: {
      http: `http://${address}:${port}${healthPath}`,  // ❌ http://127.0.0.1:30001/health
      interval: '15s',
      timeout: '10s',
      deregistercriticalserviceafter: '3m',
      tlsskipverify: true,
    },
  };

  await this.consul.agent.service.register(config);
  // ...
}
```

#### 网络拓扑问题

```
┌─────────────────────────────────────────────────────────────┐
│ Docker 容器                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Consul Container (cloudphone-consul)                    │ │
│ │ - IP: 172.18.0.x (Docker network)                       │ │
│ │ - 尝试访问: http://127.0.0.1:30001/health               │ │
│ │ - 127.0.0.1 = Consul 容器自己的 localhost ❌           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓ ❌ 无法访问
┌─────────────────────────────────────────────────────────────┐
│ 宿主机 (Host)                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 微服务 (PM2 管理)                                        │ │
│ │ - user-service:     127.0.0.1:30001 ✅                  │ │
│ │ - device-service:   127.0.0.1:30002 ✅                  │ │
│ │ - app-service:      127.0.0.1:30003 ✅                  │ │
│ │ - billing-service:  127.0.0.1:30005 ✅                  │ │
│ │ - notification:     127.0.0.1:30006 ✅                  │ │
│ │ - proxy-service:    127.0.0.1:30007 ✅                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**问题核心**:
- 微服务注册时使用 `127.0.0.1` 作为地址
- Consul 容器试图通过 `http://127.0.0.1:30001/health` 进行健康检查
- 在 Consul 容器内，`127.0.0.1` 指向容器自己，不是宿主机
- 健康检查失败 → 标记为 critical → 3 分钟后自动注销

---

## 💡 解决方案

### 方案 1: 使用 host.docker.internal（推荐 - 开发环境）

**原理**: Docker Desktop 提供特殊 DNS 名称指向宿主机

**实现步骤**:

1. **修改服务的 .env 文件**:
   ```bash
   # 在所有服务的 .env 文件中添加
   SERVICE_HOST=host.docker.internal
   ```

2. **测试注册**:
   ```bash
   # 重启一个服务测试
   pm2 restart user-service

   # 查看 Consul 日志
   docker logs cloudphone-consul --tail 20 | grep -i "user-service"

   # 查询服务列表
   docker exec cloudphone-consul consul catalog services
   ```

**优点**:
- ✅ 简单易实现
- ✅ 适合开发环境
- ✅ 跨平台支持（Docker Desktop）

**缺点**:
- ❌ 仅 Docker Desktop 支持（Linux Docker 需要额外配置）
- ❌ 生产环境不推荐

---

### 方案 2: 使用宿主机 IP

**原理**: 直接使用宿主机的实际 IP 地址

**实现步骤**:

1. **获取宿主机 IP**:
   ```bash
   # Linux
   hostname -I | awk '{print $1}'

   # macOS
   ipconfig getifaddr en0

   # 或使用 Docker 网络
   docker network inspect cloudphone_default | grep Gateway
   ```

2. **设置环境变量**:
   ```bash
   # 假设宿主机 IP 是 192.168.1.100
   SERVICE_HOST=192.168.1.100
   ```

3. **批量更新所有服务**:
   ```bash
   for service in user-service device-service app-service billing-service notification-service proxy-service; do
     echo "SERVICE_HOST=192.168.1.100" >> backend/$service/.env
   done
   ```

**优点**:
- ✅ 生产环境兼容
- ✅ 适用于所有 Linux 系统

**缺点**:
- ❌ IP 变化需要更新配置
- ❌ 需要知道宿主机 IP

---

### 方案 3: Consul 使用 host 网络模式（生产推荐）

**原理**: Consul 容器直接使用宿主机网络栈

**实现步骤**:

1. **修改 docker-compose.dev.yml**:
   ```yaml
   services:
     consul:
       image: hashicorp/consul:1.18
       # 使用 host 网络模式
       network_mode: host
       command: agent -dev -ui -client=0.0.0.0
       environment:
         - CONSUL_BIND_INTERFACE=eth0
       # 移除 ports 配置（host 模式不需要）
   ```

2. **重启 Consul**:
   ```bash
   docker compose -f docker-compose.dev.yml down consul
   docker compose -f docker-compose.dev.yml up -d consul
   ```

3. **服务保持使用 127.0.0.1**（无需修改）

**优点**:
- ✅ 无需修改服务配置
- ✅ 性能更好（无 NAT 转发）
- ✅ 生产环境推荐方案

**缺点**:
- ❌ 可能与其他容器端口冲突
- ❌ 网络隔离性降低

---

### 方案 4: 添加 extra_hosts（最佳平衡方案）

**原理**: 在 Consul 容器中添加宿主机别名

**实现步骤**:

1. **修改 docker-compose.dev.yml**:
   ```yaml
   services:
     consul:
       image: hashicorp/consul:1.18
       container_name: cloudphone-consul
       ports:
         - "8500:8500"
         - "8600:8600/udp"
       extra_hosts:
         - "host.docker.internal:host-gateway"  # 添加这行
       command: agent -dev -ui -client=0.0.0.0
       networks:
         - cloudphone
   ```

2. **服务使用 host.docker.internal**:
   ```bash
   SERVICE_HOST=host.docker.internal
   ```

3. **重启**:
   ```bash
   docker compose -f docker-compose.dev.yml restart consul
   pm2 restart all
   ```

**优点**:
- ✅ 兼容性好（适用于 Linux Docker）
- ✅ 配置简单
- ✅ 开发和生产都适用

**缺点**:
- ❌ 需要修改 Docker Compose 配置

---

## 🚀 推荐实施步骤

### 快速修复（开发环境）

```bash
# 1. 添加 extra_hosts 到 docker-compose.dev.yml
cat >> docker-compose.dev.yml << 'EOF'
# 在 consul 服务下添加:
      extra_hosts:
        - "host.docker.internal:host-gateway"
EOF

# 2. 重启 Consul
docker compose -f docker-compose.dev.yml restart consul

# 3. 为所有服务设置 SERVICE_HOST
for service in api-gateway user-service device-service app-service billing-service notification-service proxy-service; do
  if [ -f "backend/$service/.env" ]; then
    # 删除已有的 SERVICE_HOST 行
    sed -i '/^SERVICE_HOST=/d' backend/$service/.env
    # 添加新的 SERVICE_HOST
    echo "SERVICE_HOST=host.docker.internal" >> backend/$service/.env
  else
    # 如果 .env 不存在，从 .env.example 复制并添加
    cp backend/$service/.env.example backend/$service/.env
    echo "SERVICE_HOST=host.docker.internal" >> backend/$service/.env
  fi
  echo "✅ Updated $service"
done

# 4. 重启所有服务
pm2 restart all

# 5. 等待 20 秒后验证
sleep 20
docker exec cloudphone-consul consul catalog services

# 6. 查看健康状态
curl -s http://localhost:8500/v1/health/state/any | jq -r '.[] | {ServiceName, Status}'
```

---

## 🧪 验证测试

### 1. 检查服务注册

```bash
# 查看所有已注册服务
docker exec cloudphone-consul consul catalog services

# 预期输出:
# consul
# api-gateway
# user-service
# device-service
# app-service
# billing-service
# notification-service
# proxy-service
```

### 2. 检查健康状态

```bash
# 方法 1: 通过 CLI
docker exec cloudphone-consul consul catalog service user-service

# 方法 2: 通过 HTTP API
curl -s http://localhost:8500/v1/health/service/user-service | jq '.[] | {ServiceID, Status: .Checks[1].Status}'

# 方法 3: Web UI
# 访问: http://localhost:8500
```

### 3. 检查 Consul 日志

```bash
# 查看最近的注册日志
docker logs cloudphone-consul --tail 50 | grep -i register

# 查看健康检查日志
docker logs cloudphone-consul --tail 50 | grep -i "check\|critical"

# 应该看到:
# - ✅ [INFO] agent: Synced service: service=user-service-xxx
# - ✅ [INFO] agent: Synced check: check=service:user-service-xxx
# - ❌ 不应该看到 "critical" 或 "deregister"
```

### 4. 测试服务发现

```bash
# 通过 Consul DNS 解析服务
docker exec cloudphone-consul dig @127.0.0.1 -p 8600 user-service.service.consul

# 通过 HTTP API 查询
curl -s http://localhost:8500/v1/catalog/service/user-service | jq -r '.[] | {Address, ServicePort}'
```

---

## 📊 当前状态总结

| 项目 | 状态 | 说明 |
|------|------|------|
| 代码配置 | ✅ | 7/8 服务已配置（sms-receive-service 除外） |
| 服务注册 | ⚠️ | 能注册但立即失败 |
| 健康检查 | ❌ | 全部失败（网络问题） |
| 自动注销 | ❌ | 3分钟后被移除 |
| 根本原因 | ✅ | 已确认（127.0.0.1 网络问题） |
| 解决方案 | ✅ | 已提供 4 种方案 |

---

## 📝 待办事项

### 高优先级

- [ ] **修复 Consul 网络配置**（选择方案 1 或 4）
  - [ ] 修改 docker-compose.dev.yml
  - [ ] 设置 SERVICE_HOST 环境变量
  - [ ] 重启 Consul 和所有服务
  - [ ] 验证服务注册成功

- [ ] **为 sms-receive-service 添加 Consul 集成**
  - [ ] 在 app.module.ts 中导入 ConsulModule
  - [ ] 在 main.ts 中添加 registerService 调用
  - [ ] 测试注册功能

### 中优先级

- [ ] **添加服务注册监控**
  - [ ] Grafana 仪表板显示注册状态
  - [ ] 告警规则：服务注销时发送通知
  - [ ] 日志聚合：集中查看注册日志

- [ ] **优化健康检查配置**
  - [ ] 调整检查间隔（15s → 30s）
  - [ ] 延长超时时间（10s → 20s）
  - [ ] 增加注销延迟（3m → 5m）

### 低优先级

- [ ] **生产环境准备**
  - [ ] 配置生产环境 Consul 集群
  - [ ] 使用实际 IP 地址代替 host.docker.internal
  - [ ] 实施 TLS 加密通信
  - [ ] 配置 ACL 访问控制

---

## 🎓 学到的经验

`★ Insight ─────────────────────────────────────`
**1. 容器网络隔离**
- Docker 容器有独立的网络命名空间
- 容器内的 127.0.0.1 ≠ 宿主机的 127.0.0.1
- 需要使用特殊机制访问宿主机服务

**2. Consul 健康检查机制**
- 注册成功 ≠ 服务可用
- 健康检查失败会自动注销服务
- deregister_critical_service_after 是保护机制

**3. 微服务架构复杂性**
- 服务发现需要考虑网络拓扑
- 开发环境和生产环境网络配置不同
- 需要优雅降级（Consul 不可用时服务仍能运行）
`─────────────────────────────────────────────────`

---

## 📚 相关文档

- **Consul 官方文档**: https://www.consul.io/docs
- **Docker 网络**: https://docs.docker.com/network/
- **host.docker.internal**: https://docs.docker.com/desktop/networking/#i-want-to-connect-from-a-container-to-a-service-on-the-host
- **ConsulService 实现**: `/home/eric/next-cloudphone/backend/shared/src/consul/consul.service.ts`

---

**创建时间**: 2025-11-03 05:20
**分析人**: Claude Code
**状态**: ⚠️ 问题已识别，待修复
