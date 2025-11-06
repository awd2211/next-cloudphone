# SSO（社交登录）实现指南

## 概述

已为后端实现完整的 SSO 社交登录功能，支持 Google、Facebook 和 Twitter (X) 登录。

## 已完成的工作

### 1. 数据库层
- ✅ 创建 `social_accounts` 表（`migrations/20251105_create_social_accounts_table.sql`）
- ✅ 创建 `SocialAccount` 实体（`src/entities/social-account.entity.ts`）
- ✅ 更新 `User` 实体，添加 `socialAccounts` 关联

### 2. 数据传输对象（DTO）
- ✅ 创建 `social-auth.dto.ts`，包含：
  - `SocialProvider` 枚举
  - `GetSocialAuthUrlDto` - 获取授权URL请求
  - `SocialAuthCallbackDto` - 回调处理请求
  - `BindSocialAccountDto` - 账号绑定请求
  - `SocialAuthResponse` - 登录响应接口
  - `BoundSocialAccount` - 绑定账号信息接口

### 3. 核心服务
- ✅ 创建 `SocialAuthService`（`src/auth/services/social-auth.service.ts`），实现：
  - OAuth 2.0 授权码流程
  - 用户自动注册/登录
  - 社交账号绑定/解绑
  - Token 交换和用户资料获取
  - CSRF 保护（state 参数）

## 待完成的工作

### 4. 更新 Auth Controller

需要在 `src/auth/auth.controller.ts` 添加以下路由：

\`\`\`typescript
import { SocialProvider, GetSocialAuthUrlDto, SocialAuthCallbackDto, BindSocialAccountDto } from './dto/social-auth.dto';
import { SocialAuthService } from './services/social-auth.service';

// 在 constructor 中注入
constructor(
  private readonly authService: AuthService,
  private readonly twoFactorService: TwoFactorService,
  private readonly socialAuthService: SocialAuthService,
) {}

// 添加路由

/**
 * 获取社交登录授权URL
 */
@Public()
@Get('social/:provider/url')
@ApiOperation({ summary: '获取社交登录授权URL' })
@ApiParam({ name: 'provider', enum: SocialProvider })
@ApiResponse({ status: 200, description: '返回授权URL' })
async getSocialAuthUrl(
  @Param('provider') provider: SocialProvider,
  @Query('redirectUrl') redirectUrl?: string,
) {
  return this.socialAuthService.getAuthUrl(provider, redirectUrl);
}

/**
 * 处理社交登录回调
 */
@Public()
@Post('social/:provider/callback')
@ApiOperation({ summary: '处理社交登录回调' })
@ApiParam({ name: 'provider', enum: SocialProvider })
@ApiResponse({ status: 200, description: '登录成功' })
async handleSocialCallback(
  @Param('provider') provider: SocialProvider,
  @Body() dto: SocialAuthCallbackDto,
  @Query('redirectUrl') redirectUrl?: string,
) {
  return this.socialAuthService.handleCallback(provider, dto, redirectUrl);
}

/**
 * 绑定社交账号
 */
@Post('social/:provider/bind')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: '绑定社交账号' })
@ApiParam({ name: 'provider', enum: SocialProvider })
@ApiResponse({ status: 200, description: '绑定成功' })
async bindSocialAccount(
  @Req() req: any,
  @Param('provider') provider: SocialProvider,
  @Body() dto: BindSocialAccountDto,
  @Query('redirectUrl') redirectUrl?: string,
) {
  return this.socialAuthService.bindAccount(req.user.id, provider, dto, redirectUrl);
}

/**
 * 解绑社交账号
 */
@Delete('social/:provider/unbind')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: '解绑社交账号' })
@ApiParam({ name: 'provider', enum: SocialProvider })
@ApiResponse({ status: 200, description: '解绑成功' })
async unbindSocialAccount(
  @Req() req: any,
  @Param('provider') provider: SocialProvider,
) {
  await this.socialAuthService.unbindAccount(req.user.id, provider);
  return { success: true, message: '解绑成功' };
}

/**
 * 获取已绑定的社交账号列表
 */
@Get('social/bound')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ summary: '获取已绑定的社交账号' })
@ApiResponse({ status: 200, description: '获取成功' })
async getBoundAccounts(@Req() req: any) {
  return this.socialAuthService.getBoundAccounts(req.user.id);
}
\`\`\`

### 5. 更新 Auth Module

在 `src/auth/auth.module.ts` 中：

\`\`\`typescript
import { SocialAuthService } from './services/social-auth.service';
import { SocialAccount } from '../entities/social-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SocialAccount]), // 添加 SocialAccount
    // ... 其他 imports
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    SocialAuthService, // 添加 SocialAuthService
    // ... 其他 providers
  ],
  exports: [AuthService, SocialAuthService], // 导出 SocialAuthService
})
export class AuthModule {}
\`\`\`

### 6. 环境变量配置

在 `.env.example` 和 `.env` 中添加：

\`\`\`bash
# ===== 社交登录配置 =====
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Twitter (X) OAuth 2.0
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# 社交登录回调URL
SOCIAL_AUTH_CALLBACK_URL=http://localhost:5174/auth/callback
\`\`\`

### 7. API Gateway 路由代理

在 `backend/api-gateway/src/proxy/proxy.controller.ts` 中添加社交登录路由：

\`\`\`typescript
// 社交登录 - 获取授权URL
@All('auth/social/:provider/url')
async proxySocialAuthUrl(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res);
}

// 社交登录 - 回调处理
@All('auth/social/:provider/callback')
async proxySocialAuthCallback(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res);
}

// 社交账号绑定
@UseGuards(JwtAuthGuard)
@All('auth/social/:provider/bind')
async proxySocialBind(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res);
}

// 社交账号解绑
@UseGuards(JwtAuthGuard)
@All('auth/social/:provider/unbind')
async proxySocialUnbind(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res);
}

// 获取已绑定账号
@UseGuards(JwtAuthGuard)
@All('auth/social/bound')
async proxySocialBound(@Req() req: Request, @Res() res: Response) {
  return this.handleProxy('users', req, res);
}
\`\`\`

### 8. 执行数据库迁移

\`\`\`bash
# 使用 psql 执行迁移
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user < backend/user-service/migrations/20251105_create_social_accounts_table.sql
\`\`\`

### 9. 安装依赖

\`\`\`bash
cd backend/user-service
pnpm add axios
\`\`\`

### 10. 重启服务

\`\`\`bash
# 重新编译
cd backend/user-service
pnpm build

# 重启 user-service
pm2 restart user-service

# 重启 api-gateway
pm2 restart api-gateway
\`\`\`

## OAuth 应用配置

### Google OAuth

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 客户端 ID
5. 添加授权重定向 URI: `http://localhost:5174/auth/callback/google`
6. 获取客户端 ID 和密钥

