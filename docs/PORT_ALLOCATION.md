# CloudPhone Platform - Port Allocation

## 📊 当前端口分配状态

### 后端微服务 (300xx)

| 端口 | 服务名称 | 状态 | 位置 | 备注 |
|------|----------|------|------|------|
| 30000 | api-gateway | ✅ 已部署 | docker-compose.dev.yml | API统一入口 |
| 30001 | user-service | ✅ 已部署 | docker-compose.dev.yml | 用户认证服务 |
| 30002 | device-service | ✅ 已部署 | docker-compose.dev.yml | 设备管理服务 |
| 30003 | app-service | ✅ 已部署 | docker-compose.dev.yml | 应用管理服务 |
| 30004 | scheduler-service | ✅ 已部署 | docker-compose.dev.yml | 调度服务(Python) |
| 30005 | billing-service | ✅ 已部署 | docker-compose.dev.yml | 计费服务 |
| 30006 | notification-service | ✅ 已部署 | docker-compose.dev.yml | 通知服务 |
| 30007 | media-service | ✅ 已部署 | docker-compose.dev.yml | 流媒体服务(Go) |
| 30007 | proxy-service | ⚠️ 冲突 | backend/proxy-service/README.md | **未部署,文档中端口冲突** |
| 30008 | sms-receive-service | ✅ 已部署 | docker-compose.dev.yml | SMS验证码接收服务 |
| 30009 | - | 🔓 可用 | - | 预留给proxy-service |
| 30010 | - | 🔓 可用 | - | 未来服务预留 |

### 前端应用 (51xx)

| 端口 | 服务名称 | 状态 | 位置 |
|------|----------|------|------|
| 5173 | admin-frontend | ✅ 已部署 | docker-compose.dev.yml |
| 5174 | user-frontend | ✅ 已部署 | docker-compose.dev.yml |

### 基础设施服务

| 端口 | 服务名称 | 协议/用途 |
|------|----------|-----------|
| 5432 | PostgreSQL | 数据库 |
| 6379 | Redis | 缓存 |
| 5672 | RabbitMQ | AMQP消息队列 |
| 15672 | RabbitMQ | 管理界面 |
| 9000 | MinIO | 对象存储API |
| 9001 | MinIO | 管理控制台 |
| 8500 | Consul | 服务发现+UI |

### 监控系统

| 端口 | 服务名称 | 用途 |
|------|----------|------|
| 3000 | Grafana | 监控可视化 |
| 9090 | Prometheus | 指标收集 |
| 9093 | Alertmanager | 告警管理 |
| 16686 | Jaeger | 分布式追踪UI |
| 14250 | Jaeger | gRPC接收 |
| 14268 | Jaeger | Thrift接收 |
| 5778 | Jaeger | 配置服务 |
| 9411 | Jaeger | Zipkin兼容 |

## ⚠️ 端口冲突问题

### 已发现冲突

**30007端口冲突**:
- ✅ `media-service`: 已在 `docker-compose.dev.yml` 中部署使用30007
- ❌ `proxy-service`: 在 `backend/proxy-service/README.md` 中文档写的是30007，但**未实际部署**

**影响范围**:
- 当前: 无影响(proxy-service未部署)
- 未来: 如需部署proxy-service，必须更改端口

## ✅ 推荐的端口分配方案

### 方案A: 保持现状 (推荐)

**优点**:
- media-service已经稳定运行在30007
- sms-receive-service已配置为30008
- 无需修改已部署服务

**操作**:
1. **保持不变**: media-service (30007), sms-receive-service (30008)
2. **更新proxy-service文档**: 将端口改为30009
3. **预留**: 30010+ 用于未来服务

```bash
# 需要更新的文件:
backend/proxy-service/README.md (30007 → 30009)
backend/proxy-service/.env.example (如果存在)
```

### 方案B: 统一调整 (不推荐)

**缺点**: 需要修改多个已部署服务的配置

```
30007: media-service (保持)
30008: proxy-service (将文档改为30008)
30009: sms-receive-service (从30008改为30009)
```

## 🔧 立即需要修复的问题

### 1. 更新 proxy-service 端口配置

由于media-service已占用30007，proxy-service应改用30009：

