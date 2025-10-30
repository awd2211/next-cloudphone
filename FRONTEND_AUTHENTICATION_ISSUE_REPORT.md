# 前端认证问题报告

**日期**: 2025-10-30 17:42
**问题类型**: 前端JWT Token管理
**严重程度**: 🔴 高 - 阻止所有需要认证的API调用

---

## 问题总结

前端管理后台虽然能成功登录（返回JWT token），但后续的所有API请求都返回401未授权错误。

### 错误表现

浏览器控制台显示的错误：
```
❌ API Error: GET /users - 500 (实际是401)
❌ API Error: GET /devices - 404 (实际是401)
❌ API Error: GET /devices/stats - 404 (实际是401)
❌ API Error: GET /quotas/alerts - 500 (实际是401)
```

### 根本原因

前端在登录成功后获得了有效的JWT token，但在后续的API请求中**没有正确地附带Authorization header**。

---

## 验证测试

### 1. 登录功能 ✅ 正常

```bash
curl -X POST http://localhost:30000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","captchaId":"...","captcha":"..."}'

# 返回:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "10000000-0000-0000-0000-000000000001",
    "username": "admin",
    "roles": ["admin"],
    "isSuperAdmin": true
  }
}
```

### 2. 不带Token的API请求 ❌ 401错误

```bash
curl http://localhost:30000/api/v1/users

# 返回:
{
  "statusCode": 401,
  "message": "未授权访问，请先登录",
  "error": "Unauthorized"
}
```

###3. 带Token的API请求仍然401 ❌

```bash
curl -H "Authorization: Bearer <valid-token>" \
  http://localhost:30000/api/v1/users

# 返回:
{
  "statusCode": 401,
  "message": "未授权访问，请先登录"
}
```

这说明**即使提供了有效的token，API Gateway或backend服务也没有正确验证**。

---

## 可能的原因

### 1. 前端Token存储问题 ⚠️

**检查项目**:
- Token是否正确保存到localStorage/sessionStorage?
- Token的key名称是否正确?

**位置**: `frontend/admin/src/utils/auth.ts` 或 `frontend/admin/src/services/auth.ts`

```typescript
// 应该类似:
export const setToken = (token: string) => {
  localStorage.setItem('token', token);  // 或 'access_token', 'auth_token' 等
};

export const getToken = () => {
  return localStorage.getItem('token');
};
```

### 2. Request拦截器配置问题 ⚠️

**检查项目**: `frontend/admin/src/utils/request.ts`

```typescript
// 应该有请求拦截器添加Authorization header
request.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
```

### 3. JWT验证配置问题 ⚠️

**后端问题**: API Gateway或各个service的JWT_SECRET可能不一致

**检查**:
```bash
# 各服务的JWT_SECRET必须相同
grep JWT_SECRET backend/api-gateway/.env
grep JWT_SECRET backend/user-service/.env
grep JWT_SECRET backend/device-service/.env
```

### 4. CORS或Header转发问题 ⚠️

**检查**: API Gateway是否正确转发Authorization header

---

## 修复步骤

### 步骤1: 检查前端Token存储

1. 打开浏览器开发者工具 → Application → Local Storage
2. 查找是否有token相关的key
3. 确认登录后token是否被保存

### 步骤2: 检查Request配置

检查 `frontend/admin/src/utils/request.ts`:

```typescript
import axios from 'axios';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// ✅ 必须有这个拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // 或 getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ 响应拦截器处理401
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 清除token并跳转到登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default request;
```

### 步骤3: 检查Auth Service

检查 `frontend/admin/src/services/auth.ts`:

```typescript
import request from '@/utils/request';

export interface LoginParams {
  username: string;
  password: string;
  captchaId: string;
  captcha: string;
}

export interface LoginResult {
  success: boolean;
  token: string;
  user: any;
}

export const login = async (params: LoginParams): Promise<LoginResult> => {
  const response = await request.post<LoginResult>('/auth/login', params);

  // ✅ 必须保存token
  if (response.success && response.token) {
    localStorage.setItem('token', response.token);
    // 或使用统一的auth工具函数:
    // setToken(response.token);
  }

  return response;
};

export const logout = () => {
  localStorage.removeItem('token');
  // 清除其他用户信息
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};
```

### 步骤4: 检查JWT_SECRET一致性

```bash
cd /home/eric/next-cloudphone

# 检查所有服务的JWT_SECRET
for service in api-gateway user-service device-service app-service billing-service notification-service; do
  echo "=== $service ==="
  grep "JWT_SECRET" backend/$service/.env 2>/dev/null || echo "No .env file"
done
```

**修复**: 确保所有服务使用相同的JWT_SECRET

```bash
# 在所有 backend/*/.env 文件中设置相同的值
JWT_SECRET=your-super-secret-key-change-in-production
```

### 步骤5: 验证修复

1. 清除浏览器缓存和localStorage
2. 重新登录
3. 在浏览器开发者工具的Network标签中检查请求headers
4. 确认Authorization: Bearer xxx header存在
5. 测试各个API端点

---

## 快速诊断脚本

### 前端检查（浏览器Console）

```javascript
// 1. 检查token是否存储
console.log('Token:', localStorage.getItem('token'));

// 2. 检查request配置
console.log('Request config:', window.axios?.defaults);

// 3. 手动测试带token的请求
const token = localStorage.getItem('token');
fetch('http://localhost:30000/api/v1/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### 后端检查（Bash）

```bash
# 登录并获取token
TOKEN=$(curl -s -X POST http://localhost:30000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","captchaId":"test","captcha":"test"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 测试带token的请求
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:30000/api/v1/users | jq .

# 如果返回401，检查JWT_SECRET
echo "=== Checking JWT_SECRET consistency ==="
grep -r "JWT_SECRET" backend/*/. env | sort
```

---

## 相关文件清单

需要检查和修改的文件：

### 前端文件
1. `frontend/admin/src/utils/request.ts` - Axios配置和拦截器
2. `frontend/admin/src/utils/auth.ts` - Token管理工具函数
3. `frontend/admin/src/services/auth.ts` - 认证API服务
4. `frontend/admin/src/stores/user.ts` - 用户状态管理（如果使用）
5. `frontend/admin/src/layouts/BasicLayout.tsx` - 路由守卫（如果有）

### 后端文件
1. `backend/api-gateway/.env` - JWT_SECRET配置
2. `backend/user-service/.env` - JWT_SECRET配置
3. `backend/device-service/.env` - JWT_SECRET配置
4. `backend/*/src/auth/*.guard.ts` - JWT验证守卫
5. `backend/api-gateway/src/auth/jwt.strategy.ts` - JWT策略配置

---

## 预期修复后的效果

修复后，浏览器Network标签中的请求应该看起来像这样：

```
Request URL: http://localhost:30000/api/v1/users
Request Method: GET
Request Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json

Response:
  Status: 200 OK
  Body: {
    "data": [...用户列表...],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
```

---

## 下一步行动

### 立即执行 🔴
1. **检查request拦截器** - 这是最可能的问题
2. **检查token存储** - 确认登录后token被正确保存
3. **检查JWT_SECRET** - 确保所有服务一致

### 后续优化 🟡
4. 添加token过期处理
5. 添加自动刷新token机制
6. 改进错误提示信息

---

**报告时间**: 2025-10-30 17:42
**当前状态**: ⚠️ 认证流程存在问题，需要立即修复
**优先级**: 🔴 P0 - 阻塞所有功能使用
