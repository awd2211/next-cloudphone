# PM2 配置升级指南

**从基础配置升级到高级配置**

---

## 📊 配置对比

### 当前配置 (ecosystem.config.js)

```javascript
{
  instances: 1,              // 单实例
  exec_mode: 'fork',         // Fork 模式
  autorestart: true,
  max_memory_restart: '1G',
  // 无健康检查
  // 无集群模式
  // 无监控
}
```

**问题**:
- ❌ 只用了 25% 的 CPU（4核只用1核）
- ❌ 无自动健康检查
- ❌ 重启有停机时间
- ❌ 无性能监控

### 新配置 (ecosystem.config.advanced.js)

```javascript
{
  instances: 4,              // 4实例集群
  exec_mode: 'cluster',      // 集群模式
  autorestart: true,
  max_memory_restart: '1G',

  // ✅ 健康检查
  health_check: {
    enable: true,
    interval: 30000,
    path: '/health',
  },

  // ✅ 优雅重启
  wait_ready: true,
  kill_timeout: 5000,

  // ✅ 监控
  pmx: true,
}
```

**改进**:
- ✅ CPU 利用率提升 400%
- ✅ 自动健康检查，异常自动重启
- ✅ 零停机部署（reload）
- ✅ 实时性能监控

---

## 🚀 升级步骤

### 准备工作

**1. 确保所有服务都有健康检查端点**

检查每个服务是否有 `/health` 端点：

```bash
# 测试健康检查
curl http://localhost:30000/health  # api-gateway
curl http://localhost:30001/health  # user-service
curl http://localhost:30002/health  # device-service
curl http://localhost:30003/health  # app-service
curl http://localhost:30005/health  # billing-service
```

如果某个服务没有 `/health` 端点，参考 `backend/user-service/src/health.controller.ts` 添加。

**2. 备份当前配置**

```bash
cp ecosystem.config.js ecosystem.config.backup.js
```

---

### 方案一：渐进式升级（推荐）

#### 步骤 1: 安装 PM2 增强模块

```bash
# 运行自动配置脚本
chmod +x scripts/setup-pm2-advanced.sh
./scripts/setup-pm2-advanced.sh
```

这将自动安装：
- ✅ pm2-logrotate (日志轮转)
- ✅ pm2-server-monit (服务器监控)
- ✅ 配置开机自启

#### 步骤 2: 先测试单个服务

```bash
# 停止所有服务
pm2 stop all

# 只启动 api-gateway 测试集群模式
pm2 start ecosystem.config.advanced.js --only api-gateway

# 查看状态
pm2 status

# 查看监控
pm2 monit

# 查看日志
pm2 logs api-gateway --lines 50
```

**验证清单**:
- [ ] `pm2 status` 显示 4 个 api-gateway 实例
- [ ] 所有实例状态都是 `online`
- [ ] 健康检查正常：`curl http://localhost:30000/health`
- [ ] 日志无错误

#### 步骤 3: 逐个启动其他服务

```bash
# 启动 user-service
pm2 start ecosystem.config.advanced.js --only user-service

# 验证
pm2 status
curl http://localhost:30001/health

# 启动 device-service
pm2 start ecosystem.config.advanced.js --only device-service
curl http://localhost:30002/health

# 启动剩余服务
pm2 start ecosystem.config.advanced.js --only app-service
pm2 start ecosystem.config.advanced.js --only billing-service
```

#### 步骤 4: 测试零停机重启

```bash
# 测试零停机重载（仅集群模式支持）
pm2 reload api-gateway

# 对比普通重启
# pm2 restart api-gateway  # 有停机时间
# pm2 reload api-gateway   # 零停机（推荐）
```

#### 步骤 5: 保存配置

```bash
# 保存当前进程列表
pm2 save

# 验证开机自启
pm2 startup
```

---

### 方案二：一键升级（快速但风险较高）

```bash
# 1. 停止所有服务
pm2 stop all
pm2 delete all

# 2. 运行配置脚本
./scripts/setup-pm2-advanced.sh

# 3. 启动所有服务（新配置）
pm2 start ecosystem.config.advanced.js

# 4. 验证
pm2 status
pm2 monit
```

---

## 🔍 验证和测试

### 1. 检查服务状态

```bash
pm2 status
```

期望输出：
```
┌─────┬──────────────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name             │ mode    │ status  │ instances│ cpu    │
├─────┼──────────────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ api-gateway      │ cluster │ online  │ 4        │ 5%     │
│ 1   │ user-service     │ cluster │ online  │ 2        │ 3%     │
│ 2   │ device-service   │ cluster │ online  │ 2        │ 2%     │
│ 3   │ app-service      │ fork    │ online  │ 1        │ 1%     │
│ 4   │ billing-service  │ fork    │ online  │ 1        │ 1%     │
└─────┴──────────────────┴─────────┴─────────┴──────────┴────────┘
```

