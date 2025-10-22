# 📝 日志管理系统说明

## 🏗️ 当前架构

### **核心技术栈**
- **Pino** - 高性能 JSON 日志库
- **nestjs-pino** - NestJS 集成
- **pino-pretty** - 开发环境美化输出
- **PM2** - 进程管理和日志收集

---

## 📊 日志配置详情

### **1. 统一配置函数**
位置: `backend/shared/src/config/logger.config.ts`

```typescript
createLoggerConfig(serviceName: string)
```

**所有服务使用统一配置**:
- ✅ API Gateway
- ✅ User Service  
- ✅ Device Service
- ✅ App Service
- ✅ Billing Service
- ✅ Notification Service

---

### **2. 日志级别**

#### 开发环境
```
DEBUG → INFO → WARN → ERROR
默认: debug (显示所有日志)
```

#### 生产环境
```
INFO → WARN → ERROR
默认: info (只显示重要日志)
```

**配置方式**:
```bash
# 环境变量
LOG_LEVEL=debug    # 开发环境
LOG_LEVEL=info     # 生产环境
LOG_LEVEL=warn     # 只看警告和错误
```

---

### **3. 日志格式**

#### 开发环境（pino-pretty）
```
2025-10-22 15:00:00.123 [api-gateway] [DevicesService] 创建设备: device-123
2025-10-22 15:00:01.456 [user-service] [AuthService] 用户登录成功: admin
```

**特点**:
- ✅ 彩色输出
- ✅ 时间戳可读
- ✅ 服务名标识
- ✅ 上下文信息

#### 生产环境（JSON）
```json
{
  "level": "info",
  "time": "2025-10-22T15:00:00.123Z",
  "service": "api-gateway",
  "context": "DevicesService",
  "msg": "创建设备: device-123",
  "requestId": "req_1761145590350_7",
  "userId": "8b2e6c37-2403-494b-a0cf-8771ea1d73c4",
  "environment": "production",
  "version": "1.0.0"
}
```

**特点**:
- ✅ 结构化数据
- ✅ 易于解析和查询
- ✅ 支持日志聚合工具

---

### **4. 自动记录的信息**

#### HTTP 请求日志
```json
{
  "request": {
    "id": "uuid",
    "method": "POST",
    "url": "/api/devices",
    "query": {...},
    "params": {...},
    "headers": {
      "authorization": "Bearer ***",  // 自动脱敏
      "content-type": "application/json"
    },
    "remoteAddress": "192.168.1.100"
  },
  "response": {
    "statusCode": 200,
    "headers": {...}
  },
  "duration": 150,  // 响应时间 (ms)
  "userId": "xxx",
  "tenantId": "xxx"
}
```

---

### **5. 敏感数据脱敏**

**自动脱敏的字段**:
- password
- token / accessToken / refreshToken
- secret / apiKey
- authorization
- cookie
- creditCard / ssn
- privateKey

**脱敏方式**:
```
password: "admin123" → "adm***"
token: "eyJhbGc..." → "eyJ***"
```

---

### **6. 日志存储**

#### PM2 日志文件
```
logs/
├── api-gateway-out.log      # 标准输出
├── api-gateway-error.log    # 错误输出
├── user-service-out.log
├── user-service-error.log
├── device-service-out.log
├── device-service-error.log
└── ...
```

**配置**:
```javascript
// ecosystem.config.js
{
  error_file: './logs/api-gateway-error.log',
  out_file: './logs/api-gateway-out.log',
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true
}
```

---

## 🔍 日志查询

### **1. PM2 实时日志**

```bash
# 查看所有服务日志
pm2 logs

# 查看特定服务
pm2 logs api-gateway

# 实时跟踪
pm2 logs --lines 100

# 只看错误
pm2 logs --err

# 按时间过滤
pm2 logs --timestamp
```

---

### **2. 文件日志查询**

```bash
# 查看最新日志
tail -f logs/api-gateway-out.log

# 搜索错误
grep "ERROR" logs/*.log

# 统计错误数量
grep -c "ERROR" logs/user-service-error.log

# 按时间范围查询
grep "2025-10-22 15:" logs/api-gateway-out.log
```

---

### **3. JSON 日志查询（生产环境）**

```bash
# 使用 jq 解析
cat logs/api-gateway-out.log | jq 'select(.level == "error")'

# 查询特定用户的操作
cat logs/*.log | jq 'select(.userId == "xxx")'

# 统计慢请求
cat logs/*.log | jq 'select(.duration > 1000)'
```

---

## 📈 日志监控

### **当前支持的监控**

#### 1. PM2 基础监控
```bash
pm2 monit           # 实时监控
pm2 describe <app>  # 详细信息
```

#### 2. Prometheus + Grafana
```
位置: infrastructure/monitoring/
```
- ✅ 系统指标
- ✅ 业务指标
- ✅ 自定义告警

---

## 🎯 日志最佳实践

