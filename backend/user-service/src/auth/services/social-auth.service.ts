import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as crypto from 'crypto';
import { User, UserStatus } from '../../entities/user.entity';
import { SocialAccount } from '../../entities/social-account.entity';
import {
  SocialProvider,
  SocialAuthCallbackDto,
  SocialAuthResponse,
  BoundSocialAccount,
} from '../dto/social-auth.dto';

/**
 * 社交账号认证服务
 *
 * 功能：
 * - OAuth 2.0 授权码流程
 * - 用户注册/登录
 * - 社交账号绑定/解绑
 * - Token 管理
 */
@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SocialAccount)
    private readonly socialAccountRepository: Repository<SocialAccount>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取 OAuth 授权 URL
   */
  async getAuthUrl(provider: SocialProvider, redirectUrl?: string): Promise<{ authUrl: string; state: string }> {
    const state = this.generateState();
    const config = this.getProviderConfig(provider);

    const finalRedirectUrl = redirectUrl || this.configService.get<string>('SOCIAL_AUTH_CALLBACK_URL') || '';

    let authUrl: string;

    switch (provider) {
      case SocialProvider.GOOGLE:
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${config.clientId}&` +
          `redirect_uri=${encodeURIComponent(finalRedirectUrl)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('openid email profile')}&` +
          `state=${state}&` +
          `access_type=offline&` +
          `prompt=consent`;
        break;

      case SocialProvider.FACEBOOK:
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
          `client_id=${config.clientId}&` +
          `redirect_uri=${encodeURIComponent(finalRedirectUrl)}&` +
          `scope=${encodeURIComponent('email,public_profile')}&` +
          `state=${state}&` +
          `response_type=code`;
        break;

      case SocialProvider.TWITTER:
        authUrl = `https://twitter.com/i/oauth2/authorize?` +
          `client_id=${config.clientId}&` +
          `redirect_uri=${encodeURIComponent(finalRedirectUrl)}&` +
          `scope=${encodeURIComponent('tweet.read users.read offline.access')}&` +
          `state=${state}&` +
          `response_type=code&` +
          `code_challenge=challenge&` +
          `code_challenge_method=plain`;
        break;

      default:
        throw new BadRequestException('不支持的社交平台');
    }

    return { authUrl, state };
  }

  /**
   * 处理 OAuth 回调，完成登录/注册
   */
  async handleCallback(
    provider: SocialProvider,
    dto: SocialAuthCallbackDto,
    redirectUrl?: string,
  ): Promise<SocialAuthResponse> {
    try {
      // 1. 使用授权码交换 access_token
      const tokenData = await this.exchangeToken(provider, dto.code, redirectUrl);

      // 2. 获取用户信息
      const profileData = await this.getUserProfile(provider, tokenData.access_token);

      // 3. 查找或创建社交账号绑定
      let socialAccount = await this.socialAccountRepository.findOne({
        where: {
          provider,
          providerId: profileData.id,
        },
        relations: ['user'],
      });

      let user: User;
      let isNewUser = false;

      if (socialAccount) {
        // 已有绑定，更新登录信息
        user = socialAccount.user;
        socialAccount.lastLoginAt = new Date();
        socialAccount.accessToken = this.encryptToken(tokenData.access_token);
        if (tokenData.refresh_token) {
          socialAccount.refreshToken = this.encryptToken(tokenData.refresh_token);
        }
        if (tokenData.expires_in) {
          socialAccount.tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
        }
        await this.socialAccountRepository.save(socialAccount);

        this.logger.log(`User ${user.id} logged in via ${provider}`);
      } else {
        // 新用户，创建账号
        const existingUser = await this.userRepository.findOne({
          where: { email: profileData.email },
        });

        if (existingUser) {
          // 邮箱已存在，绑定到现有账号
          user = existingUser;
        } else {
          // 创建新用户
          user = this.userRepository.create({
            email: profileData.email,
            username: this.generateUsername(profileData.email),
            password: this.generateRandomPassword(), // 随机密码
            fullName: profileData.name,
            avatar: profileData.picture,
            status: UserStatus.ACTIVE,
          });
          user = await this.userRepository.save(user);
          isNewUser = true;

          this.logger.log(`New user created via ${provider} social login: ${user.id}`);
        }

        // 创建社交账号绑定
        const accountData = {
          provider,
          providerId: profileData.id,
          email: profileData.email,
          displayName: profileData.name,
          avatar: profileData.picture,
          accessToken: this.encryptToken(tokenData.access_token),
          refreshToken: tokenData.refresh_token ? this.encryptToken(tokenData.refresh_token) : undefined,
          tokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : undefined,
          rawProfile: profileData,
          lastLoginAt: new Date(),
          userId: user.id,
        };
        socialAccount = this.socialAccountRepository.create(accountData);
        await this.socialAccountRepository.save(socialAccount);

        this.logger.log(`Social account ${provider} bound to user ${user.id}`);
      }

      // 4. 生成 JWT Token
      const jwtToken = await this.generateJwtToken(user);

      return {
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
        },
        isNewUser,
      };
    } catch (error) {
      this.logger.error(`Social auth callback error for ${provider}:`, error);
      throw new UnauthorizedException(`社交登录失败: ${error.message}`);
    }
  }

  /**
   * 绑定社交账号到已登录用户
   */
  async bindAccount(
    userId: string,
    provider: SocialProvider,
    dto: SocialAuthCallbackDto,
    redirectUrl?: string,
  ): Promise<BoundSocialAccount> {
    try {
      // 1. 交换 token
      const tokenData = await this.exchangeToken(provider, dto.code, redirectUrl);

      // 2. 获取用户信息
      const profileData = await this.getUserProfile(provider, tokenData.access_token);

      // 3. 检查是否已被其他用户绑定
      const existingAccount = await this.socialAccountRepository.findOne({
        where: {
          provider,
          providerId: profileData.id,
        },
      });

      if (existingAccount && existingAccount.userId !== userId) {
        throw new BadRequestException('该社交账号已被其他用户绑定');
      }

      // 4. 检查当前用户是否已绑定此平台
      const userAccount = await this.socialAccountRepository.findOne({
        where: {
          userId,
          provider,
        },
      });

      if (userAccount) {
        throw new BadRequestException(`您已绑定 ${provider} 账号`);
      }

      // 5. 创建绑定
      const accountData = {
        provider,
        providerId: profileData.id,
        email: profileData.email,
        displayName: profileData.name,
        avatar: profileData.picture,
        accessToken: this.encryptToken(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? this.encryptToken(tokenData.refresh_token) : undefined,
        tokenExpiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : undefined,
        rawProfile: profileData,
        userId,
      };
      const socialAccount = this.socialAccountRepository.create(accountData);

      const saved: SocialAccount = await this.socialAccountRepository.save(socialAccount);

      this.logger.log(`User ${userId} bound ${provider} account`);

      return {
        provider: saved.provider as SocialProvider,
        providerId: saved.providerId,
        email: saved.email,
        displayName: saved.displayName,
        avatar: saved.avatar,
        boundAt: saved.createdAt,
      };
    } catch (error) {
      this.logger.error(`Bind account error for ${provider}:`, error);
      throw new BadRequestException(`绑定失败: ${error.message}`);
    }
  }

  /**
   * 解绑社交账号
   */
  async unbindAccount(userId: string, provider: SocialProvider): Promise<void> {
    const account = await this.socialAccountRepository.findOne({
      where: {
        userId,
        provider,
      },
    });

    if (!account) {
      throw new BadRequestException('未找到绑定的社交账号');
    }

    await this.socialAccountRepository.remove(account);
    this.logger.log(`User ${userId} unbound ${provider} account`);
  }

  /**
   * 获取用户绑定的所有社交账号
   */
  async getBoundAccounts(userId: string): Promise<BoundSocialAccount[]> {
    const accounts = await this.socialAccountRepository.find({
      where: { userId },
    });

    return accounts.map((account) => ({
      provider: account.provider as SocialProvider,
      providerId: account.providerId,
      email: account.email,
      displayName: account.displayName,
      avatar: account.avatar,
      boundAt: account.createdAt,
    }));
  }

  /**
   * 使用授权码交换 access_token
   */
  private async exchangeToken(provider: SocialProvider, code: string, redirectUrl?: string): Promise<any> {
    const config = this.getProviderConfig(provider);

    const finalRedirectUrl = redirectUrl || this.configService.get<string>('SOCIAL_AUTH_CALLBACK_URL') || '';

    let tokenEndpoint: string;
    let requestData: any;

    switch (provider) {
      case SocialProvider.GOOGLE:
        tokenEndpoint = 'https://oauth2.googleapis.com/token';
        requestData = {
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: finalRedirectUrl,
          grant_type: 'authorization_code',
        };
        break;

      case SocialProvider.FACEBOOK:
        tokenEndpoint = 'https://graph.facebook.com/v18.0/oauth/access_token';
        requestData = {
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: finalRedirectUrl,
        };
        break;

      case SocialProvider.TWITTER:
        tokenEndpoint = 'https://api.twitter.com/2/oauth2/token';
        requestData = {
          code,
          grant_type: 'authorization_code',
          client_id: config.clientId,
          redirect_uri: finalRedirectUrl,
          code_verifier: 'challenge',
        };
        break;

      default:
        throw new BadRequestException('不支持的社交平台');
    }

    const response = await axios.post(tokenEndpoint, requestData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  }

  /**
   * 获取用户资料
   */
  private async getUserProfile(provider: SocialProvider, accessToken: string): Promise<any> {
    let profileEndpoint: string;

    switch (provider) {
      case SocialProvider.GOOGLE:
        profileEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
        break;

      case SocialProvider.FACEBOOK:
        profileEndpoint = 'https://graph.facebook.com/me?fields=id,name,email,picture';
        break;

      case SocialProvider.TWITTER:
        profileEndpoint = 'https://api.twitter.com/2/users/me?user.fields=profile_image_url';
        break;

      default:
        throw new BadRequestException('不支持的社交平台');
    }

    const response = await axios.get(profileEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 标准化返回格式
    const data = response.data;
    if (provider === SocialProvider.TWITTER) {
      return {
        id: data.data.id,
        email: data.data.username + '@twitter.placeholder',
        name: data.data.name,
        picture: data.data.profile_image_url,
      };
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture?.data?.url || data.picture,
    };
  }

  /**
   * 获取平台配置
   */
  private getProviderConfig(provider: SocialProvider) {
    let clientId: string | undefined;
    let clientSecret: string | undefined;

    switch (provider) {
      case SocialProvider.GOOGLE:
        clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
        break;

      case SocialProvider.FACEBOOK:
        clientId = this.configService.get<string>('FACEBOOK_APP_ID');
        clientSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
        break;

      case SocialProvider.TWITTER:
        clientId = this.configService.get<string>('TWITTER_CLIENT_ID');
        clientSecret = this.configService.get<string>('TWITTER_CLIENT_SECRET');
        break;

      default:
        throw new BadRequestException('不支持的社交平台');
    }

    if (!clientId || !clientSecret) {
      throw new BadRequestException(`${provider} 配置不完整`);
    }

    return { clientId, clientSecret };
  }

  /**
   * 生成 JWT Token
   */
  private async generateJwtToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * 生成随机 state 参数（CSRF 保护）
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 从邮箱生成用户名
   */
  private generateUsername(email: string): string {
    const prefix = email.split('@')[0];
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}${random}`;
  }

  /**
   * 生成随机密码
   */
  private generateRandomPassword(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 加密 Token（简单示例，生产环境应使用更安全的加密方式）
   */
  private encryptToken(token: string): string {
    // 这里应该使用加密算法，例如 AES
    // 为简化示例，直接返回
    return token;
  }

  /**
   * 解密 Token
   */
  private decryptToken(encrypted: string): string {
    return encrypted;
  }
}
