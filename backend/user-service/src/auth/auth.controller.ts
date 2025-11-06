import { Controller, Post, Get, Body, UseGuards, Req, Headers, Param, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { TwoFactorService } from './two-factor.service';
import { SocialProvider, SocialAuthCallbackDto, BindSocialAccountDto } from './dto/social-auth.dto';
import { SocialAuthService } from './services/social-auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly socialAuthService: SocialAuthService,
  ) {}

  /**
   * 获取验证码
   * 🔒 限流: 60秒内最多10次
   */
  @Public()
  @Get('captcha')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '获取验证码', description: '生成登录验证码' })
  @ApiResponse({ status: 200, description: '验证码生成成功' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  async getCaptcha() {
    return this.authService.getCaptcha();
  }

  /**
   * 用户注册
   * 🔒 限流: 60秒内最多3次 (防止恶意注册)
   */
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: '用户注册', description: '通过 Saga 模式注册新用户账号' })
  @ApiResponse({ status: 201, description: '注册 Saga 已启动' })
  @ApiResponse({ status: 400, description: '注册失败' })
  @ApiResponse({ status: 429, description: '请求过于频繁，请稍后再试' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('register/saga/:sagaId')
  @ApiOperation({ summary: '查询注册 Saga 状态' })
  @ApiParam({ name: 'sagaId', description: 'Saga ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getRegistrationStatus(@Param('sagaId') sagaId: string) {
    return this.authService.getRegistrationStatus(sagaId);
  }

  /**
   * 用户登录
   * 🔒 限流: 60秒内最多5次 (防止暴力破解)
   *
   * 结合以下多层防护:
   * - 限流: 5次/分钟
   * - 验证码: 每次登录需要验证码
   * - 账号锁定: 5次失败后锁定30分钟
   * - 时序攻击防护: 200-400ms随机延迟
   */
  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '用户登录', description: '用户名密码登录，需要验证码' })
  @ApiResponse({ status: 200, description: '登录成功，返回 Token' })
  @ApiResponse({ status: 401, description: '用户名或密码错误 / 验证码错误' })
  @ApiResponse({ status: 429, description: '登录尝试过于频繁，请稍后再试' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * 登出
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户登出', description: '登出并将 Token 加入黑名单' })
  @ApiResponse({ status: 200, description: '登出成功' })
  async logout(@Req() req: any, @Headers('authorization') auth?: string) {
    // 提取 Bearer Token
    const token = auth?.replace('Bearer ', '');
    return this.authService.logout(req.user.id, token);
  }

  /**
   * 获取当前用户信息
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  /**
   * 刷新 Token
   * 🔒 限流: 60秒内最多10次
   */
  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '刷新 Token' })
  @ApiResponse({ status: 200, description: 'Token 刷新成功' })
  @ApiResponse({ status: 429, description: 'Token 刷新过于频繁' })
  async refreshToken(@Req() req: any) {
    return this.authService.refreshToken(req.user.id);
  }

  /**
   * 生成2FA密钥
   * 🔒 需要登录
   */
  @Get('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成2FA密钥', description: '生成双因素认证密钥和二维码' })
  @ApiResponse({ status: 200, description: '生成成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async generate2FA(@Req() req: any) {
    const result = await this.twoFactorService.generate2FASecret(req.user.id);
    return {
      success: true,
      data: result,
      message: '2FA密钥生成成功',
    };
  }

  /**
   * 启用2FA
   * 🔒 需要登录
   */
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '启用2FA', description: '验证并启用双因素认证' })
  @ApiResponse({ status: 200, description: '启用成功' })
  @ApiResponse({ status: 400, description: '验证码错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async enable2FA(@Req() req: any, @Body() dto: Enable2FADto) {
    await this.twoFactorService.enable2FA(req.user.id, dto.token);
    return {
      success: true,
      message: '双因素认证已启用',
    };
  }

  /**
   * 禁用2FA
   * 🔒 需要登录
   */
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '禁用2FA', description: '验证并禁用双因素认证' })
  @ApiResponse({ status: 200, description: '禁用成功' })
  @ApiResponse({ status: 400, description: '验证码错误' })
  @ApiResponse({ status: 401, description: '未授权' })
  async disable2FA(@Req() req: any, @Body() dto: Disable2FADto) {
    await this.twoFactorService.disable2FA(req.user.id, dto.token);
    return {
      success: true,
      message: '双因素认证已禁用',
    };
  }

  /**
   * 获取社交登录授权URL
   * 🔒 限流: 60秒内最多10次
   */
  @Public()
  @Get('social/:provider/url')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '获取社交登录授权URL' })
  @ApiParam({ name: 'provider', enum: SocialProvider })
  @ApiResponse({ status: 200, description: '返回授权URL' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  async getSocialAuthUrl(
    @Param('provider') provider: SocialProvider,
    @Query('redirectUrl') redirectUrl?: string,
  ) {
    return this.socialAuthService.getAuthUrl(provider, redirectUrl);
  }

  /**
   * 处理社交登录回调
   * 🔒 限流: 60秒内最多10次
   */
  @Public()
  @Post('social/:provider/callback')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '处理社交登录回调' })
  @ApiParam({ name: 'provider', enum: SocialProvider })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '社交登录失败' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  async handleSocialCallback(
    @Param('provider') provider: SocialProvider,
    @Body() dto: SocialAuthCallbackDto,
    @Query('redirectUrl') redirectUrl?: string,
  ) {
    return this.socialAuthService.handleCallback(provider, dto, redirectUrl);
  }

  /**
   * 绑定社交账号
   * 🔒 需要登录，限流: 60秒内最多5次
   */
  @Post('social/:provider/bind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '绑定社交账号' })
  @ApiParam({ name: 'provider', enum: SocialProvider })
  @ApiResponse({ status: 200, description: '绑定成功' })
  @ApiResponse({ status: 400, description: '绑定失败' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
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
   * 🔒 需要登录，限流: 60秒内最多5次
   */
  @Delete('social/:provider/unbind')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '解绑社交账号' })
  @ApiParam({ name: 'provider', enum: SocialProvider })
  @ApiResponse({ status: 200, description: '解绑成功' })
  @ApiResponse({ status: 400, description: '解绑失败' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 429, description: '请求过于频繁' })
  async unbindSocialAccount(
    @Req() req: any,
    @Param('provider') provider: SocialProvider,
  ) {
    await this.socialAuthService.unbindAccount(req.user.id, provider);
    return { success: true, message: '解绑成功' };
  }

  /**
   * 获取已绑定的社交账号列表
   * 🔒 需要登录
   */
  @Get('social/bound')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取已绑定的社交账号' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  async getBoundAccounts(@Req() req: any) {
    return this.socialAuthService.getBoundAccounts(req.user.id);
  }
}
