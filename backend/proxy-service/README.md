# Proxy Service

> 企业级代理管理服务 - 云手机平台核心组件

## 概述

Proxy Service 是云手机平台的核心微服务，负责管理和分配来自多个供应商（IPRoyal、Bright Data、Oxylabs）的代理IP资源。

### 核心功能

- ✅ **多供应商支持** - 集成3家主流代理提供商
- ✅ **智能代理池** - 1000-5000代理自动管理
- ✅ **地理定位** - 国家/城市级IP筛选
- ✅ **健康监控** - 自动检测和移除失效代理
- ✅ **故障转移** - 自动切换供应商
- ✅ **成本控制** - 实时成本跟踪和优化
- ✅ **高可用** - Cluster模式，99.9%可用性

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- Redis >= 7.0
- pnpm >= 8.0

### 安装

```bash
# 1. 安装依赖
cd backend/proxy-service
pnpm install

# 2. 创建数据库
createdb cloudphone_proxy

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必要的配置

# 4. 启动开发服务器
pnpm start:dev
```

### 验证

```bash
# 健康检查
curl http://localhost:30007/health

# API文档
open http://localhost:30007/api-docs
```

## 项目结构

```
src/
├── adapters/           # 供应商适配器
│   ├── base/          # 基础适配器
│   ├── iproyal/       # IPRoyal适配器
│   ├── brightdata/    # Bright Data适配器
│   └── oxylabs/       # Oxylabs适配器
├── pool/              # 代理池管理
│   ├── pool-manager.service.ts     # 池管理器
│   ├── health-monitor.service.ts   # 健康监控
│   └── failover-handler.service.ts # 故障转移
├── proxy/             # 代理业务逻辑
│   ├── controllers/   # REST API控制器
│   ├── services/      # 业务服务
│   └── dto/           # 数据传输对象
├── statistics/        # 统计分析
├── monitoring/        # 监控告警
├── entities/          # 数据库实体
├── common/            # 通用工具
│   ├── interfaces/    # 接口定义
│   ├── decorators/    # 装饰器
│   └── guards/        # 守卫
├── app.module.ts      # 应用主模块
└── main.ts            # 入口文件
```

## API 文档

### 获取代理

**POST** `/proxy/acquire`

请求体：
```json
{
  "country": "US",
  "city": "New York",
  "protocol": "http",
  "minQuality": 70
}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "proxy-123",
    "host": "proxy.example.com",
    "port": 22225,
    "username": "user",
    "password": "pass",
    "protocol": "http",
    "location": {
      "country": "US",
      "city": "New York"
    },
    "quality": 85,
    "provider": "brightdata"
  }
}
```

### 释放代理

**POST** `/proxy/release/:proxyId`

响应：
```json
{
  "success": true,
  "message": "Proxy released successfully"
}
```

### 获取统计

**GET** `/proxy/stats`

响应：
```json
{
  "total": 2000,
  "inUse": 500,
  "available": 1500,
  "providerBreakdown": {
    "brightdata": 800,
    "oxylabs": 700,
    "iproyal": 500
  },
  "averageQuality": 82
}
```

完整API文档: http://localhost:30007/api-docs

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 30007 |
| DB_HOST | 数据库地址 | localhost |
| DB_DATABASE | 数据库名称 | cloudphone_proxy |
| REDIS_HOST | Redis地址 | localhost |
| POOL_MIN_SIZE | 最小代理池大小 | 1000 |
| POOL_MAX_SIZE | 最大代理池大小 | 5000 |
| MONTHLY_BUDGET | 月度预算（USD） | 3000 |

### 供应商配置

需要在 `.env` 中配置三个供应商的认证信息：

```bash
# IPRoyal
IPROYAL_USERNAME=your_username
IPROYAL_PASSWORD=your_password

# Bright Data
BRIGHTDATA_API_KEY=your_api_key
BRIGHTDATA_USERNAME=your_username
BRIGHTDATA_PASSWORD=your_password

# Oxylabs
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
```

## 开发指南

### 添加新的供应商

1. 创建适配器类继承 `BaseProxyAdapter`
2. 实现 `initialize()` 和 `getProxyList()` 方法
3. 在 `AdaptersModule` 中注册
4. 更新配置文件

