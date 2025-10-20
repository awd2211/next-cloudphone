# 开发规范指南

本文档规定了云手机平台项目的开发规范和最佳实践。

## 代码风格

### TypeScript / JavaScript

使用 **ESLint** + **Prettier** 保持代码风格一致。

**配置文件位置:**
- `.eslintrc.js` - ESLint 配置
- `.prettierrc` - Prettier 配置

**基本规则:**
- 使用 **2 空格**缩进
- 使用**单引号**（字符串）
- 行尾**不加分号**
- 每行最大长度 **100 字符**
- 使用 **ES6+** 语法

**示例:**
```typescript
// ✅ 推荐
const getUserById = async (id: string): Promise<User> => {
  const user = await userRepository.findOne({ where: { id } })
  if (!user) {
    throw new NotFoundException('User not found')
  }
  return user
}

// ❌ 不推荐
const getUserById = async (id: string): Promise<User> =>
{
    const user = await userRepository.findOne({where:{id}});
    if(!user){throw new NotFoundException("User not found")};
    return user;
};
```

### Python

遵循 **PEP 8** 规范。

**基本规则:**
- 使用 **4 空格**缩进
- 每行最大长度 **79 字符**
- 函数和类之间空 **2 行**
- 使用 **snake_case** 命名变量和函数
- 使用 **PascalCase** 命名类

**示例:**
```python
# ✅ 推荐
def get_user_by_id(user_id: str) -> User:
    user = user_repository.find_one(id=user_id)
    if not user:
        raise NotFoundException('User not found')
    return user


# ❌ 不推荐
def getUserById(userId:str)->User:
  user=user_repository.find_one(id=userId)
  if not user:raise NotFoundException('User not found')
  return user
```

### Go

遵循官方 **Go Code Review Comments**。

**基本规则:**
- 使用 **gofmt** 格式化代码
- 使用 **tab** 缩进
- 使用 **camelCase** 命名变量和函数
- 使用 **PascalCase** 命名导出的函数和类型

**示例:**
```go
// ✅ 推荐
func GetUserByID(id string) (*User, error) {
    user, err := userRepository.FindOne(id)
    if err != nil {
        return nil, err
    }
    return user, nil
}

// ❌ 不推荐
func get_user_by_id(id string) (*User,error){
user,err:=userRepository.FindOne(id)
if err!=nil{return nil,err}
return user,nil
}
```

## 命名规范

### 变量命名

- **布尔值**: 使用 `is`、`has`、`can` 前缀
  ```typescript
  const isActive = true
  const hasPermission = false
  const canEdit = true
  ```

- **数组/列表**: 使用复数形式
  ```typescript
  const users = []
  const devices = []
  ```

- **常量**: 使用大写下划线命名
  ```typescript
  const MAX_RETRIES = 3
  const API_BASE_URL = 'http://localhost:3000'
  ```

### 函数命名

- 使用**动词开头**，表明函数的操作
  ```typescript
  getUserById()
  createDevice()
  updateOrder()
  deleteApp()
  fetchData()
  calculateCost()
  validateInput()
  ```

### 文件命名

- TypeScript/JavaScript: **kebab-case**
  ```
  user.controller.ts
  device.service.ts
  auth.module.ts
  ```

- Python: **snake_case**
  ```
  user_service.py
  device_repository.py
  ```

- Go: **snake_case** 或 **camelCase**
  ```
  user_service.go
  deviceHandler.go
  ```

## Git 提交规范

使用 **Conventional Commits** 规范。

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构（不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建工具或辅助工具的变动

### 示例

```bash
feat(auth): add JWT refresh token mechanism

- Implement refresh token generation
- Add refresh endpoint
- Update user login flow

Closes #123
```

```bash
fix(device): resolve memory leak in device allocation

The device pool was not properly releasing devices after use.
This commit adds proper cleanup logic.
```

```bash
docs(api): update billing API documentation

Add missing endpoints and response examples for the billing service.
```

## 分支管理

### 分支命名规范

- **main** - 主分支，生产环境代码
- **develop** - 开发分支
- **feature/xxx** - 功能分支
- **fix/xxx** - 修复分支
- **hotfix/xxx** - 紧急修复分支
- **release/x.x.x** - 发布分支

### 工作流程

1. **创建功能分支**
   ```bash
   git checkout -b feature/user-authentication
   ```

2. **开发并提交**
   ```bash
   git add .
   git commit -m "feat(auth): implement user login"
   ```

3. **推送到远程**
   ```bash
   git push origin feature/user-authentication
   ```

4. **创建 Pull Request**
   - 在 GitHub/GitLab 上创建 PR
   - 等待 Code Review
   - 通过后合并到 develop

## 代码审查 (Code Review)

### Review 清单

- [ ] 代码符合项目规范
- [ ] 没有明显的 bug
- [ ] 有适当的错误处理
- [ ] 有必要的注释
- [ ] 测试覆盖关键逻辑
- [ ] 没有硬编码的敏感信息
- [ ] 性能合理
- [ ] 安全性考虑

### Review 原则

1. **及时响应** - 24 小时内完成 Review
2. **建设性反馈** - 提出问题的同时给出建议
3. **尊重他人** - 保持友好和专业
4. **持续学习** - Review 是双向学习的过程

