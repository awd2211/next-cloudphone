# PM2 特性与配置详解

**当前版本**: PM2 v5.x
**项目使用情况**: 基础功能 + 部分高级功能

---

## 📊 当前配置分析

### 已启用的功能 ✅

从 `ecosystem.config.js` 可以看到我们已经使用了：

| 功能 | 配置项 | 说明 |
|------|--------|------|
| **进程管理** | `name`, `script`, `cwd` | 基础进程配置 |
| **自动重启** | `autorestart: true` | 崩溃自动重启 |
| **内存限制** | `max_memory_restart: '1G'` | 超过 1GB 自动重启 |
| **日志管理** | `error_file`, `out_file` | 分离错误和输出日志 |
| **日志格式** | `log_date_format` | 时间戳格式化 |
| **日志合并** | `merge_logs: true` | 合并多实例日志 |
| **环境变量** | `env` | 设置 NODE_ENV, PORT |
| **单实例模式** | `instances: 1` | 每个服务一个实例 |

### 已启用的高级功能 ✅

| 功能 | 配置项 | 状态 |
|------|--------|------|
| **集群模式** | `instances: 4`, `exec_mode: 'cluster'` | ✅ api-gateway, user-service |
| **负载均衡** | 集群模式自动启用 | ✅ Round-robin |
| **优雅重启** | `wait_ready`, `kill_timeout` | ✅ 集群服务 |
| **生产环境** | `env_production` | ✅ 所有服务 |
| **资源限制** | `max_restarts`, `min_uptime` | ✅ 所有服务 |

### 未启用的高级功能 ⏸️

| 功能 | 用途 | 优先级 |
|------|------|--------|
| **监控和指标** | PM2 Plus 集成 | 🟢 高 |
| **健康检查** | HTTP 端点自动检查 | 🟡 中 |
| **Cron 重启** | 定时重启服务 | 🔵 低 |
| **watch 模式** | 文件变化自动重启 | 🔵 低（开发用）|

---

## 🎯 PM2 核心功能详解

### 1. 集群模式（Cluster Mode）

**当前状态**: ✅ 已启用（部分服务）

**用途**: 充分利用多核 CPU，提高并发处理能力

**配置示例**:
```javascript
{
  name: 'api-gateway',
  script: 'dist/main.js',
  instances: 4,              // 指定实例数
  exec_mode: 'cluster',      // 关键：启用集群模式
  // ... 其他配置
}
```

**优势**:
- ✅ 自动负载均衡（Round-robin）
- ✅ 多核 CPU 利用率最大化
- ✅ 单个实例崩溃不影响整体服务
- ✅ 零停机重启（reload）

---

#### 🎯 各服务集群模式配置建议（基于实际业务分析）

| 服务名称 | 推荐模式 | 实例数 | 关键原因 | 风险等级 |
|---------|---------|-------|---------|---------|
| **api-gateway** | ✅ Cluster | 4 | 无状态路由，高并发入口 | 🟢 低 |
| **user-service** | ✅ Cluster | 2 | JWT+Redis认证，无状态 | 🟢 低 |
| **device-service** | ❌ Fork | 1 | **内存端口缓存，有状态** | 🔴 高 |
| **app-service** | ⚠️ Fork | 1 | 文件上传临时文件处理 | 🟡 中 |
| **billing-service** | ❌ Fork | 1 | **支付处理，定时任务，并发风险** | 🔴 高 |
| **notification-service** | ❌ Fork | 1 | **WebSocket有状态连接** | 🔴 高 |

**详细说明**:

**✅ 适合集群模式的服务**:
- **api-gateway**: 纯路由转发，无状态，是主要流量入口
- **user-service**: JWT认证 + Redis缓存，状态都在外部存储

**❌ 不适合集群模式的服务**:
- **device-service**: 端口分配使用内存 Set 缓存，多实例会导致端口冲突
  ```typescript
  // port-manager.service.ts
  private usedAdbPorts: Set<number> = new Set();  // 内存缓存
  ```

- **billing-service**:
  - 定时任务会在每个实例重复执行
  - 支付回调并发处理可能导致重复充值
  ```typescript
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredOrders() { ... }  // 每个实例都执行
  ```

- **notification-service**: WebSocket连接存储在本地内存，多实例会丢失连接
  ```typescript
  private connections: Map<string, Socket> = new Map();  // 本地连接
  ```

**⚠️ 详细分析**: 参见 [PM2_CLUSTER_MODE_ANALYSIS.md](./PM2_CLUSTER_MODE_ANALYSIS.md)

---

**实施方案**:
```javascript
// ecosystem.config.development.js / ecosystem.config.production.js
module.exports = {
  apps: [
    // ✅ 集群模式
    {
      name: 'api-gateway',
      instances: 4,
      exec_mode: 'cluster',
      wait_ready: true,
      kill_timeout: 5000,
    },
    {
      name: 'user-service',
      instances: 2,
      exec_mode: 'cluster',
      wait_ready: true,
      kill_timeout: 5000,
    },

    // ❌ 单实例模式
    {
      name: 'device-service',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'billing-service',
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'notification-service',
      instances: 1,
      exec_mode: 'fork',
    },
  ]
};
```