### Facebook OAuth

1. 访问 [Facebook Developers](https://developers.facebook.com/)
2. 创建应用
3. 添加 Facebook Login 产品
4. 配置 OAuth 重定向 URI: `http://localhost:5174/auth/callback/facebook`
5. 获取应用 ID 和密钥

### Twitter (X) OAuth 2.0

1. 访问 [Twitter Developer Portal](https://developer.twitter.com/)
2. 创建应用
3. 启用 OAuth 2.0
4. 添加回调 URL: `http://localhost:5174/auth/callback/twitter`
5. 获取客户端 ID 和密钥

## API 端点

### 前端调用示例

\`\`\`typescript
// 1. 获取授权 URL
const { authUrl, state } = await getSocialAuthUrl('google');
window.location.href = authUrl;

// 2. 处理回调（在回调页面）
const { token, user, isNewUser } = await handleSocialAuthCallback('google', {
  code: '授权码',
  state: 'state参数',
});

// 3. 绑定社交账号（需要登录）
await bindSocialAccount('google', {
  code: '授权码',
  state: 'state参数',
});

// 4. 解绑社交账号（需要登录）
await unbindSocialAccount('google');

// 5. 获取已绑定账号（需要登录）
const accounts = await getBoundAccounts();
\`\`\`

## 测试流程

1. 配置 OAuth 应用（Google/Facebook/Twitter）
2. 更新 `.env` 文件，填入客户端 ID 和密钥
3. 执行数据库迁移
4. 重启服务
5. 前端点击"使用 Google 登录"
6. 跳转到 Google 授权页面
7. 授权后跳转回前端回调页面
8. 前端调用回调 API 完成登录
9. 验证登录状态和用户信息

## 安全考虑

1. **CSRF 保护**：使用 `state` 参数防止 CSRF 攻击
2. **Token 加密**：access_token 和 refresh_token 应加密存储
3. **HTTPS**：生产环境必须使用 HTTPS
4. **限流**：社交登录接口应添加限流保护
5. **审计日志**：记录所有社交登录和绑定操作
6. **权限控制**：确保只有用户本人可以绑定/解绑账号

## 故障排查

### 常见问题

1. **授权URL无法访问**
   - 检查 OAuth 应用配置
   - 验证客户端 ID 是否正确

2. **回调失败**
   - 检查回调 URL 配置是否匹配
   - 验证客户端密钥是否正确

3. **用户信息获取失败**
   - 检查 access_token 是否有效
   - 验证 API 权限范围（scope）

4. **绑定冲突**
   - 社交账号已被其他用户绑定
   - 检查数据库唯一索引

## 生产环境部署

1. 使用环境变量管理敏感信息
2. 配置 HTTPS 证书
3. 设置正确的回调 URL
4. 启用监控和告警
5. 定期审查授权日志
6. 实现 Token 刷新机制

## 扩展功能

未来可以添加：
- 微信登录
- GitHub 登录
- LinkedIn 登录
- Apple Sign In
- 社交账号合并功能
- 多账号关联管理
