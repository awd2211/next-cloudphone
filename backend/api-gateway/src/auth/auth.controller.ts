import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CaptchaService } from './services/captcha.service';
import { CaptchaResponseDto } from './dto/captcha.dto';
import { TwoFactorService } from './services/two-factor.service';
import { Enable2FADto, Verify2FADto, TwoFactorSecretResponseDto } from './dto/two-factor.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Get('captcha')
  @ApiOperation({ summary: '获取验证码', description: '生成图形验证码' })
  @ApiResponse({ status: 200, description: '验证码生成成功', type: CaptchaResponseDto })
  async getCaptcha(): Promise<CaptchaResponseDto> {
    return this.captchaService.generateCaptcha();
  }

  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: '用户登录', description: '用户名密码登录，需要验证码' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '用户名或密码错误 / 验证码错误' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@Request() req) {
    return req.user;
  }

  // ========== 2FA相关接口 ==========

  @Get('2fa/generate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成2FA密钥和二维码' })
  @ApiResponse({ status: 200, description: '成功生成2FA密钥', type: TwoFactorSecretResponseDto })
  async generate2FASecret(@Request() req): Promise<TwoFactorSecretResponseDto> {
    const result = await this.authService.generate2FASecret(req.user.userId);
    // 临时保存密钥到数据库，待用户验证后正式启用
    await this.authService.save2FASecret(req.user.userId, result.secret);
    return result;
  }

  @Post('2fa/enable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '启用2FA', description: '使用TOTP验证码启用2FA' })
  @ApiResponse({ status: 200, description: '2FA启用成功' })
  @ApiResponse({ status: 401, description: '验证码错误' })
  async enable2FA(@Request() req, @Body() dto: Enable2FADto) {
    return this.authService.enable2FA(req.user.userId, dto.token);
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '禁用2FA', description: '使用TOTP验证码禁用2FA' })
  @ApiResponse({ status: 200, description: '2FA禁用成功' })
  @ApiResponse({ status: 401, description: '验证码错误' })
  async disable2FA(@Request() req, @Body() dto: Enable2FADto) {
    return this.authService.disable2FA(req.user.userId, dto.token);
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: '2FA登录验证', description: '用户名密码验证通过后，输入2FA验证码完成登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 401, description: '验证码错误' })
  async verify2FA(@Body() dto: Verify2FADto) {
    return this.authService.verify2FALogin(dto);
  }
}
