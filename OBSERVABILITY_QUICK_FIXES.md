# 可观测性系统快速修复指南

**日期:** 2025-11-04
**目的:** 修复OBSERVABILITY_SYSTEM_STATUS.md中的待优化项

---

## 🚨 P0 修复项 (立即执行)

### 1. proxy-service Pino日志配置

**问题:** proxy-service未配置Pino JSON日志，导致日志格式不统一

**修复步骤:**

```bash
# 1. 添加依赖
cd backend/proxy-service
pnpm add nestjs-pino pino pino-http pino-pretty

# 2. 更新 app.module.ts
```

```typescript
// backend/proxy-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerConfig } from '@cloudphone/shared';

@Module({
  imports: [
    // ... 其他 imports
    LoggerModule.forRoot(createLoggerConfig('proxy-service')),
    // ... 其他 imports
  ],
  // ...
})
export class AppModule {}
```

```bash
# 3. 重新构建和启动
pnpm build
pm2 restart proxy-service
```

**验证:**
```bash
# 检查日志文件格式
tail -f backend/proxy-service/logs/combined.log
# 应该看到JSON格式的日志
```

---

### 2. 验证日志索引创建

**问题:** Elasticsearch中暂无cloudphone-logs-*索引

**排查步骤:**

```bash
# 1. 检查Filebeat是否正常运行
docker compose -f infrastructure/logging/docker-compose.elk.yml logs filebeat | tail -50

# 2. 检查Logstash是否接收数据
docker compose -f infrastructure/logging/docker-compose.elk.yml logs logstash | grep "events received"

# 3. 检查微服务是否运行并产生日志
pm2 list
ls -la backend/*/logs/

# 4. 手动触发日志生成
curl http://localhost:30000/health  # API Gateway
curl http://localhost:30001/health  # User Service
curl http://localhost:30002/health  # Device Service

# 5. 等待1-2分钟后检查索引
curl http://localhost:9200/_cat/indices?v | grep cloudphone-logs
```

**如果仍无索引，重启ELK Stack:**

```bash
cd infrastructure/logging
docker compose -f docker-compose.elk.yml restart filebeat logstash
```

**验证成功:**
```bash
# 应该看到类似输出
yellow open cloudphone-logs-api-gateway-2025.11.04 ...
yellow open cloudphone-logs-user-service-2025.11.04 ...
```

---

### 3. 验证追踪数据收集

**问题:** Jaeger中暂无服务追踪数据

**修复步骤:**

```bash
# 1. 确保所有微服务已启动
pm2 list

# 如果未启动，启动所有服务
pm2 start ecosystem.config.js

# 2. 检查OpenTelemetry环境变量
# 在每个服务的日志中查找：
pm2 logs api-gateway --lines 20 | grep OpenTelemetry
# 应该看到: "✅ OpenTelemetry initialized for service: api-gateway"

# 3. 产生一些HTTP流量
for i in {1..10}; do
  curl http://localhost:30000/health
  curl http://localhost:30001/health
  curl http://localhost:30002/health
done

# 4. 等待30秒（Span批量导出间隔）
sleep 30

# 5. 检查Jaeger UI
# 访问 http://localhost:16686
# 在Service下拉框中应该看到服务列表
```

**通过API验证:**
```bash
# 检查Jaeger服务列表
curl -s http://localhost:16686/api/services | jq

# 应该返回类似：
# {
#   "data": ["api-gateway", "user-service", "device-service", ...],
#   "total": 8
# }
```

**如果仍无数据，检查Jaeger日志:**
```bash
docker logs cloudphone-jaeger --tail 50
```

---

## 📋 P1 修复项 (本周完成)

### 4. Kibana索引模式配置

**执行步骤:**

1. 访问 http://localhost:5601
2. 导航到 **Management** → **Stack Management** → **Index Patterns**
3. 点击 **Create index pattern**
4. 输入: `cloudphone-logs-*`
5. 点击 **Next step**
6. 选择时间字段: `@timestamp`
7. 点击 **Create index pattern**

**创建常用查询:**

在Discover页面，保存以下查询：

```kql
# 错误日志
log_level:"error"

# 慢请求
http_duration > 1000

# 特定服务错误
service:"device-service" AND log_level:"error"

# 500错误
http_status:500

# 特定用户操作
user_id:"some-user-id"
```

---

### 5. Grafana仪表板导入

**执行步骤:**

```bash
# 1. 访问 Grafana
# http://localhost:3000 (admin/admin)

# 2. 导航到 Dashboards → Import

# 3. 逐个导入以下文件：
# infrastructure/monitoring/grafana/dashboards/system-overview.json
# infrastructure/monitoring/grafana/dashboards/microservices-performance.json
# infrastructure/monitoring/grafana/dashboards/database-performance.json
# infrastructure/monitoring/grafana/dashboards/message-queue.json
# infrastructure/monitoring/grafana/dashboards/business-metrics.json
# infrastructure/monitoring/grafana/dashboards/distributed-tracing.json
# infrastructure/monitoring/grafana/dashboards/transaction-performance.json
# infrastructure/monitoring/grafana/dashboards/alerts-sla.json
# infrastructure/monitoring/grafana/dashboards/infrastructure-monitoring.json

# 4. 每个仪表板导入后，验证数据是否正常显示
```

