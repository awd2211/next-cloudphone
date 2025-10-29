# 云手机平台

一个基于微服务架构的企业级云手机管理平台，支持大规模部署、多租户隔离、高可用架构。

## 项目概述

云手机平台提供了完整的云端安卓设备管理解决方案，包括：

- 🎮 **远程控制** - 基于 WebRTC 的低延迟实时控制
- 📱 **设备管理** - 云手机实例的创建、分配、监控
- 📦 **应用管理** - APK 上传、安装、卸载、应用市场
- 👥 **用户系统** - 完整的认证授权、多租户支持
- 💰 **计费系统** - 灵活的计量计费模型
- 📊 **监控运维** - 完善的监控告警体系

## 技术架构

### 前端
- **管理后台**: React 18 + TypeScript + Ant Design Pro
- **用户端**: React 18 + TypeScript + Ant Design
- **构建工具**: Vite

### 后端微服务
| 服务 | 技术栈 | 端口 | 说明 |
|------|--------|------|------|
| API网关 | NestJS + TypeScript | 3000 | 统一入口、认证、限流 |
| 用户服务 | NestJS + TypeORM | 3001 | 用户管理、认证授权 |
| 设备服务 | NestJS + TypeORM | 3002 | 云手机实例管理 |
| 应用服务 | NestJS + TypeORM | 3003 | APK管理、安装卸载 |
| 流媒体服务 | Go + Gin | 3004 | WebRTC音视频流 |
| 调度服务 | Python + FastAPI | 3005 | 资源调度、任务编排 |
| 计费服务 | NestJS + TypeORM | 3006 | 计量计费、订单管理 |

### 基础设施
- **数据库**: PostgreSQL 14
- **缓存**: Redis 7
- **消息队列**: RabbitMQ 3
- **对象存储**: MinIO
- **容器编排**: Kubernetes
- **监控**: Prometheus + Grafana

## 快速开始

### 前置要求

- Node.js 18+
- Python 3.9+
- Go 1.21+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 7+

### 本地开发环境

#### 1. 启动基础设施

```bash
# 启动 PostgreSQL, Redis, RabbitMQ, MinIO
docker-compose up -d
```

#### 2. 启动后端服务

**API 网关**
```bash
cd backend/api-gateway
pnpm install
pnpm dev
```

**流媒体服务 (Go)**
```bash
cd backend/media-service
go mod download
go run main.go
```

**调度服务 (Python)**
```bash
cd backend/scheduler-service
source venv/bin/activate  # 或 Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

#### 3. 启动前端

**管理后台**
```bash
cd frontend/admin
pnpm install
pnpm dev
# 访问 http://localhost:3001
```

**用户端**
```bash
cd frontend/user
pnpm install
pnpm dev
# 访问 http://localhost:3002
```

## 项目结构

```
next-cloudphone/
├── frontend/                 # 前端项目
│   ├── admin/               # 管理后台 (React + Ant Design Pro)
│   └── user/                # 用户端 (React + Ant Design)
├── backend/                  # 后端微服务
│   ├── api-gateway/         # API网关 (NestJS)
│   ├── user-service/        # 用户服务 (NestJS)
│   ├── device-service/      # 设备服务 (NestJS)
│   ├── app-service/         # 应用服务 (NestJS)
│   ├── media-service/       # 流媒体服务 (Go)
│   ├── scheduler-service/   # 调度服务 (Python)
│   └── billing-service/     # 计费服务 (NestJS)
├── infrastructure/           # 基础设施配置
│   ├── k8s/                 # Kubernetes 部署文件
│   │   ├── deployments/     # Deployment 配置
│   │   ├── services/        # Service 配置
│   │   ├── ingress/         # Ingress 配置
│   │   └── configmaps/      # ConfigMap 配置
│   ├── docker/              # Dockerfile
│   ├── helm/                # Helm charts
│   └── terraform/           # 基础设施即代码
├── scripts/                  # 工具脚本
├── docs/                     # 文档
└── docker-compose.yml        # 本地开发环境
```

## 核心功能

### 1. 用户认证与授权
- JWT 令牌认证
- 角色权限管理 (RBAC)
- 多租户数据隔离

### 2. 云手机设备管理
- 设备生命周期管理
- 实时状态监控
- 资源调度与分配
- 弹性伸缩

### 3. 远程控制
- WebRTC 低延迟视频流
- 触摸/键盘/传感器模拟
- 文件传输
- 录屏功能

### 4. 应用管理
- APK 上传与存储
- 应用安装/卸载
- 应用市场
- 版本管理

### 5. 计费系统
- 按时长计费
- 按资源计费
- 套餐管理
- 账单报表

## 部署

### Kubernetes 部署

```bash
# 创建命名空间
kubectl create namespace cloudphone

