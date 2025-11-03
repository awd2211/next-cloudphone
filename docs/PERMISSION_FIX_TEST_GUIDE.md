# 权限修复测试指南

## 快速验证 - 浏览器测试 (推荐)

### 1. 管理员登录用户前端测试

这是验证修复最直接的方式:

```bash
# 1. 确保前端正在运行
pm2 list | grep frontend-user

# 2. 打开浏览器访问用户前端
http://localhost:5174/login
```

**测试步骤**:
1. 使用管理员账户登录:
   - 用户名: `admin`
   - 密码: `admin123`
   - 输入验证码

2. **观察登录后的行为**:

   **修复前** (Bug):
   ```
   登录 → 进入主界面 → 1-2秒后自动跳转回登录页
   (控制台会显示 403 Forbidden 错误)
   ```

   **修复后** (正常):
   ```
   登录 → 进入主界面 → 停留在主界面
   可以正常浏览设备列表、应用市场等页面
   ```

3. **验证功能页面**:
   - ✅ 访问 "我的设备" (需要 `device:read` 权限)
   - ✅ 访问 "应用市场" (需要 `app:read` 权限)
   - ✅ 访问 "我的订单" (需要 `order:read` 权限)
   - ✅ 访问 "个人中心" (需要 `user:read` 权限)

### 2. 浏览器控制台测试

打开浏览器开发者工具 (F12),查看 Network 面板:

**修复前**:
```
GET /devices → 403 Forbidden
{
  "statusCode": 403,
  "message": "需要所有权限: device.read"
}
```

**修复后**:
```
GET /devices → 200 OK
{
  "data": [...设备列表...],
  "total": 10,
  "page": 1
}
```

## API 测试 (使用 curl)

### 方式 1: 使用浏览器中的 Token

