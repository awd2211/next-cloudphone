import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CaptchaService } from './services/captcha.service';
import { CaptchaResponseDto } from './dto/captcha.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
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
}