## 测试规范

### 单元测试

**目标覆盖率:** 80%+

**命名规范:**
```typescript
// 测试文件命名
user.service.spec.ts
device.controller.spec.ts

// 测试用例命名
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when id exists', async () => {
      // ...
    })

    it('should throw NotFoundException when id does not exist', async () => {
      // ...
    })
  })
})
```

### 集成测试

测试多个模块的交互：

```typescript
describe('Authentication Flow (E2E)', () => {
  it('should register, login, and access protected route', async () => {
    // 1. 注册
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test', password: '123456' })

    // 2. 登录
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: '123456' })

    const token = loginRes.body.token

    // 3. 访问受保护的路由
    const profileRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(profileRes.status).toBe(200)
  })
})
```

## 错误处理

### 后端

使用统一的错误处理机制：

```typescript
// ✅ 推荐 - 使用自定义异常
throw new NotFoundException('User not found')
throw new BadRequestException('Invalid email format')
throw new UnauthorizedException('Invalid credentials')

// ❌ 不推荐 - 直接抛出 Error
throw new Error('User not found')
```

### 前端

```typescript
// ✅ 推荐 - 统一错误提示
try {
  const user = await api.getUserById(id)
} catch (error) {
  if (error.response?.status === 404) {
    message.error('用户不存在')
  } else {
    message.error('获取用户信息失败')
  }
}

// ❌ 不推荐 - 静默失败
try {
  const user = await api.getUserById(id)
} catch (error) {
  console.log(error)
}
```

## 日志规范

### 日志级别

- **ERROR** - 错误，需要立即处理
- **WARN** - 警告，需要关注
- **INFO** - 一般信息
- **DEBUG** - 调试信息（仅开发环境）

### 日志格式

```typescript
// ✅ 推荐 - 结构化日志
logger.info('User login successful', {
  userId: user.id,
  username: user.username,
  ip: req.ip,
  timestamp: new Date().toISOString()
})

// ❌ 不推荐 - 非结构化日志
console.log('User login: ' + user.username)
```

## 安全规范

### 敏感信息

- ❌ **禁止**将敏感信息提交到代码仓库
  - 密码
  - API 密钥
  - 数据库连接字符串
  - JWT Secret

- ✅ 使用环境变量 (`.env`)
  ```
  DB_PASSWORD=your_password
  JWT_SECRET=your_secret_key
  ```

### 输入验证

```typescript
// ✅ 推荐 - 使用 DTO + class-validator
export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}

// ❌ 不推荐 - 无验证
const createUser = (body: any) => {
  const user = userRepository.create(body)
  return userRepository.save(user)
}
```

### SQL 注入防护

```typescript
// ✅ 推荐 - 使用参数化查询 (TypeORM)
const user = await userRepository.findOne({
  where: { username }
})

// ❌ 不推荐 - 字符串拼接
const user = await db.query(`SELECT * FROM users WHERE username = '${username}'`)
```

## 性能优化

### 数据库查询

```typescript
// ✅ 推荐 - 只查询需要的字段
const users = await userRepository.find({
  select: ['id', 'username', 'email'],
  where: { status: 'active' }
})

// ❌ 不推荐 - 查询所有字段
const users = await userRepository.find({
  where: { status: 'active' }
})
```

### 缓存

```typescript
// ✅ 推荐 - 使用 Redis 缓存
const cacheKey = `user:${userId}`
let user = await redis.get(cacheKey)

if (!user) {
  user = await userRepository.findOne({ where: { id: userId } })
  await redis.set(cacheKey, JSON.stringify(user), 'EX', 300) // 5 分钟过期
}
```

### N+1 查询

```typescript
// ✅ 推荐 - 使用 join 或 relations
const devices = await deviceRepository.find({
  relations: ['currentUser'],
  where: { status: 'online' }
})

// ❌ 不推荐 - 循环查询
const devices = await deviceRepository.find({ where: { status: 'online' } })
for (const device of devices) {
  device.user = await userRepository.findOne({ where: { id: device.userId } })
}
```

## 文档规范

### 代码注释

```typescript
/**
 * 根据 ID 获取用户信息
 *
 * @param id - 用户 ID
 * @returns 用户对象
 * @throws NotFoundException 当用户不存在时
 *
 * @example
 * const user = await getUserById('uuid-123')
 */
async function getUserById(id: string): Promise<User> {
  // ...
}
```

### README

每个子项目应包含 README.md：

- 项目简介
- 技术栈
- 安装步骤
- 运行方法
- 环境变量说明
- 常见问题

## 工具推荐

### VS Code 插件

- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **GitLens** - Git 增强
- **Thunder Client** - API 测试
- **TODO Highlight** - TODO 高亮
- **Path Intellisense** - 路径智能提示

### Chrome 插件

- **React DevTools** - React 调试
- **Redux DevTools** - Redux 调试
- **JSON Viewer** - JSON 格式化

## 参考资料

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [NestJS 官方文档](https://docs.nestjs.com/)
- [React 官方文档](https://react.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [PEP 8](https://pep8.org/)
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)

---

**版本**: 1.0
**最后更新**: 2025-01-20