```bash
# backend/proxy-service/README.md
# 查找所有30007并替换为30009
sed -i 's/:30007/:30009/g' backend/proxy-service/README.md
sed -i 's/=30007/=30009/g' backend/proxy-service/README.md
```

### 2. 确认 sms-receive-service 使用 30008

**已完成的配置**:
- ✅ `.env.example`: PORT=30008
- ✅ `README.md`: 所有示例使用30008
- ✅ `scripts/test-api.sh`: BASE_URL默认30008
- ✅ `Dockerfile`: EXPOSE 30008
- ✅ `infrastructure/docker/sms-receive-service.Dockerfile`: EXPOSE 30008
- ✅ `docker-compose.dev.yml`: 30008:30008

**状态**: ✅ 配置正确，无需修改

## 📝 未来服务端口预留

| 端口范围 | 用途 | 备注 |
|---------|------|------|
| 30009 | proxy-service | 建议分配 |
| 30010-30019 | 新微服务 | 按需分配 |
| 30020-30099 | 预留 | 系统扩展 |

## 🎯 端口分配原则

1. **后端服务**: 使用 300xx 系列
   - 核心服务: 30000-30009
   - 扩展服务: 30010-30099

2. **前端应用**: 使用 51xx 系列
   - Admin: 5173
   - User: 5174
   - Mobile/其他: 5175+

3. **基础设施**: 使用标准端口
   - PostgreSQL: 5432
   - Redis: 6379
   - RabbitMQ: 5672/15672
   - Consul: 8500

4. **监控系统**: 使用 xxxx 标准端口
   - Prometheus: 9090
   - Grafana: 3000
   - Jaeger: 16686

5. **避免使用**:
   - 1-1023: 系统保留端口
   - 8080, 8000: 常见开发端口(易冲突)
   - 3306, 27017: 常见数据库端口

## 🔍 端口检查工具

### 检查端口占用

```bash
# Linux
lsof -i :30008
ss -tlnp | grep 30008
netstat -tlnp | grep 30008

# 检查所有300xx端口
for port in {30000..30010}; do
  echo -n "Port $port: "
  lsof -i :$port > /dev/null 2>&1 && echo "USED" || echo "FREE"
done
```

### 检查Docker容器端口

```bash
# 查看所有容器端口映射
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep cloudphone

# 查看docker-compose端口
docker-compose -f docker-compose.dev.yml ps

# 查看特定服务端口
docker port cloudphone-sms-receive-service
```

### 测试端口连通性

```bash
# 测试HTTP端口
curl http://localhost:30008/health

# 测试TCP端口
nc -zv localhost 30008
telnet localhost 30008
```

## 📋 检查清单

在添加新服务前，完成以下检查：

- [ ] 查看本文档确认端口未被占用
- [ ] 检查 `docker-compose.dev.yml` 中是否有端口冲突
- [ ] 检查 `docker-compose.prod.yml` 中是否有端口冲突
- [ ] 更新本文档添加新服务的端口分配
- [ ] 在新服务的 `.env.example` 中明确指定端口
- [ ] 在新服务的 `README.md` 中文档化端口
- [ ] 更新 API Gateway 的路由配置(如需要)
- [ ] 更新 Consul 服务注册端口(如需要)

## 🚀 快速命令参考

```bash
# 启动所有服务
docker-compose -f docker-compose.dev.yml up -d

# 查看服务端口
docker-compose ps

# 测试所有后端服务健康检查
for port in 30000 30001 30002 30003 30005 30006 30007 30008; do
  echo "Testing port $port..."
  curl -s http://localhost:$port/health | jq '.' || echo "Failed"
done

# 测试SMS receive service
curl http://localhost:30008/health
curl http://localhost:30008/health/detailed
curl http://localhost:30008/metrics | head -20
```

## 📚 相关文档

- [架构文档](./ARCHITECTURE.md)
- [开发指南](./DEVELOPMENT_GUIDE.md)
- [SMS Receive Service README](../backend/sms-receive-service/README.md)
- [Proxy Service README](../backend/proxy-service/README.md)
- [API Gateway配置](../backend/api-gateway/README.md)

---

**最后更新**: 2025-11-02
**维护者**: CloudPhone Team
**版本**: 1.0.0