### **代码中使用 Logger**

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  async createDevice() {
    // ✅ 正确方式
    this.logger.log('创建设备开始');
    this.logger.debug('详细参数', { userId, config });
    this.logger.warn('资源不足警告', { available, required });
    this.logger.error('创建失败', error.stack);
    
    // ❌ 错误方式
    console.log('创建设备');  // 不推荐
  }
}
```

---

### **日志级别选择**

| 级别 | 使用场景 | 示例 |
|------|----------|------|
| **DEBUG** | 详细调试信息 | `参数: {userId: xxx, config: {...}}` |
| **INFO** | 一般信息 | `用户登录成功: admin` |
| **WARN** | 警告但不影响运行 | `Redis 连接超时，使用降级方案` |
| **ERROR** | 错误需要关注 | `创建设备失败: 端口分配错误` |

---

### **结构化日志**

```typescript
// ✅ 好的日志
this.logger.log('创建设备成功', {
  deviceId: device.id,
  userId: user.id,
  config: { cpu: 4, memory: 8192 },
  duration: 2500
});

// ❌ 不好的日志
this.logger.log(`创建设备 ${device.id} 成功 用户 ${user.id}`);
```

---

## 🔧 优化建议

### **立即可做**

#### 1. 清理 console.log (已发现 153 处)
```bash
# 替换脚本
cd backend
find . -name "*.ts" -type f -not -path "*/node_modules/*" | while read file; do
  sed -i 's/console\.log(/\/\/ TODO: Replace with logger - console.log(/g' "$file"
  sed -i 's/console\.error(/\/\/ TODO: Replace with logger - console.error(/g' "$file"
  sed -i 's/console\.warn(/\/\/ TODO: Replace with logger - console.warn(/g' "$file"
done
```

#### 2. 添加日志轮转
```javascript
// PM2 配置
{
  max_size: '100M',           // 单文件最大 100MB
  max_files: 10,              // 保留 10 个文件
  compress: true,             // 压缩旧日志
  rotate_interval: '1d'       // 每天轮转
}
```

#### 3. 日志持久化到数据库
```typescript
// 将重要日志写入数据库
@Injectable()
export class DatabaseLogger {
  async logImportantEvent(event: LogEvent) {
    await this.logRepository.save({
      level: event.level,
      message: event.message,
      context: event.context,
      timestamp: new Date(),
      userId: event.userId,
      service: event.service
    });
  }
}
```

---

### **推荐升级**

#### 选项 1: 使用 ELK Stack
```
Elasticsearch: 日志存储和查询
Logstash: 日志收集和处理
Kibana: 可视化界面
```

**优势**:
- 🎯 强大的全文搜索
- 🎯 可视化分析
- 🎯 告警规则

#### 选项 2: 使用 Loki (轻量级)
```
Loki: 日志聚合
Grafana: 可视化（已有）
Promtail: 日志采集
```

**优势**:
- 🎯 与 Grafana 原生集成
- 🎯 资源占用少
- 🎯 学习成本低

#### 选项 3: 云服务
```
- 阿里云 SLS
- 腾讯云 CLS
- AWS CloudWatch
```

---

## 📊 当前日志使用情况

### **Pino 特点**
✅ **高性能** - 比 Winston 快 5-10x
✅ **低开销** - 异步写入，不阻塞主线程
✅ **结构化** - JSON 格式，易于解析
✅ **可扩展** - 支持自定义序列化器
✅ **类型安全** - TypeScript 支持良好

### **已实现的功能**
- ✅ 自动记录 HTTP 请求/响应
- ✅ 敏感数据自动脱敏
- ✅ 分布式追踪（RequestID）
- ✅ 上下文信息（用户、租户）
- ✅ 健康检查端点过滤
- ✅ 错误堆栈记录（开发环境）
- ✅ 响应时间记录

### **配置的日志采样**
```typescript
// 高流量时减少日志量
LOG_SAMPLING=true   // 生产环境启用
采样率: 10% (可配置)
```

---

## 🎯 日志查询示例

### **场景 1: 查找用户的所有操作**
```bash
# 开发环境
pm2 logs user-service | grep "userId.*8b2e6c37"

