# 验证码登录问题排查指南

## 当前状态

根据浏览器控制台日志,验证码API是**正常工作**的:

```
📤 API Request: GET /auth/captcha → 200 OK
📥 API Response: {id: "...", svg: "..."}
```

这说明:
- ✅ 验证码服务正常运行
- ✅ 前端能成功获取验证码

## 验证码登录流程

### 正常流程

```
1. 前端请求验证码: GET /auth/captcha
   ← 返回: {id: "uuid", svg: "<svg>...</svg>"}

2. 前端显示 SVG 验证码图片

3. 用户输入验证码文本

4. 前端提交登录: POST /auth/login
   {
     "username": "admin",
     "password": "admin123",
     "captcha": "abcd",      ← 用户输入的4位验证码
     "captchaId": "uuid"     ← 第1步返回的ID
   }

5. 后端验证:
   - 从 Redis 获取 captchaId 对应的正确答案
   - 比较用户输入 vs 正确答案
   - 验证通过 → 返回 token
   - 验证失败 → 返回 400 错误
```

## 可能的问题和解决方案

### 问题 1: 验证码看不清楚

**症状**: 验证码图片模糊或字符重叠

**解决方案**:
1. 点击验证码图片刷新
2. 调整浏览器缩放比例
3. 使用检查元素查看 SVG 源码

**临时方案** - 修改后端验证码配置:
```typescript
// backend/user-service/src/auth/services/captcha.service.ts
const captcha = svgCaptcha.create({
  size: 4,
  noise: 1,        // ← 降低噪点 (原来是 2)
  color: false,    // ← 使用黑白色 (原来是 true)
  background: '#ffffff',
  width: 150,      // ← 增加宽度 (原来是 120)
  height: 50,      // ← 增加高度 (原来是 40)
  fontSize: 60,    // ← 添加字体大小
});
```

### 问题 2: 验证码总是提示错误

**症状**: 无论输入什么都提示 "验证码错误"

**可能原因**:
1. Redis 未运行或连接失败
2. 验证码已过期 (5分钟)
3. captchaId 未正确传递
4. 大小写敏感问题

**排查步骤**:

#### 1. 检查 Redis
```bash
docker compose -f docker-compose.dev.yml ps redis
# 应该显示 "Up"

# 测试 Redis 连接
docker compose -f docker-compose.dev.yml exec redis redis-cli ping
# 应该返回 "PONG"
```

#### 2. 检查验证码存储
```bash
# 查看 Redis 中的验证码
docker compose -f docker-compose.dev.yml exec redis redis-cli

redis-cli> KEYS captcha:*
# 应该显示类似: 1) "captcha:uuid"

redis-cli> GET captcha:some-uuid
# 应该显示验证码文本: "abcd"

redis-cli> TTL captcha:some-uuid
# 应该显示剩余秒数: 299 (5分钟内)
```

#### 3. 检查登录请求数据
打开浏览器开发者工具 → Network 面板:

```
POST /auth/login
Payload:
{
  "username": "admin",
  "password": "admin123",
  "captcha": "abcd",       ← 检查是否有值
  "captchaId": "uuid..."   ← 检查是否是有效 UUID
}
```

如果缺少 `captcha` 或 `captchaId`,说明前端表单绑定有问题。

### 问题 3: 验证码大小写问题

**症状**: 输入正确但仍然失败

**原因**: 后端验证可能是大小写敏感的

**检查后端验证逻辑**:
```typescript
// backend/user-service/src/auth/auth.service.ts
async validateCaptcha(captchaId: string, captcha: string): Promise<boolean> {
  const storedCaptcha = await this.captchaService.verifyCaptcha(captchaId);

  // ❌ 大小写敏感: return captcha === storedCaptcha;
  // ✅ 大小写不敏感: return captcha.toLowerCase() === storedCaptcha.toLowerCase();
}
```

**临时解决方案** - 前端转小写:
```typescript
// frontend/user/src/hooks/useLogin.tsx
const handleLogin = async (values) => {
  const result = await login({
    ...values,
    captcha: values.captcha.toLowerCase(),  // ← 转小写
    captchaId,
  });
};
```

### 问题 4: 验证码过期

**症状**: 停留太久后提交提示 "验证码无效"

**原因**: 验证码有效期是 5 分钟

**解决方案**:
- 页面加载后尽快登录
- 或者增加验证码有效期:
  ```typescript
  // backend/user-service/src/auth/services/captcha.service.ts
  private readonly CAPTCHA_EXPIRY = 600; // ← 改为10分钟 (原来是 300)
  ```

## 绕过验证码测试 (仅开发环境)

如果验证码一直有问题,可以临时禁用验证码验证:

```typescript
// backend/user-service/src/auth/auth.service.ts
async validateCaptcha(captchaId: string, captcha: string): Promise<boolean> {
  // ⚠️ 仅用于开发测试,生产环境必须移除!
  if (process.env.NODE_ENV === 'development') {
    return true;  // ← 直接返回 true,跳过验证
  }

  // 正常验证逻辑...
}
```