---

### 2. 零停机重载（Graceful Reload）

**当前状态**: ⚠️ 部分支持（autorestart 但非零停机）

**用途**: 更新代码时不中断服务

**使用方法**:
```bash
# 普通重启（有停机时间）
pm2 restart api-gateway

# 零停机重载（仅集群模式）
pm2 reload api-gateway

# 优雅关闭（等待请求完成）
pm2 stop api-gateway --wait-ready
```

**NestJS 集成**:
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 监听 SIGINT 信号
  process.on('SIGINT', async () => {
    await app.close();
    process.exit(0);
  });

  // PM2 ready 信号
  await app.listen(3000);
  if (process.send) {
    process.send('ready');
  }
}
```

**配置优化**:
```javascript
{
  name: 'api-gateway',
  instances: 4,
  exec_mode: 'cluster',
  wait_ready: true,       // 等待 ready 信号
  listen_timeout: 10000,  // ready 超时时间
  kill_timeout: 5000,     // 强制杀死前等待时间
}
```

---

### 3. 监控和指标

**当前状态**: ❌ 未启用

**PM2 Plus（免费版）**:
```bash
# 安装
pm2 install pm2-server-monit

# 查看实时监控
pm2 monit

# Web 界面
pm2 web
```

**指标类型**:
- CPU 使用率
- 内存使用
- 请求/秒
- 响应时间
- 错误率

**配置示例**:
```javascript
{
  name: 'api-gateway',
  // ... 其他配置

  // 自定义指标
  instance_var: 'INSTANCE_ID',

  // PM2 Plus 配置
  pmx: true,

  // 异常监控
  error: {
    error_threshold: 50, // 错误阈值
    restart_on_error: true
  }
}
```

---

### 4. 健康检查（Health Check）

**当前状态**: ❌ 未启用

**用途**: 自动检测服务健康状态，异常时重启

**配置示例**:
```javascript
{
  name: 'user-service',
  script: 'dist/main.js',

  // HTTP 健康检查
  http: {
    host: 'localhost',
    port: 30001,
    path: '/health',
    expect_status: 200,
    interval: 30000, // 30秒检查一次
    timeout: 5000,   // 5秒超时
  },

  // 失败处理
  max_restarts: 10,
  min_uptime: '10s',
}
```

**NestJS 健康检查端点**:
```typescript
// health.controller.ts
@Get('health')
async check() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}
```

---

### 5. 日志管理增强

**当前配置**:
```javascript
{
  error_file: './logs/user-service-error.log',
  out_file: './logs/user-service-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true
}
```

**高级功能**:

#### a) 日志轮转
```bash
# 安装日志轮转模块
pm2 install pm2-logrotate

# 配置
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

#### b) 日志流式处理
```bash
# 实时查看日志
pm2 logs user-service

# 查看最近 100 行
pm2 logs user-service --lines 100

# 只看错误日志
pm2 logs user-service --err

# JSON 格式输出
pm2 logs --json
```

#### c) 集中式日志
```javascript
{
  name: 'user-service',

  // 使用 pino 输出 JSON 日志
  out_file: '/dev/null',
  error_file: '/dev/null',

  // 通过 pino-pretty 格式化
  log_type: 'json',
}
```

---

### 6. 环境管理

**当前配置**:
```javascript
env: {
  NODE_ENV: 'development',
  PORT: 30001
}
```

**多环境配置**:
```javascript
{
  name: 'api-gateway',
  script: 'dist/main.js',

  // 开发环境
  env: {
    NODE_ENV: 'development',
    PORT: 30000,
    LOG_LEVEL: 'debug'
  },

  // 生产环境
  env_production: {
    NODE_ENV: 'production',
    PORT: 80,
    LOG_LEVEL: 'info'
  },

  // 测试环境
  env_staging: {
    NODE_ENV: 'staging',
    PORT: 8000,
    LOG_LEVEL: 'info'
  }
}
```

**使用方法**:
```bash
# 启动生产环境
pm2 start ecosystem.config.js --env production

# 切换环境（重启）
pm2 restart api-gateway --env production
```

---

### 7. Cron 定时任务

**当前状态**: ❌ 未启用

**用途**: 定时重启服务（清理内存、刷新连接）

**配置示例**:
```javascript
{
  name: 'billing-service',
  script: 'dist/main.js',

  // 每天凌晨 3 点重启
  cron_restart: '0 3 * * *',

  // 不在凌晨 3 点立即启动
  autorestart: false,
}
```

**常用 Cron 表达式**:
```
0 3 * * *      # 每天 3:00
0 */6 * * *    # 每 6 小时
0 0 * * 0      # 每周日午夜
```

---

### 8. 进程优先级和资源限制

**当前状态**: ⚠️ 仅设置了内存限制

