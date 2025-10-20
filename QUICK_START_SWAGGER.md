# Swagger API 文档快速开始

## 🚀 5 分钟快速上手

### 1. 启动服务（2 分钟）

```bash
# 进入项目目录
cd /home/eric/next-cloudphone

# 启动基础设施
docker compose -f docker-compose.dev.yml up -d postgres redis minio

# 启动所有微服务
./start-local-dev.sh
```

### 2. 访问 Swagger 文档（1 分钟）

打开浏览器，访问任意服务的 Swagger UI：

**推荐从 User Service 开始：**
```
http://localhost:30001/api/docs
```

**所有服务列表：**
- API Gateway: http://localhost:30000/api/docs
- User Service: http://localhost:30001/api/docs
- Device Service: http://localhost:30002/api/docs
- App Service: http://localhost:30003/api/docs
- Billing Service: http://localhost:30005/api/docs

### 3. 测试第一个 API（2 分钟）

#### 创建用户示例

1. 在 Swagger UI 中找到 `POST /users` 接口
2. 点击 "Try it out"
3. 编辑请求体：

```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "fullName": "Test User"
}
```

4. 点击 "Execute"
5. 查看响应！

---

## 📚 主要功能速览

### User Service (用户管理)
- 创建用户
- 用户列表（分页）
- 用户详情
- 更新用户
- 修改密码
- 删除用户
- 用户统计

### Device Service (设备管理)
- 创建设备（自动创建 Docker 容器）
- 设备列表（支持筛选）
- 设备详情和统计
- 启动/停止/重启设备
- 设备心跳
- 删除设备

### App Service (应用管理)
- 上传 APK 文件
- 应用列表
- 安装应用到设备
- 卸载应用
- 查看设备应用列表

### Billing Service (计费服务)
- 获取套餐列表
- 创建订单
- 查看用户订单
- 使用记录管理
- 计费统计

---

## 🔑 使用认证

### 获取 Token（待实现）

目前 JWT 认证正在完善中，可以直接测试接口。

### 添加认证（将来）

1. 点击右上角 "Authorize" 按钮
2. 输入: `Bearer <your-token>`
3. 点击 "Authorize"
4. 现在可以访问受保护的接口了

---

## 💡 实用技巧

### 1. 搜索接口
在 Swagger UI 顶部使用搜索框快速查找接口

### 2. 查看响应格式
展开接口后可以看到：
- 请求参数说明
- 请求体结构
- 响应格式示例
- 错误响应说明

### 3. 复制 curl 命令
点击 "Execute" 后，可以复制生成的 curl 命令在终端中使用

### 4. 导出到 Postman
```bash
# 下载 API 定义
curl http://localhost:30001/api/docs-json > user-service.json

# 在 Postman 中: File -> Import -> 选择文件
```

### 5. 查看数据模型
向下滚动到 "Schemas" 部分，查看所有 DTO 和实体的结构

---

## 🎯 常用 API 测试流程

### 完整流程示例：创建设备并安装应用

#### 步骤 1: 创建用户
```http
POST http://localhost:30001/users
Content-Type: application/json

{
  "username": "demo",
  "email": "demo@example.com",
  "password": "demo123456"
}
```

#### 步骤 2: 创建设备
```http
POST http://localhost:30002/devices
Content-Type: application/json

{
  "name": "My Cloud Phone",
  "userId": "<user-id>",
  "cpuCores": 4,
  "memoryMB": 4096,
  "resolution": "1920x1080"
}
```

#### 步骤 3: 上传应用
```http
POST http://localhost:30003/apps/upload
Content-Type: multipart/form-data

file: <your-apk-file>
```

#### 步骤 4: 安装应用到设备
```http
POST http://localhost:30003/apps/install
Content-Type: application/json

{
  "applicationId": "<app-id>",
  "deviceIds": ["<device-id>"]
}
```

#### 步骤 5: 查看设备应用
```http
GET http://localhost:30003/apps/devices/<device-id>/apps
```

---

## 📊 数据示例

### 用户数据
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "phone": "13800138000",
  "roleIds": ["role-user"],
  "status": "active"
}
```

### 设备数据
```json
{
  "name": "Gaming Phone",
  "description": "High performance device",
  "type": "phone",
  "userId": "user-123",
  "cpuCores": 8,
  "memoryMB": 8192,
  "storageMB": 65536,
  "resolution": "2560x1440",
  "dpi": 560,
  "androidVersion": "13.0",
  "tags": ["gaming", "high-end"]
}
```

### 订单数据
```json
{
  "userId": "user-123",
  "planId": "plan-basic",
  "tenantId": "tenant-123"
}
```

---

## 🔍 故障排查

### 问题 1: Swagger UI 打不开
```bash
# 检查服务是否运行
curl http://localhost:30001/health

# 查看服务日志
docker-compose -f docker-compose.dev.yml logs user-service
```

### 问题 2: 接口返回 404
- 检查 URL 路径是否正确
- 确认服务端口是否正确
- 查看控制台日志

### 问题 3: 接口返回 500
- 查看详细错误信息
- 检查数据库连接
- 查看服务日志

---

## 📖 深入学习

### 查看完整文档
- [SWAGGER_IMPLEMENTATION_COMPLETE.md](./SWAGGER_IMPLEMENTATION_COMPLETE.md) - Swagger 实现完整报告
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API 文档和开发指南

### NestJS Swagger 资源
- [官方文档](https://docs.nestjs.com/openapi/introduction)
- [装饰器说明](https://docs.nestjs.com/openapi/decorators)
- [CLI 插件](https://docs.nestjs.com/openapi/cli-plugin)

### OpenAPI 规范
- [OpenAPI 3.0](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/)

---

## 🎨 Swagger UI 界面说明

### 顶部导航
- **服务标题** - 显示当前服务名称
- **版本号** - API 版本
- **搜索框** - 搜索接口

### 接口列表
- **HTTP 方法** - 颜色标识（GET=蓝, POST=绿, PUT=橙, DELETE=红）
- **路径** - 接口 URL
- **描述** - 简短说明

### 接口详情
- **Summary** - 操作摘要
- **Description** - 详细描述
- **Parameters** - 参数列表（路径、查询、请求体）
- **Responses** - 响应状态码和格式
- **Try it out** - 交互式测试按钮

### 数据模型
- **Schemas** - 所有 DTO 和 Entity 的结构定义
- **字段说明** - 类型、是否必填、格式、示例

---

## 🚀 下一步

### 立即开始
1. ✅ 访问 Swagger UI
2. ✅ 测试几个 API
3. ✅ 查看响应格式

### 探索更多
1. 🔍 尝试所有服务的 API
2. 📊 查看完整文档
3. 💻 集成到你的前端应用

### 参与开发
1. 📝 报告 API 问题
2. 💡 提出改进建议
3. 🔧 贡献代码

---

## 💬 获取帮助

### 文档
- [SWAGGER_IMPLEMENTATION_COMPLETE.md](./SWAGGER_IMPLEMENTATION_COMPLETE.md)
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- [DOCKER_DEV.md](./DOCKER_DEV.md)

### 问题反馈
- GitHub Issues: [项目地址]
- 技术支持: [联系方式]

---

**开始探索吧！** 🎉

访问: http://localhost:30001/api/docs