**快速导入脚本:**

```bash
#!/bin/bash
# import-grafana-dashboards.sh

GRAFANA_URL="http://localhost:3000"
GRAFANA_USER="admin"
GRAFANA_PASS="admin"

for dashboard in infrastructure/monitoring/grafana/dashboards/*.json; do
  echo "Importing $dashboard..."
  curl -X POST \
    -H "Content-Type: application/json" \
    -u "$GRAFANA_USER:$GRAFANA_PASS" \
    "$GRAFANA_URL/api/dashboards/db" \
    -d @"$dashboard"
done
```

---

### 6. 告警测试

**执行步骤:**

```bash
# 1. 查看当前告警规则
curl http://localhost:9090/api/v1/rules | jq

# 2. 触发测试告警（高CPU使用率）
# 在某个服务中运行CPU密集型操作
ab -n 10000 -c 100 http://localhost:30000/health

# 3. 等待1-2分钟后检查告警
curl http://localhost:9090/api/v1/alerts | jq

# 4. 检查AlertManager
curl http://localhost:9093/api/v2/alerts | jq

# 5. 验证Telegram通知
# 检查Telegram Bot是否收到消息

# 6. 验证飞书通知
# 检查飞书群是否收到消息
```

**手动发送测试告警:**

```bash
# 使用AlertManager的API发送测试告警
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[
    {
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning",
        "service": "test-service"
      },
      "annotations": {
        "summary": "This is a test alert",
        "description": "Testing alerting system"
      }
    }
  ]'
```

---

## 🔄 验证检查清单

完成所有修复后，运行以下检查：

```bash
# 1. 所有微服务运行
pm2 list | grep online
# 应该看到所有8个服务都是online

# 2. ELK Stack健康
curl http://localhost:9200/_cluster/health?pretty
# status应该是green或yellow

# 3. Jaeger健康
curl http://localhost:16686/api/services
# 应该看到8个服务

# 4. Prometheus健康
curl http://localhost:9090/-/healthy
# 应该返回Prometheus is Healthy

# 5. Grafana健康
curl http://localhost:3000/api/health
# 应该返回{"commit":"...","database":"ok",...}

# 6. 日志索引存在
curl http://localhost:9200/_cat/indices?v | grep cloudphone-logs
# 应该看到多个索引

# 7. 追踪数据存在
curl -s http://localhost:16686/api/services | jq '.data | length'
# 应该返回8

# 8. 指标端点响应
for port in 30000 30001 30002 30003 30005 30006 30007 30008; do
  echo "Checking port $port..."
  curl -s http://localhost:$port/metrics | head -5
done
```

---

## 📊 最终验证

完成所有修复后，执行完整验证：

```bash
# 运行综合测试脚本
cat > test-observability.sh << 'EOF'
#!/bin/bash
echo "=== 可观测性系统综合测试 ==="

# 1. 产生日志
echo "1. 产生测试日志..."
for i in {1..20}; do
  curl -s http://localhost:30000/health > /dev/null
  curl -s http://localhost:30001/health > /dev/null
  curl -s http://localhost:30002/health > /dev/null
done

# 2. 等待数据处理
echo "2. 等待数据处理（60秒）..."
sleep 60

# 3. 验证日志
echo "3. 验证Elasticsearch日志..."
curl -s http://localhost:9200/_cat/indices?v | grep cloudphone-logs

# 4. 验证追踪
echo "4. 验证Jaeger追踪..."
curl -s http://localhost:16686/api/services | jq

# 5. 验证指标
echo "5. 验证Prometheus指标..."
curl -s http://localhost:9090/api/v1/label/__name__/values | jq | grep device

echo ""
echo "=== 测试完成 ==="
echo "请访问以下URL验证："
echo "- Kibana: http://localhost:5601"
echo "- Jaeger: http://localhost:16686"
echo "- Grafana: http://localhost:3000"
EOF

chmod +x test-observability.sh
./test-observability.sh
```

---

## 🎯 成功标准

修复完成后，应该满足：

- ✅ 所有8个服务使用Pino JSON日志
- ✅ Elasticsearch中有cloudphone-logs-*索引
- ✅ Jaeger中有所有8个服务的追踪数据
- ✅ Kibana可以查询到日志
- ✅ Grafana显示所有仪表板数据
- ✅ 告警测试成功（收到通知）

---

**预计完成时间:** 1-2小时
**优先级:** P0项目立即执行，P1项本周完成
**验证频率:** 每次修复后立即验证