示例：
```typescript
@Injectable()
export class NewProviderAdapter extends BaseProxyAdapter {
  constructor() {
    super('NewProvider');
  }

  async initialize(config: any): Promise<void> {
    // 初始化逻辑
  }

  async getProxyList(options?: GetProxyOptions): Promise<ProxyInfo[]> {
    // 获取代理列表
  }
}
```

### 运行测试

```bash
# 单元测试
pnpm test

# 测试覆盖率
pnpm test:cov

# E2E测试
pnpm test:e2e

# 监听模式
pnpm test:watch
```

**测试状态**: ✅ 248/248 通过 | **覆盖率**: 72.62%

### 测试文档

本项目包含完整的单元测试和详细的测试文档：

| 文档 | 说明 |
|------|------|
| [UNIT_TEST_REPORT.md](./UNIT_TEST_REPORT.md) | 详细测试报告（1000+行） - 测试用例、覆盖率、问题修复 |
| [TEST_COMPLETION_SUMMARY.md](./TEST_COMPLETION_SUMMARY.md) | 测试完成总结 - 成果对比、技术亮点、命令速查 |
| [POOLMANAGER_COVERAGE_IMPROVEMENT_GUIDE.md](./POOLMANAGER_COVERAGE_IMPROVEMENT_GUIDE.md) | PoolManager改进指南 - 未覆盖代码分析、示例代码 |
| [FINAL_WORK_SUMMARY.md](./FINAL_WORK_SUMMARY.md) | 最终工作总结 - 完整成果、学习收获、后续建议 |

**测试覆盖明细**:
- ProxyService: 97.43% ⭐
- IPRoyalAdapter: 97.82% ⭐
- BrightDataAdapter: 95.00% ⭐
- OxylabsAdapter: 95.28% ⭐
- BaseAdapter: 84.12% ✅
- PoolManager: 54.54% ⚠️

### 代码规范

```bash
# 格式化代码
pnpm format

# 检查代码
pnpm lint
```

## 部署

### PM2 部署

```bash
# 构建
pnpm build

# 使用PM2启动（cluster模式）
pm2 start ecosystem.config.js --only proxy-service

# 查看日志
pm2 logs proxy-service

# 查看状态
pm2 describe proxy-service
```

### Docker 部署

```bash
# 构建镜像
docker build -t cloudphone/proxy-service:latest .

# 运行容器
docker run -d \
  --name proxy-service \
  -p 30007:30007 \
  -e DB_HOST=postgres \
  -e REDIS_HOST=redis \
  cloudphone/proxy-service:latest
```

## 监控

### Prometheus指标

访问: http://localhost:30007/metrics

核心指标：
- `proxy_pool_size_total` - 代理池总大小
- `proxy_pool_available` - 可用代理数
- `proxy_acquisition_duration_seconds` - 获取代理延迟
- `proxy_cost_total_usd` - 总成本

### Grafana面板

导入Dashboard: `infrastructure/monitoring/grafana/dashboards/proxy-service.json`

## 故障排查

### 服务无法启动

1. 检查数据库连接：`psql -U postgres -d cloudphone_proxy`
2. 检查Redis连接：`redis-cli ping`
3. 查看日志：`pm2 logs proxy-service --lines 100`

### 代理获取失败

1. 检查供应商配置：`.env` 中的认证信息
2. 测试供应商API：使用Postman测试供应商API
3. 查看健康检查：`GET /proxy/health`

### 成本异常

1. 查看成本统计：`GET /statistics/cost`
2. 检查预算配置：`MONTHLY_BUDGET` 环境变量
3. 查看告警日志：`pm2 logs proxy-service | grep "budget"`

## 性能优化

### 代理池预热

```bash
# 启动时预加载代理池
curl -X POST http://localhost:30007/admin/pool/prefill
```

### 缓存优化

调整Redis TTL：
```typescript
// 在 app.module.ts 中
ttl: 600, // 10分钟（根据实际情况调整）
```

### 并发优化

调整数据库连接池：
```typescript
// 在 app.module.ts 中
poolSize: 20, // 根据并发量调整
```

## 贡献指南

1. Fork项目
2. 创建特性分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -am 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交Pull Request

## 许可证

UNLICENSED - 内部项目

## 联系方式

- 技术支持：tech@cloudphone.run
- 文档：/docs/PROXY_SERVICE_ENTERPRISE_IMPLEMENTATION.md
- Issue跟踪：GitHub Issues

---

**状态**: 开发中 | **版本**: 1.0.0 | **最后更新**: 2025-11-02