**重要**: 测试完成后必须移除此代码!

## 手动测试脚本

使用命令行测试验证码登录:

```bash
# 运行测试脚本
/tmp/test_captcha_login.sh

# 脚本会:
# 1. 获取验证码
# 2. 保存 SVG 到 /tmp/captcha.svg
# 3. 等待你输入验证码
# 4. 尝试登录
# 5. 测试权限接口
```

## 浏览器测试步骤

### 1. 清除缓存和 localStorage

```javascript
// 在浏览器控制台执行:
localStorage.clear();
location.reload();
```

### 2. 打开 Network 面板

F12 → Network → 勾选 "Preserve log"

### 3. 访问登录页面

```
http://localhost:5174/login
```

### 4. 观察请求

应该看到:
```
✅ GET /auth/captcha → 200 OK
   Response: {id: "...", svg: "..."}
```

### 5. 输入账号密码

- 用户名: `admin`
- 密码: `admin123`
- 验证码: 看图片输入4位字符

### 6. 提交登录

观察请求:
```
POST /auth/login
Request Payload:
{
  "username": "admin",
  "password": "admin123",
  "captcha": "abcd",
  "captchaId": "..."
}

响应 1 - 验证码错误:
{
  "statusCode": 400,
  "message": "验证码错误或已过期"
}

响应 2 - 登录成功:
{
  "token": "eyJhbGc...",
  "user": {...}
}
```

## 验证码常见错误信息

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| 验证码必须是字符串 | 前端未传 captcha | 检查表单绑定 |
| 验证码不能为空 | captcha 为空字符串 | 检查表单值 |
| 验证码最多 10 个字符 | 输入过长 | 限制输入长度 |
| 验证码ID必须是字符串 | 前端未传 captchaId | 检查 useLogin hook |
| 验证码ID不能为空 | captchaId 为 undefined | 确保调用了 fetchCaptcha |
| 验证码ID格式无效 | captchaId 不是 UUID | 检查验证码接口返回 |
| 验证码错误或已过期 | 输入错误或 >5分钟 | 重新获取验证码 |

## 权限修复后的完整测试

### 测试目标

确认两个问题都已解决:
1. ✅ 验证码功能正常
2. ✅ 权限检查正常 (修复了格式不匹配bug)

### 完整测试流程

```bash
# 1. 清除浏览器缓存
打开 http://localhost:5174/login
F12 → Application → Clear storage → Clear site data

# 2. 重新加载页面
刷新页面 (Ctrl+R)

# 3. 登录测试
用户名: admin
密码: admin123
验证码: [看图输入4位]

# 4. 观察行为
✅ 成功: 进入 /dashboard 并停留
❌ 失败: 跳转回 /login

# 5. 查看控制台
✅ 成功: 无 403 Forbidden 错误
❌ 失败: 有权限错误信息

# 6. 测试功能页面
访问 "我的设备" → 应该能看到设备列表
访问 "应用市场" → 应该能看到应用列表
访问 "个人中心" → 应该能看到用户信息
```

### 预期结果

**验证码正常** + **权限修复成功** = **完美登录体验**

```
1. 输入验证码 → 验证通过 ✅
2. 获取 Token → 包含权限列表 ✅
3. 进入主界面 → 不会被踢出 ✅
4. 调用 API → 返回 200 OK (不是 403) ✅
5. 正常使用 → 所有功能可用 ✅
```

## 故障排查清单

- [ ] Redis 服务运行正常
- [ ] user-service 服务运行正常
- [ ] 能成功获取验证码 (GET /auth/captcha → 200)
- [ ] 验证码图片能正确显示
- [ ] 表单能正确绑定 captcha 和 captchaId
- [ ] 登录请求包含完整数据 (username, password, captcha, captchaId)
- [ ] 验证码在5分钟内提交
- [ ] 验证码输入正确 (大小写可能敏感)
- [ ] 登录成功返回 token
- [ ] Token 能正常访问需要权限的接口

## 技术支持

如果以上方法都无法解决问题,请提供以下信息:

1. **浏览器控制台截图** (Console + Network 面板)
2. **后端服务日志**:
   ```bash
   pm2 logs user-service --lines 50
   ```
3. **Redis 状态**:
   ```bash
   docker compose -f docker-compose.dev.yml ps redis
   ```
4. **验证码接口响应**:
   ```bash
   curl -s http://localhost:30001/auth/captcha | jq .
   ```
5. **登录失败的完整错误信息**

---

**最后更新**: 2025-01-02
**相关文档**:
- `docs/PERMISSION_FORMAT_FIX.md` - 权限格式修复说明
- `docs/PERMISSION_FIX_TEST_GUIDE.md` - 权限修复测试指南
