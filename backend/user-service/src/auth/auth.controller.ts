import { Controller, Post, Get, Body, UseGuards, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiOperation({ summary: '用户注册', description: '注册新用户账号' })
  @ApiResponse({ status: 201, description: '注册成功' })
  @ApiResponse({ status: 400, description: '注册失败' })
  @ApiResponse({ status: 429, description: '请求过于频繁，请稍后再试' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
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
}