**扩展配置**:
```javascript
{
  name: 'api-gateway',
  script: 'dist/main.js',

  // 内存限制
  max_memory_restart: '1G',

  // CPU 软限制（0-100%）
  max_cpu: 80,

  // 进程优先级（-20 到 20）
  nice: -5,

  // 重启限制
  max_restarts: 10,        // 最多重启次数
  min_uptime: '10s',       // 最小运行时间
  restart_delay: 4000,     // 重启延迟（ms）

  // 自动杀死不健康进程
  autokill: true,
}
```

---

## 🚀 推荐的优化配置

### 生产环境配置模板

```javascript
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: 'dist/main.js',
      cwd: './backend/api-gateway',

      // ===== 高可用配置 =====
      instances: 'max',           // 使用所有 CPU 核心
      exec_mode: 'cluster',        // 集群模式
      autorestart: true,

      // ===== 资源限制 =====
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s',

      // ===== 优雅重启 =====
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,

      // ===== 健康检查 =====
      http: {
        port: 30000,
        path: '/health',
        expect_status: 200,
        interval: 30000,
      },

      // ===== 日志配置 =====
      error_file: './logs/api-gateway-error.log',
      out_file: './logs/api-gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // ===== 环境变量 =====
      env_production: {
        NODE_ENV: 'production',
        PORT: 30000,
        LOG_LEVEL: 'info',
      },
    },

    // user-service 配置
    {
      name: 'user-service',
      script: 'dist/main.js',
      cwd: './backend/user-service',

      // 单实例模式（有状态服务）
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,

      max_memory_restart: '1G',

      // 健康检查
      http: {
        port: 30001,
        path: '/health',
        expect_status: 200,
        interval: 30000,
      },

      error_file: './logs/user-service-error.log',
      out_file: './logs/user-service-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      env_production: {
        NODE_ENV: 'production',
        PORT: 30001,
      },
    },
  ],
};
```

---

## 📋 PM2 常用命令

### 基础操作
```bash
# 启动所有服务
pm2 start ecosystem.config.js

# 启动特定服务
pm2 start ecosystem.config.js --only api-gateway

# 停止服务
pm2 stop api-gateway
pm2 stop all

# 重启服务
pm2 restart api-gateway
pm2 reload api-gateway  # 零停机重启（集群模式）

# 删除进程
pm2 delete api-gateway
pm2 delete all

# 查看状态
pm2 status
pm2 list
```

### 监控和日志
```bash
# 实时监控
pm2 monit

# 查看日志
pm2 logs
pm2 logs api-gateway
pm2 logs api-gateway --lines 100

# 清空日志
pm2 flush

# 查看详细信息
pm2 show api-gateway
pm2 describe api-gateway
```

### 高级操作
```bash
# 保存当前进程列表
pm2 save

# 开机自启动
pm2 startup
pm2 startup systemd

# 更新 PM2
pm2 update

# 重置重启计数
pm2 reset api-gateway

# 扩展实例
pm2 scale api-gateway 4

# 生成配置文件
pm2 ecosystem
```

---

## 🎯 实施建议

### 短期（立即实施）

1. **添加健康检查**
```javascript
http: {
  port: 30001,
  path: '/health',
  expect_status: 200,
  interval: 30000,
}
```

2. **设置日志轮转**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
```

3. **优化重启策略**
```javascript
max_restarts: 10,
min_uptime: '10s',
restart_delay: 4000,
```

### 中期（本周）

1. **api-gateway 启用集群模式**
```javascript
instances: process.env.NODE_ENV === 'production' ? 4 : 1,
exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
```

2. **NestJS 集成 PM2 信号**
```typescript
// main.ts
if (process.send) {
  process.send('ready');
}

process.on('SIGINT', async () => {
  await app.close();
  process.exit(0);
});
```

3. **配置多环境**
```javascript
env: { NODE_ENV: 'development' },
env_production: { NODE_ENV: 'production' },
env_staging: { NODE_ENV: 'staging' },
```

### 长期（本月）

1. **集成 PM2 Plus 监控**
2. **设置告警通知**
3. **优化资源使用**
4. **性能调优**

---

## 📊 对比：当前 vs 推荐配置

| 功能 | 当前配置 | 推荐配置 | 改进点 |
|------|---------|---------|--------|
| 进程模式 | 单实例 Fork | 集群模式（api-gateway） | 🟢 高可用 |
| 健康检查 | ❌ 无 | ✅ HTTP 检查 | 🟢 自动恢复 |
| 日志轮转 | ❌ 无 | ✅ PM2 Logrotate | 🟢 磁盘管理 |
| 监控 | ❌ 无 | ✅ PM2 Plus | 🟢 可观测性 |
| 优雅重启 | ⚠️ 部分 | ✅ 完整支持 | 🟢 零停机 |
| 环境管理 | ⚠️ 单环境 | ✅ 多环境 | 🟢 灵活性 |

---

## 🔗 参考资源

### 官方文档
- [PM2 官方文档](https://pm2.keymetrics.io/docs)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [PM2 Plus](https://pm2.io/)

### 内部文档
- [健康检查文档](./HEALTH_CHECK.md)
- [环境变量管理](./ENVIRONMENT_VARIABLES.md)

---

**文档维护者**: Claude Code
**最后更新**: 2025-10-22
**版本**: 1.0.0
