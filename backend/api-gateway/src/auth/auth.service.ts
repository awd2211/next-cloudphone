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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:30001';

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private httpService: HttpService,
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
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // 查找用户
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 JWT token
    const token = this.jwtService.sign({ sub: user.id, username: user.username });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
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
}
