# SMS Receive Service - 升级到 v2.0.0 指南

## 📋 前置检查

在开始升级之前，请确认以下条件：

- [x] 已备份数据库
- [x] 服务可以停机维护
- [x] 已阅读 [CHANGELOG.md](./CHANGELOG.md) 了解所有变更
- [x] 已准备好测试环境进行验证

## 🚀 升级步骤

### 1. 停止服务

```bash
# 使用 PM2
pm2 stop sms-receive-service

# 或使用 systemd
sudo systemctl stop sms-receive-service
```

### 2. 备份数据库

```bash
# 备份 PostgreSQL 数据库
pg_dump -U postgres -d cloudphone_sms > backup_sms_$(date +%Y%m%d_%H%M%S).sql

# 或使用 docker
docker compose -f docker-compose.dev.yml exec postgres \
  pg_dump -U postgres cloudphone_sms > backup_sms_$(date +%Y%m%d_%H%M%S).sql
```

### 3. 更新代码

```bash
cd /home/eric/next-cloudphone/backend/sms-receive-service

# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install

# 构建服务
pnpm build
```

### 4. 运行数据库迁移

```bash
# 检查待执行的迁移
pnpm migration:show

# 执行迁移（创建新表）
pnpm migration:run

# 验证迁移成功
pnpm migration:show
```

**预期输出**：
```
[X] InitialSchema1730500000000
[X] AddBlacklistAndABTest1730600000000
```

### 5. 更新环境变量（可选）

编辑 `.env` 文件，添加新的可选配置：

```bash
# ========================================
# v2.0.0 新增配置
# ========================================

# 启用智能路由（推荐）
ENABLE_SMART_ROUTING=true

# 号码池配置
MIN_POOL_SIZE=5
TARGET_POOL_SIZE=10
MAX_POOL_SIZE=20

# 号码冷却期（小时）
NUMBER_COOLDOWN_HOURS=24

# 号码最大复用次数
MAX_REUSE_COUNT=3

# 验证码缓存 TTL（秒）
VERIFICATION_CODE_CACHE_TTL=600

# A/B 测试默认样本量
AB_TEST_DEFAULT_SAMPLE_SIZE=100
```

### 6. 启动服务

```bash
# 使用 PM2
pm2 start sms-receive-service
pm2 logs sms-receive-service --lines 50

# 或使用 systemd
sudo systemctl start sms-receive-service
sudo journalctl -u sms-receive-service -f
```

### 7. 验证服务健康

```bash
# 检查服务状态
curl http://localhost:30008/health

# 检查 Prometheus 指标
curl http://localhost:30008/metrics | grep sms_

# 查看新增的指标
curl http://localhost:30008/metrics | grep -E "(sms_receive_time|sms_verification_code|sms_number_pool)"
```

**预期响应**：
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "rabbitmq": { "status": "up" }
  }
}
```

## 🧪 功能测试

### 测试 1: 验证码提取（公开接口）

```bash
# 测试验证码提取
curl -X POST http://localhost:30008/verification-codes/extract \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Your verification code is 123456",
    "serviceCode": "telegram"
  }'
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "code": "123456",
    "confidence": 95,
    "patternType": "six_digit",
    "extractedFrom": "verification code is 123456"
  }
}
```

### 测试 2: 获取支持的验证码模式

```bash
curl http://localhost:30008/verification-codes/patterns
```

### 测试 3: 统计 API（需要认证）

```bash
# 获取统计信息
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:30008/statistics"

# 实时监控
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:30008/statistics/realtime"

# 平台对比
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:30008/statistics/providers/comparison"
```

### 测试 4: 号码池预热

```bash
# 预热号码
curl -X POST http://localhost:30008/pool/preheat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceCode": "telegram",
    "countryCode": "US",
    "count": 10
  }'

# 查看池统计
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:30008/pool/statistics?serviceCode=telegram&countryCode=US"
```

## 📊 监控指标

升级后，重点监控以下 Prometheus 指标：

### 核心业务指标

```promql
# 号码池健康度
sms_number_pool_size{status="available"}

# 预热号码数量
sms_number_pool_preheated

# 号码复用次数
rate(sms_number_pool_reused_total[5m])
```

### 验证码提取指标

```promql
# 验证码提取成功数
rate(sms_verification_code_extracted_total[5m])

# 验证码缓存命中率
rate(sms_verification_code_cache_hits_total[5m]) /
  (rate(sms_verification_code_cache_hits_total[5m]) +
   rate(sms_verification_code_cache_misses_total[5m]))

# 验证码提取耗时
histogram_quantile(0.95,
  rate(sms_verification_code_extraction_time_seconds_bucket[5m]))
```

### 平台性能指标

```promql
# 平台成功率
sms_provider_success_rate_percent