# 生产环境（JSON）
cat logs/user-service-out.log | jq 'select(.userId == "8b2e6c37-2403-494b-a0cf-8771ea1d73c4")'
```

### **场景 2: 查找慢请求**
```bash
# 找出响应时间 > 1秒的请求
cat logs/*.log | jq 'select(.duration > 1000)'
```

### **场景 3: 错误追踪**
```bash
# 按 requestId 追踪完整请求链路
grep "req_1761145590350_7" logs/*.log
```

### **场景 4: 统计分析**
```bash
# 统计各服务的错误数
for service in api-gateway user-service device-service; do
  echo "$service: $(grep -c '"level":"error"' logs/${service}-out.log 2>/dev/null || echo 0)"
done
```

---

## 🚀 优化建议

### **短期优化（立即可做）**

#### 1. 清理 console.log (153处)
```bash
优先级: 🔥🔥🔥
耗时: 30分钟
收益: 统一日志、性能提升
```

#### 2. 配置日志轮转
```javascript
// PM2 配置
log_rotate_interval: '1d',
log_max_size: '100M',
log_max_files: 10
```

#### 3. 添加重要业务日志
```typescript
// 用户操作日志
this.logger.log('设备创建', { deviceId, userId, config });

// 计费日志
this.logger.log('开始计费', { userId, amount, period });
```

---

### **中期优化（本月内）**

#### 4. 集成 Loki + Grafana
```yaml
# docker-compose.yml
loki:
  image: grafana/loki:latest
  ports:
    - 3100:3100

promtail:
  image: grafana/promtail:latest
  volumes:
    - ./logs:/logs
    - ./promtail-config.yml:/etc/promtail/config.yml
```

**收益**:
- 🎯 统一查询所有服务日志
- 🎯 可视化分析
- 🎯 告警规则

#### 5. 添加日志告警
```yaml
# Grafana Alert
- alert: HighErrorRate
  expr: |
    sum(rate({service="api-gateway"} |= "error" [5m])) > 10
  annotations:
    summary: API Gateway 错误率过高
```

---

### **长期优化**

#### 6. 分布式追踪增强
```typescript
// OpenTelemetry 集成
import { trace } from '@opentelemetry/api';

const span = trace.getTracer('device-service')
  .startSpan('createDevice');
  
// ... 业务逻辑

span.end();
```

#### 7. 日志分析平台
- ELK Stack (功能最强)
- Loki + Grafana (推荐，轻量)
- 云服务 (简单易用)

---

## 📋 日志管理命令

### **PM2 日志管理**

```bash
# 查看所有日志
pm2 logs

# 查看特定服务（实时）
pm2 logs api-gateway

# 查看最近 N 行
pm2 logs --lines 100

# 只看错误
pm2 logs --err

# 清空日志
pm2 flush

# 重载日志（不重启服务）
pm2 reloadLogs
```

---

### **日志文件管理**

```bash
# 查看日志大小
du -sh logs/*.log

# 压缩旧日志
gzip logs/*.log.old

# 清理旧日志（保留最近7天）
find logs/ -name "*.log" -mtime +7 -delete

# 归档日志
tar -czf logs-$(date +%Y%m%d).tar.gz logs/*.log
```

---

## 🎨 日志可视化

### **当前方案: PM2 + 文件**

```bash
# 实时监控
pm2 monit

# 查看日志流
pm2 logs --timestamp
```

### **推荐方案: Grafana + Loki**

**优势**:
- ✅ 统一界面（与 Prometheus 监控整合）
- ✅ 强大查询（LogQL）
- ✅ 告警集成
- ✅ 免费开源

**示例查询**:
```logql
# 查询错误日志
{service="api-gateway"} |= "error"

# 查询慢请求
{service="api-gateway"} | json | duration > 1000

# 按用户过滤
{service="user-service"} | json | userId="xxx"
```

---

## 🔒 安全和合规

### **隐私保护**
✅ 敏感字段自动脱敏
✅ 用户数据不记录到日志
✅ 生产环境不记录请求体

### **审计日志**
✅ 独立的审计日志表（数据库）
✅ 不可修改
✅ 长期保留

### **GDPR 合规**
✅ 支持用户数据删除
✅ 日志数据脱敏
✅ 数据保留策略

---

## 💡 推荐配置

### **开发环境**
```bash
LOG_LEVEL=debug
NODE_ENV=development
# Pino Pretty 彩色输出
```

### **生产环境**
```bash
LOG_LEVEL=info
NODE_ENV=production
LOG_SAMPLING=true
# JSON 格式输出
# 日志聚合到 Loki/ELK
```

---

## 📊 性能数据

### **Pino vs 其他日志库**

| 日志库 | 性能 (ops/sec) | 内存 | 推荐度 |
|--------|----------------|------|--------|
| **Pino** | ~54,000 | 低 | ⭐⭐⭐⭐⭐ |
| Winston | ~10,000 | 中 | ⭐⭐⭐ |
| Bunyan | ~12,000 | 中 | ⭐⭐⭐ |
| Log4js | ~8,000 | 高 | ⭐⭐ |

**你们选择 Pino 是正确的！** ✅

---

## 🎯 立即可做的优化

### **1. 清理 console.log** 🔥🔥🔥
```bash
耗时: 30分钟
收益: 统一管理、支持级别控制
```

### **2. 配置日志轮转** 🔥🔥
```bash
耗时: 10分钟
收益: 防止磁盘占满
```

### **3. 添加 Loki 集成** 🔥🔥
```bash
耗时: 2小时
收益: 可视化查询、告警
```

---

**需要我帮你实施哪些日志优化？** 🚀