# 部署 ConfigMap
kubectl apply -f infrastructure/k8s/configmaps/

# 部署服务
kubectl apply -f infrastructure/k8s/deployments/
kubectl apply -f infrastructure/k8s/services/
kubectl apply -f infrastructure/k8s/ingress/
```

### Docker 部署

```bash
# 构建镜像
docker build -t cloudphone/api-gateway:latest backend/api-gateway/

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

## 环境变量

主要环境变量配置：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | development |
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 5432 |
| REDIS_HOST | Redis 主机 | localhost |
| JWT_SECRET | JWT 密钥 | 需设置 |

详细配置参考各服务的 `.env` 文件。

## 监控与运维

### 健康检查

所有服务提供 `/health` 端点：

```bash
# API 网关
curl http://localhost:3000/api/health

# 流媒体服务
curl http://localhost:3004/health

# 调度服务
curl http://localhost:3005/health
```

### 日志查看

```bash
# Docker Compose
docker-compose logs -f api-gateway

# Kubernetes
kubectl logs -f deployment/api-gateway -n cloudphone
```

## 开发路线图

### 阶段一：基础框架 (当前)
- [x] 项目初始化
- [x] 前端脚手架
- [x] 后端微服务框架
- [x] 基础认证系统
- [x] Docker & K8s 配置

### 阶段二：核心功能
- [ ] Redroid 集成
- [ ] WebRTC 音视频流
- [ ] 应用管理完整实现
- [ ] 设备调度算法
- [ ] 用户权限系统

### 阶段三：企业级特性
- [ ] 高可用部署
- [ ] 监控告警系统
- [ ] 计费系统
- [x] **性能优化** ✅ (Phase 2 已完成)
  - [x] React Query 状态管理
  - [x] 组件懒加载
  - [x] useMemo/useCallback 优化
  - [x] Bundle 优化 (减少 ~800KB)
- [ ] 私有化部署方案

### 阶段四：高级功能
- [ ] 群控功能
- [ ] 自动化脚本
- [ ] AI 功能集成
- [ ] 数据分析报表

## 性能优化 ⚡

### Phase 2 优化完成 (2025-10-29) ✅

前端性能已全面优化，实现显著提升：

#### 🎯 优化成果

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 网络请求 | 基准 | -50~80% | 自动去重和缓存 |
| 状态管理代码 | 60+ 行 | 10 行 | -83% |
| 渲染性能 | 基准 | +30~40% | Memoization |
| 首屏Bundle | 3.4 MB | 2.6 MB | -800KB |

#### 🔧 优化技术

1. **React Query** - 智能状态管理
   - 自动请求去重和缓存
   - 乐观更新提升响应速度
   - 后台自动刷新数据
   - WebSocket 与缓存集成

2. **组件懒加载** - 按需加载
   - WebRTCPlayer (3.75 kB chunk)
   - ADBConsole (3.60 kB chunk)
   - Charts (897.38 kB - 仅在需要时加载)

3. **性能优化** - 减少重渲染
   - useMemo 优化计算密集型操作
   - useCallback 优化函数引用
   - 代码量减少 40-50%

#### 📚 文档

- [性能优化完整指南](./PHASE2_OPTIMIZATION_GUIDE.md) - 详细使用文档
- [快速参考卡片](./PERFORMANCE_QUICK_REFERENCE.md) - 速查手册
- [进度报告](./PHASE2_PROGRESS_REPORT.md) - 完整优化报告
- [优化对比](./DEVICE_LIST_OPTIMIZATION_COMPARISON.md) - Before/After 对比

#### 🚀 快速开始

```typescript
// 1. 使用 React Query hooks
import { useDevices, useCreateDevice } from '@/hooks/useDevices';

const { data, isLoading } = useDevices({ page: 1 });
const createMutation = useCreateDevice();

// 2. 使用懒加载组件
import { WebRTCPlayerLazy, ADBConsoleLazy } from '@/components/LazyComponents';

<WebRTCPlayerLazy deviceId={deviceId} />
<ADBConsoleLazy deviceId={deviceId} />

// 3. 使用 memoization
const columns = useMemo(() => [...], []);
const handleClick = useCallback(() => {...}, []);
```

---

## 贡献指南

欢迎贡献代码、报告问题或提出建议。

## 许可证

MIT License

## 联系方式

- 项目地址: [GitHub](https://github.com/your-org/next-cloudphone)
- 问题反馈: [Issues](https://github.com/your-org/next-cloudphone/issues)