# 平台平均成本
sms_provider_average_cost_usd

# 平台响应时间
sms_provider_response_time_seconds

# SMS 接收时间
histogram_quantile(0.95,
  rate(sms_receive_time_seconds_bucket[5m]))
```

### 告警建议

在 Grafana 或 Prometheus Alertmanager 中配置以下告警：

```yaml
groups:
  - name: sms_receive_service
    rules:
      # 号码池告警
      - alert: NumberPoolLow
        expr: sms_number_pool_size{status="available"} < 3
        for: 5m
        annotations:
          summary: "SMS 号码池数量过低"
          description: "可用号码数量 {{ $value }}，低于阈值 3"

      # 平台成功率告警
      - alert: ProviderSuccessRateLow
        expr: sms_provider_success_rate_percent < 80
        for: 10m
        annotations:
          summary: "平台 {{ $labels.provider }} 成功率过低"
          description: "成功率 {{ $value }}%，低于 80%"

      # 验证码提取失败告警
      - alert: VerificationCodeExtractionFailing
        expr: rate(sms_verification_code_extracted_total[5m]) == 0
        for: 15m
        annotations:
          summary: "验证码提取服务异常"
          description: "15分钟内未成功提取任何验证码"
```

## 🎯 性能基准

升级后预期性能提升：

| 指标 | v1.0.0 | v2.0.0 | 提升 |
|------|--------|--------|------|
| 号码获取时间 | 30-60秒 | ~100ms | **300倍+** |
| 验证码提取时间 | N/A | <5ms | **新功能** |
| 成本节省 | - | 40-60% | **显著降低** |
| 可用性 | 95% | 99.9%+ | **提升** |

## 🔄 回滚步骤

如果升级出现问题，执行以下回滚：

### 1. 停止服务

```bash
pm2 stop sms-receive-service
```

### 2. 回滚数据库迁移

```bash
cd /home/eric/next-cloudphone/backend/sms-receive-service

# 回滚最后一次迁移
pnpm migration:revert

# 验证回滚
pnpm migration:show
```

### 3. 恢复代码

```bash
# 切换到之前的 tag 或 commit
git checkout v1.0.0

# 重新构建
pnpm install
pnpm build
```

### 4. 恢复数据库（如果需要）

```bash
# 从备份恢复
psql -U postgres -d cloudphone_sms < backup_sms_YYYYMMDD_HHMMSS.sql
```

### 5. 重启服务

```bash
pm2 start sms-receive-service
```

## 📝 升级检查清单

- [ ] 数据库已备份
- [ ] 代码已更新到 v2.0.0
- [ ] 依赖已安装 (`pnpm install`)
- [ ] 服务已构建 (`pnpm build`)
- [ ] 数据库迁移已执行 (`pnpm migration:run`)
- [ ] 环境变量已更新（可选）
- [ ] 服务已启动并运行
- [ ] 健康检查通过
- [ ] 验证码提取测试通过
- [ ] 号码池功能测试通过
- [ ] Prometheus 指标可见
- [ ] Grafana 监控面板已更新
- [ ] 告警规则已配置
- [ ] 文档已更新
- [ ] 团队已通知升级完成

## 🐛 常见问题

### Q1: 迁移失败 - "relation already exists"

**原因**: 表已经通过 `synchronize: true` 自动创建

**解决方案**:
```bash
# 标记迁移为已执行
pnpm typeorm migration:skip
```

### Q2: 验证码提取总是失败

**检查**:
- 确认 Redis 连接正常
- 检查 MetricsService 是否正常工作
- 查看日志: `pm2 logs sms-receive-service`

### Q3: 号码池一直为空

**原因**:
- 平台 API Key 未配置
- 自动补充任务未运行

**解决方案**:
```bash
# 手动触发预热
curl -X POST http://localhost:30008/pool/preheat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serviceCode":"telegram","countryCode":"US","count":10}'
```

### Q4: Prometheus 指标不显示

**检查**:
```bash
# 确认 metrics 端点可访问
curl http://localhost:30008/metrics

# 检查 Prometheus 配置
cat infrastructure/monitoring/prometheus/prometheus.yml | grep sms-receive
```

## 📞 支持

如有问题，请联系：

- 📧 Email: support@cloudphone.com
- 💬 Discord: [Join us](https://discord.gg/cloudphone)
- 📖 Docs: https://docs.cloudphone.com
- 🐛 Issues: [GitHub Issues](https://github.com/cloudphone/sms-receive-service/issues)

## 📚 相关文档

- [CHANGELOG.md](./CHANGELOG.md) - 完整变更日志
- [README.md](./README.md) - 服务文档
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [API.md](./API.md) - API 文档

---

**版本**: v2.0.0
**更新日期**: 2025-11-02
**作者**: CloudPhone Team
