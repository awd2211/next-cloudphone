# API Gateway 路由配置分析

**总路由数**: 3

## Gateway 路由映射

前端请求路径 → API Gateway → 微服务

### 路由表

| 路由模式 | 目标服务 |
|----------|----------|
| `auth` | **users** |
| `auth/*` | **users** |
| `data-scopes/meta/*` | **users** |

---

## 按服务分组

### user-service (用户服务)

**路由数量**: 3

- `auth`
- `auth/*`
- `data-scopes/meta/*`

---

## 路由覆盖范围

**已配置的基础路径**: 2 个

- ✅ `/auth/*` - 认证相关
- ✅ `/data-scopes/*`
