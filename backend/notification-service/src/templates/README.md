# 通知模板系统

通知服务的模板管理系统，支持多渠道、多语言的通知模板管理和动态渲染。

## 功能特性

### 🎨 模板管理
- ✅ 完整的 CRUD API（创建、查询、更新、删除）
- ✅ 模板分类：系统通知、营销通知、告警通知、交易通知
- ✅ 多渠道支持：邮件、短信、站内信、推送
- ✅ 多语言支持（默认 zh-CN）
- ✅ 模板激活/停用控制
- ✅ 批量创建模板

### 🔧 模板渲染
- ✅ Handlebars 模板引擎
- ✅ 自定义辅助函数（日期、数字、货币格式化）
- ✅ 模板编译缓存（性能优化）
- ✅ 数据合并（默认数据 + 动态数据）
- ✅ 模板语法验证

### 📦 内置辅助函数

1. **formatDate** - 日期格式化
   ```handlebars
   {{formatDate createdAt}}
   ```

2. **ifEquals** - 条件判断
   ```handlebars
   {{#ifEquals status "success"}}成功{{else}}失败{{/ifEquals}}
   ```

3. **formatNumber** - 数字格式化
   ```handlebars
   {{formatNumber 1234567}} // 输出: 1,234,567
   ```

4. **formatCurrency** - 货币格式化
   ```handlebars
   {{formatCurrency 99.99}} // 输出: ¥99.99
   ```

## 快速开始

### 1. 加载初始模板

首次部署时，需要加载默认模板到数据库：

```bash
# 在 notification-service 目录下执行
pnpm run seed:templates
```

这会创建 18 个默认模板，包括：

**用户相关** (5个):
- `user.registered` - 用户注册成功
- `user.login_failed` - 登录失败警告
- `user.password_reset` - 密码重置请求
- `user.password_changed` - 密码修改成功
- `user.two_factor_enabled` - 两步验证已启用

**设备相关** (3个):
- `device.created` - 云手机创建成功
- `device.creation_failed` - 云手机创建失败
- `device.error` - 云手机运行异常

**账单相关** (4个):
- `billing.payment_success` - 支付成功通知
- `billing.payment_failed` - 支付失败通知
- `billing.low_balance` - 余额不足提醒
- `billing.invoice_generated` - 账单生成通知

**应用相关** (2个):
- `app.installed` - 应用安装成功
- `app.install_failed` - 应用安装失败

**系统相关** (1个):
- `system.maintenance` - 系统维护通知

### 2. API 使用示例

#### 创建模板

```bash
POST /templates
Content-Type: application/json

{
  "code": "custom.welcome",
  "name": "自定义欢迎通知",
  "type": "marketing",
  "title": "欢迎 {{username}}！",
  "body": "感谢您的注册，{{username}}。您的账号已于 {{formatDate registeredAt}} 创建成功。",
  "emailTemplate": "<h1>欢迎 {{username}}</h1><p>注册时间：{{formatDate registeredAt}}</p>",
  "smsTemplate": "【云手机】欢迎{{username}}！",
  "channels": ["email", "sms", "inApp"],
  "language": "zh-CN",
  "defaultData": {
    "username": "用户",
    "registeredAt": "2025-01-22T00:00:00Z"
  }
}
```

#### 查询模板列表

```bash
# 获取所有激活的系统通知模板
GET /templates?type=system&isActive=true&page=1&limit=10

# 搜索模板
GET /templates?search=密码&page=1&limit=10
```

#### 根据 code 查找模板

```bash
GET /templates/by-code/user.registered?language=zh-CN
```

#### 渲染模板

```bash
POST /templates/render
Content-Type: application/json

{
  "templateCode": "user.registered",
  "language": "zh-CN",
  "data": {
    "username": "张三",
    "email": "zhangsan@example.com",
    "registeredAt": "2025-01-22T10:30:00Z",
    "loginUrl": "https://cloudphone.example.com/login"
  }
}
```

返回：
```json
{
  "title": "欢迎加入云手机平台！",
  "body": "您好 张三，欢迎注册云手机平台！您的账号已成功创建。",
  "emailHtml": "<div>...<strong>张三</strong>...</div>",
  "smsText": "【云手机】欢迎注册！您的账号张三已创建成功。"
}
```

#### 验证模板语法

```bash
POST /templates/validate
Content-Type: application/json

{
  "template": "Hello {{name}}, your balance is {{formatCurrency balance}}"
}
```

返回：
```json
{
  "valid": true
}
```

#### 更新模板

```bash
PATCH /templates/:id
Content-Type: application/json

{
  "title": "新的标题",
  "isActive": true
}
```

#### 激活/停用模板

```bash
PATCH /templates/:id/toggle
```

#### 批量创建模板

```bash
POST /templates/bulk
Content-Type: application/json

{
  "templates": [
    { "code": "template1", "name": "模板1", ... },
    { "code": "template2", "name": "模板2", ... }
  ]
}
```

