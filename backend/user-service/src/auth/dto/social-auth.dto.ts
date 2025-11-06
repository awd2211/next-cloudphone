import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 社交登录提供商类型
 */
export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
}

/**
 * 获取社交登录授权URL请求
 */
export class GetSocialAuthUrlDto {
  @ApiProperty({
    description: '社交平台类型',
    enum: SocialProvider,
    example: SocialProvider.GOOGLE,
  })
  @IsEnum(SocialProvider)
  @IsNotEmpty()
  provider: SocialProvider;

  @ApiProperty({
    description: '回调后的重定向URL',
    example: 'http://localhost:5174/auth/callback',
    required: false,
  })
  @IsString()
  @IsOptional()
  redirectUrl?: string;
}

/**
 * 社交登录回调处理请求
 */
export class SocialAuthCallbackDto {
  @ApiProperty({
    description: '授权码',
    example: '4/0AY0e-g7...',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'State参数（CSRF保护）',
    example: 'random-state-string',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;
}

/**
 * 社交账号绑定请求
 */
export class BindSocialAccountDto {
  @ApiProperty({
    description: '授权码',
    example: '4/0AY0e-g7...',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'State参数（CSRF保护）',
    example: 'random-state-string',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;
}

/**
 * 社交登录响应
 */
export interface SocialAuthResponse {
  /**
   * JWT Token
   */
  token: string;

  /**
   * 用户信息
   */
  user: {
    id: string;
    username: string;
    email: string;
    fullName?: string;
    avatar?: string;
  };

  /**
   * 是否为新注册用户
   */
  isNewUser?: boolean;

  /**
   * 刷新 Token
   */
  refreshToken?: string;
}

/**
 * 社交账号信息
 */
export interface BoundSocialAccount {
  /**
   * 社交平台类型
   */
  provider: SocialProvider;

  /**
   * 社交平台用户ID
   */
  providerId: string;

  /**
   * 社交平台邮箱
   */
  email?: string;

  /**
   * 社交平台显示名称
   */
  displayName?: string;

  /**
   * 社交平台头像
   */
  avatar?: string;

  /**
   * 绑定时间
   */
  boundAt: Date;
}