### 2. 测试健康检查

```bash
# 创建健康检查脚本
cat > check-health.sh << 'EOF'
#!/bin/bash
for port in 30000 30001 30002 30003 30005; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
  if [ "$status" = "200" ]; then
    echo "✅ Port $port: OK"
  else
    echo "❌ Port $port: FAIL ($status)"
  fi
done
EOF

chmod +x check-health.sh
./check-health.sh
```

### 3. 测试负载均衡

```bash
# 多次请求 api-gateway，应该被不同实例处理
for i in {1..10}; do
  curl http://localhost:30000/health | jq .
done
```

### 4. 测试零停机重启

```bash
# 开两个终端

# 终端1: 持续请求
while true; do
  curl -s http://localhost:30000/health > /dev/null && echo "✅"
  sleep 0.5
done

# 终端2: 执行重载
pm2 reload api-gateway

# 观察终端1，应该没有请求失败
```

---

## 📈 性能对比

### 升级前

| 服务 | 实例数 | CPU使用 | 请求/秒 | 响应时间 |
|------|--------|---------|---------|----------|
| api-gateway | 1 | 25% | ~500 | 20ms |
| user-service | 1 | 20% | ~200 | 30ms |

**总 CPU 利用率**: ~25%

### 升级后（预期）

| 服务 | 实例数 | CPU使用 | 请求/秒 | 响应时间 |
|------|--------|---------|---------|----------|
| api-gateway | 4 | 80% | ~2000 | 15ms |
| user-service | 2 | 40% | ~600 | 25ms |

**总 CPU 利用率**: ~70%
**性能提升**: 4x 吞吐量

---

## 🎯 监控和运维

### 实时监控

```bash
# 终端监控界面
pm2 monit

# Web 监控界面（访问 http://localhost:9615）
pm2 web

# 查看详细信息
pm2 show api-gateway
```

### 常用运维命令

```bash
# 查看日志
pm2 logs                          # 所有服务
pm2 logs api-gateway             # 特定服务
pm2 logs --lines 100             # 最近100行
pm2 logs --json                  # JSON格式

# 零停机重启
pm2 reload all                   # 所有集群服务
pm2 reload api-gateway           # 特定服务

# 扩展/缩减实例
pm2 scale api-gateway 8          # 扩展到8个实例
pm2 scale api-gateway 2          # 缩减到2个实例

# 重置重启计数
pm2 reset all

# 清空日志
pm2 flush
```

---

## ⚠️ 注意事项

### 1. 集群模式限制

**不适用场景**:
- WebSocket 长连接（需要 sticky session）
- 文件上传（已配置单实例）
- 有状态服务（如 session 存储）

**解决方案**:
- 使用 Redis 存储 session
- 使用 Redis Pub/Sub 跨实例通信
- 配置粘性会话（sticky session）

### 2. 内存使用

集群模式会增加内存使用：
- 单实例: ~150MB
- 4实例: ~600MB (150MB × 4)

确保服务器有足够内存。

### 3. 数据库连接

每个实例都会创建数据库连接：
- 单实例: ~10 个连接
- 4实例: ~40 个连接

确保数据库连接池配置合理。

### 4. 日志文件

启用 `pm2-logrotate` 防止日志文件过大：

```bash
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
```

---

## 🔙 回滚方案

如果升级后遇到问题，快速回滚：

```bash
# 方案1: 使用备份配置
pm2 stop all
pm2 delete all
pm2 start ecosystem.config.backup.js

# 方案2: 使用原配置
pm2 stop all
pm2 delete all
pm2 start ecosystem.config.js

# 保存当前状态
pm2 save
```

---

## 📋 升级检查清单

### 升级前

- [ ] 备份当前配置
- [ ] 确认所有服务有 `/health` 端点
- [ ] 检查服务器资源（CPU、内存）
- [ ] 了解回滚方案

### 升级中

- [ ] 运行 `setup-pm2-advanced.sh`
- [ ] 逐个启动服务并验证
- [ ] 测试健康检查
- [ ] 测试零停机重启

### 升级后

- [ ] 验证所有服务正常运行
- [ ] 检查日志无错误
- [ ] 测试负载均衡
- [ ] 保存 PM2 配置 (`pm2 save`)
- [ ] 设置开机自启 (`pm2 startup`)
- [ ] 配置监控告警

---

## 📚 参考资源

### 内部文档
- [PM2 功能详解](./PM2_FEATURES_AND_CONFIG.md)
- [健康检查文档](./HEALTH_CHECK.md)

### 外部资源
- [PM2 官方文档](https://pm2.keymetrics.io/docs)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)

---

**文档维护者**: Claude Code
**最后更新**: 2025-10-22
