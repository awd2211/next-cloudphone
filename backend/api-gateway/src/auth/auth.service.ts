import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CaptchaService } from './services/captcha.service';
import { TwoFactorService } from './services/two-factor.service';
import { Verify2FADto } from './dto/two-factor.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:30001';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private httpService: HttpService,
    private captchaService: CaptchaService,
    private twoFactorService: TwoFactorService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    // 检查用户是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    // 生成 JWT token
    const token = this.jwtService.sign({ sub: user.id, username: user.username });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles?.map(r => r.name) || [],
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { username, password, captcha, captchaId } = loginDto;

    // 1. 验证验证码（开发环境可跳过）
    const isDev = process.env.NODE_ENV === 'development';
    const isCaptchaValid = isDev
      ? true  // 开发环境跳过验证码检查
      : await this.captchaService.verifyCaptcha(captchaId, captcha);

    if (!isCaptchaValid) {
      this.logger.warn(`Invalid captcha for user: ${username}`);
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 2. 查找用户
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 3. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 4. 检查是否启用了2FA
    if (user.twoFactorEnabled) {
      this.logger.log(`User ${username} requires 2FA verification`);
      return {
        requiresTwoFactor: true,
        message: '请输入双因素认证代码',
      };
    }

    // 5. 生成 JWT token
    const token = this.jwtService.sign({ sub: user.id, username: user.username });

    this.logger.log(`User logged in successfully: ${username}`);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles?.map(r => r.name) || [],
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async validateUser(userId: string) {
    try {
      // 首先从本地数据库获取基本用户信息
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        return null;
      }

      // 调用 User Service 获取完整的用户信息（包括角色和权限）
      const fullUserInfo = await this.getUserWithPermissions(userId);

      return fullUserInfo;
    } catch (error) {
      this.logger.error(`Failed to validate user ${userId}:`, error);
      // 如果调用 User Service 失败，返回基本用户信息
      return this.userRepository.findOne({ where: { id: userId } });
    }
  }

  /**
   * 从 User Service 获取用户的完整信息（包括角色和权限）
   */
  private async getUserWithPermissions(userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.userServiceUrl}/users/${userId}`)
      );

      const userData = response.data.data || response.data;

      // 提取角色和权限
      const roles = userData.roles?.map((role: any) => role.name) || [];
      const permissions = this.extractPermissions(userData.roles);

      return {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        status: userData.status,
        tenantId: userData.tenantId,
        roles,
        permissions,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch user details from User Service: ${error.message}`);
      throw error;
    }
  }

  /**
   * 从角色中提取所有权限
   */
  private extractPermissions(roles: any[]): string[] {
    if (!roles || roles.length === 0) {
      return [];
    }

    const permissions = new Set<string>();

    for (const role of roles) {
      if (role.permissions && Array.isArray(role.permissions)) {
        for (const permission of role.permissions) {
          // 权限格式：resource.action (例如: users.create, devices.read)
          const permissionString = `${permission.resource}.${permission.action}`;
          permissions.add(permissionString);
        }
      }
    }

    return Array.from(permissions);
  }

  // ========== 2FA相关方法 ==========

  /**
   * 生成2FA密钥和二维码
   */
  async generate2FASecret(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return this.twoFactorService.generateSecret(user.username);
  }

  /**
   * 启用2FA
   */
  async enable2FA(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 如果已经有临时密钥，则验证；否则需要先生成
    if (!user.twoFactorSecret) {
      throw new UnauthorizedException('请先生成2FA密钥');
    }

    // 验证TOTP代码
    const isValid = this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('验证码错误');
    }

    // 启用2FA
    user.twoFactorEnabled = true;
    await this.userRepository.save(user);

    this.logger.log(`2FA enabled for user: ${user.username}`);

    return {
      message: '双因素认证已启用',
      twoFactorEnabled: true,
    };
  }

  /**
   * 禁用2FA
   */
  async disable2FA(userId: string, token: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (!user.twoFactorEnabled) {
      throw new UnauthorizedException('双因素认证未启用');
    }

    // 验证TOTP代码
    const isValid = this.twoFactorService.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('验证码错误');
    }

    // 禁用2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.userRepository.save(user);

    this.logger.log(`2FA disabled for user: ${user.username}`);

    return {
      message: '双因素认证已禁用',
      twoFactorEnabled: false,
    };
  }

  /**
   * 2FA登录验证（第二步）
   */
  async verify2FALogin(dto: Verify2FADto) {
    const { username, password, captcha, captchaId, twoFactorToken } = dto;

    // 1. 验证图形验证码
    const isCaptchaValid = await this.captchaService.verifyCaptcha(captchaId, captcha);
    if (!isCaptchaValid) {
      this.logger.warn(`Invalid captcha for user: ${username}`);
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 2. 查找用户并验证密码
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 3. 验证2FA是否启用
    if (!user.twoFactorEnabled) {
      throw new UnauthorizedException('该用户未启用双因素认证');
    }

    // 4. 验证TOTP代码
    const isValid = this.twoFactorService.verifyToken(twoFactorToken, user.twoFactorSecret);
    if (!isValid) {
      this.logger.warn(`Invalid 2FA token for user: ${username}`);
      throw new UnauthorizedException('双因素认证代码错误');
    }

    // 5. 生成 JWT token
    const token = this.jwtService.sign({ sub: user.id, username: user.username });

    this.logger.log(`User logged in successfully with 2FA: ${username}`);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles?.map(r => r.name) || [],
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  /**
   * 临时保存2FA密钥（用于启用流程）
   */
  async save2FASecret(userId: string, secret: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    user.twoFactorSecret = secret;
    await this.userRepository.save(user);
  }
}