#### 清除模板缓存

```bash
POST /templates/clear-cache
```

### 3. 在代码中使用模板

```typescript
import { Injectable } from '@nestjs/common';
import { TemplatesService } from './templates/templates.service';

@Injectable()
export class NotificationService {
  constructor(private readonly templatesService: TemplatesService) {}

  async sendUserRegisteredNotification(user: User) {
    // 渲染模板
    const rendered = await this.templatesService.render(
      'user.registered',
      {
        username: user.username,
        email: user.email,
        registeredAt: user.createdAt,
        loginUrl: 'https://cloudphone.example.com/login',
      },
      'zh-CN',
    );

    // 发送通知
    await this.emailService.send({
      to: user.email,
      subject: rendered.title,
      html: rendered.emailHtml,
    });

    await this.smsService.send({
      phone: user.phone,
      text: rendered.smsText,
    });
  }
}
```

## 模板开发指南

### 模板变量

在模板中使用 `{{variableName}}` 来插入动态数据：

```handlebars
您好 {{username}}，您的订单 {{orderId}} 已完成。
```

### 条件渲染

```handlebars
{{#ifEquals status "success"}}
  支付成功！
{{else}}
  支付失败，原因：{{reason}}
{{/ifEquals}}
```

### 循环渲染

```handlebars
<ul>
{{#each items}}
  <li>{{this.name}} - {{formatCurrency this.price}}</li>
{{/each}}
</ul>
```

### 格式化函数

```handlebars
<!-- 日期格式化 -->
注册时间：{{formatDate registeredAt}}

<!-- 数字格式化 -->
访问量：{{formatNumber viewCount}}

<!-- 货币格式化 -->
账户余额：{{formatCurrency balance}}
```

### HTML 邮件模板最佳实践

1. **使用内联样式**
   ```html
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
   ```

2. **颜色方案**
   - 成功：`#52c41a`
   - 警告：`#faad14`
   - 错误：`#ff4d4f`
   - 信息：`#1890ff`

3. **响应式设计**
   ```html
   <div style="max-width: 600px; margin: 0 auto;">
   ```

4. **按钮样式**
   ```html
   <a href="{{url}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
     点击这里
   </a>
   ```

### 短信模板最佳实践

1. **简洁明了**
   ```
   【云手机】验证码：{{code}}，5分钟内有效。
   ```

2. **包含品牌标识**
   ```
   【云手机】...
   ```

3. **控制长度**
   - 建议不超过 70 字
   - 避免特殊符号

## 数据库结构

模板存储在 `notification_templates` 表：

```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  email_template TEXT,
  sms_template TEXT,
  channels TEXT[] NOT NULL,
  language VARCHAR(10) DEFAULT 'zh-CN',
  is_active BOOLEAN DEFAULT TRUE,
  default_data JSONB,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 性能优化

### 模板编译缓存

系统会自动缓存已编译的 Handlebars 模板，避免重复编译：

```typescript
// 缓存键格式：{code}:{part}:{language}
// 示例：user.registered:title:zh-CN

private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();
```

### 清除缓存

当更新模板后，系统会自动清除相关缓存。也可以手动清除所有缓存：

```bash
POST /templates/clear-cache
```

## 故障排查

### 模板未找到

**错误**: `Template with code "xxx" not found`

**解决**:
1. 检查模板 code 是否正确
2. 确认模板已创建且激活 (`isActive = true`)
3. 检查语言参数是否匹配

### 模板渲染失败

**错误**: `Template rendering failed: xxx`

**解决**:
1. 检查模板语法是否正确
2. 确认传入的数据包含所有必需字段
3. 使用 `/templates/validate` API 验证模板

### 辅助函数不工作

**解决**:
1. 检查函数名拼写是否正确
2. 确认参数类型是否匹配
3. 查看日志确认辅助函数已注册

## 扩展开发

### 添加自定义辅助函数

在 `templates.service.ts` 的 `registerHelpers()` 方法中添加：

```typescript
private registerHelpers() {
  // 现有辅助函数...

  // 添加自定义辅助函数
  Handlebars.registerHelper('myCustomHelper', (value: string) => {
    return value.toUpperCase();
  });
}
```

使用：
```handlebars
{{myCustomHelper name}} <!-- 输出大写 -->
```

### 支持新语言

创建新语言的模板：

```typescript
await templatesService.create({
  code: 'user.registered',
  language: 'en-US',
  title: 'Welcome to Cloudphone!',
  body: 'Hi {{username}}, welcome aboard!',
  // ...
});
```

## 相关文档

- [Handlebars 官方文档](https://handlebarsjs.com/)
- [通知服务 README](../README.md)
- [RabbitMQ 集成文档](../rabbitmq/README.md)
- [Email 服务文档](../email/README.md)