1. 登录用户前端 (http://localhost:5174)
2. 打开浏览器开发者工具 → Application → Local Storage
3. 复制 `token` 的值
4. 使用该 token 测试 API:

```bash
# 替换 YOUR_TOKEN_HERE 为实际的 token
TOKEN="YOUR_TOKEN_HERE"

# 测试设备列表 (需要 device:read 权限)
curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/devices

# 测试用户列表 (需要 user:read 权限)
curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/users

# 测试角色列表 (需要 role:read 权限)
curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/roles
```

**预期结果**: 所有请求都应该返回 200 OK,而不是 403 Forbidden

### 方式 2: 使用测试脚本获取 Token

创建一个简单的登录脚本:

```bash
# 获取验证码
CAPTCHA=$(curl -s http://localhost:30001/auth/captcha)
CAPTCHA_ID=$(echo $CAPTCHA | jq -r '.id')
echo "验证码 ID: $CAPTCHA_ID"
echo "验证码 SVG: $(echo $CAPTCHA | jq -r '.svg' | grep -oP '(?<=text>)[^<]+')"

# 手动输入验证码并登录
read -p "请输入验证码: " CAPTCHA_TEXT

# 登录获取 token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:30000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\",\"captcha\":\"$CAPTCHA_TEXT\",\"captchaId\":\"$CAPTCHA_ID\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // .token // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "登录成功! Token: ${TOKEN:0:50}..."
  echo ""
  echo "测试权限接口:"

  echo "1. 设备列表:"
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:30000/devices | jq .

  echo ""
  echo "2. 用户列表:"
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:30000/users | jq .
else
  echo "登录失败: $LOGIN_RESPONSE"
fi
```

## 验证关键点

### ✅ 修复成功的标志

1. **管理员可以登录用户前端并停留**
   - 不会在登录后1-2秒内被自动登出
   - 可以正常浏览所有被授权的页面

2. **API 返回 200 而不是 403**
   - 所有需要权限的接口都返回正确数据
   - 没有 "需要所有权限: xxx" 的错误信息

3. **普通用户也能正常使用**
   - 创建测试用户并登录
   - 可以访问设备管理、订单等功能

### ❌ 仍然有问题的标志

1. **403 Forbidden 错误**
   ```json
   {
     "statusCode": 403,
     "message": "需要所有权限: device.read"
   }
   ```

2. **自动登出**
   - 登录后1-2秒内跳转回登录页
   - 浏览器控制台显示 "登录已过期,请重新登录"

3. **服务日志中的权限错误**
   ```bash
   pm2 logs device-service --lines 50 | grep "403\|Forbidden\|权限"
   ```

## 技术验证

### 检查权限守卫代码

确认所有权限守卫文件都包含格式标准化逻辑:

```bash
grep -A 5 "normalizePermission" backend/*/src/auth/guards/permissions.guard.ts

# 应该看到类似这样的代码:
# const normalizePermission = (perm: string) => perm.replace(/[:.]/g, ':');
# const normalizedUserPerms = userPermissions.map(normalizePermission);
# const normalizedRequiredPerms = requiredPermissions.map(normalizePermission);
```

### 检查服务版本

确认所有服务都已重新构建和重启:

```bash
# 检查服务运行时间
pm2 list

# 应该看到所有后端服务的 uptime 都是最近重启的 (几分钟内)
```

### 检查构建产物

```bash
# 检查权限守卫是否包含修复代码
cat backend/device-service/dist/auth/guards/permissions.guard.js | grep -A 3 "normalizePermission"

# 应该看到 ES5/ES6 编译后的代码,包含格式标准化逻辑
```

## 常见问题排查

### Q: 仍然返回 403 错误

**可能原因**:
1. 服务未重启 → 解决: `pm2 restart all`
2. 服务未重新构建 → 解决: 重新运行 `pnpm build`
3. 权限数据未初始化 → 解决: 运行权限初始化脚本

```bash
# 重新初始化权限数据
cd backend/user-service
pnpm exec ts-node src/scripts/init-permissions.ts
```

### Q: Token 无效

**可能原因**:
1. Token 已过期 → 解决: 重新登录获取新 token
2. JWT_SECRET 不一致 → 解决: 确认所有服务使用相同的 JWT_SECRET

```bash
# 检查各服务的 JWT_SECRET
for service in api-gateway user-service device-service; do
  echo "=== $service ==="
  grep JWT_SECRET backend/$service/.env
done
```

### Q: 用户权限为空

**检查用户权限**:

```bash
# 使用 token 查看当前用户权限
TOKEN="YOUR_TOKEN_HERE"
curl -H "Authorization: Bearer $TOKEN" http://localhost:30000/auth/me | jq .permissions
```

应该返回类似:
```json
{
  "permissions": [
    "device:create",
    "device:read",
    "device:update",
    "user:read",
    ...
  ]
}
```

如果权限为空,需要重新分配角色权限。

## 日志分析

### 查看权限检查日志

```bash
# Device Service
pm2 logs device-service --lines 100 | grep -i "permission\|forbidden"

# User Service
pm2 logs user-service --lines 100 | grep -i "permission\|forbidden"

# API Gateway
pm2 logs api-gateway --lines 100 | grep -i "permission\|forbidden"
```

### 正常日志示例

```
[NestWinston] Info    2025-11-02 17:20:15  GET /devices 200 45ms
[NestWinston] Debug   2025-11-02 17:20:15  User permissions: ['device:create', 'device:read', ...]
[NestWinston] Debug   2025-11-02 17:20:15  Required permissions: ['device:read']
[NestWinston] Debug   2025-11-02 17:20:15  Permission check passed ✅
```

### 错误日志示例 (修复前)

```
[NestWinston] Error   2025-11-02 17:15:30  GET /devices 403 12ms
[NestWinston] Debug   2025-11-02 17:15:30  User permissions: ['device:create', 'device:read', ...]
[NestWinston] Debug   2025-11-02 17:15:30  Required permissions: ['device.read']
[NestWinston] Error   2025-11-02 17:15:30  ForbiddenException: 需要所有权限: device.read
```

## 成功标准

当以下所有条件满足时,修复验证通过:

- [x] 管理员可以登录用户前端并正常使用
- [x] 普通用户可以访问被授权的功能页面
- [x] API 接口返回 200 而不是 403
- [x] 浏览器控制台没有权限错误
- [x] 服务日志显示权限检查通过
- [x] 权限守卫代码包含格式标准化逻辑
- [x] 所有服务已重新构建和重启

## 回滚方案

如果修复导致其他问题,可以快速回滚:

```bash
cd /home/eric/next-cloudphone

# 方式 1: Git 回滚
git stash  # 暂存修改
pm2 restart all

# 方式 2: 恢复特定文件
git checkout HEAD -- backend/*/src/auth/guards/permissions.guard.ts
pnpm build
pm2 restart all
```

---

**如有任何问题,请检查**:
1. PM2 服务状态: `pm2 list`
2. 服务日志: `pm2 logs <service-name>`
3. 数据库权限数据: 查询 `cloudphone_user.permissions` 表
4. JWT token 有效性: 解码 token 查看权限字段

**文档**: 参考 `docs/PERMISSION_FORMAT_FIX.md` 了解详细技术细节
