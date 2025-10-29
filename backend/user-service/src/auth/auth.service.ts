import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserStatus } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CaptchaService } from './services/captcha.service';
import { CacheService, CacheLayer } from '../cache/cache.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private captchaService: CaptchaService,
    private cacheService: CacheService,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * 获取验证码
   */
  async getCaptcha() {
    return this.captchaService.generate();
  }

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto) {
    const { username, email, password } = registerDto;

    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException('用户名已存在');
      }
      if (existingUser.email === email) {
        throw new ConflictException('邮箱已存在');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      fullName: registerDto.fullName,
      status: UserStatus.ACTIVE,
    });

    await this.userRepository.save(user);

    this.logger.log(`User registered: ${username}`);

    return {
      success: true,
      message: '注册成功',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  /**
   * 用户登录
   *
   * Issue #5 修复: 使用事务和悲观锁防止登录失败计数器的竞态条件
   *
   * 修复前问题:
   * - 读取 loginAttempts 和更新 loginAttempts 不在同一事务中
   * - 并发登录请求可能导致计数器不准确
   * - 可能导致账号锁定逻辑失效
   *
   * 修复后:
   * - 使用 FOR UPDATE 悲观锁锁定用户记录
   * - 所有读写操作在同一事务中执行
   * - 确保 loginAttempts 计数器准确
   */
  async login(loginDto: LoginDto) {
    const { username, password, captcha, captchaId } = loginDto;

    // 1. 验证验证码（开发环境可跳过）
    const isDev = process.env.NODE_ENV === 'development';
    const isCaptchaValid = isDev
      ? true  // 开发环境跳过验证码检查
      : await this.captchaService.verify(captchaId, captcha);

    if (!isCaptchaValid) {
      this.logger.warn(`Invalid captcha for user: ${username}`);
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 2. 创建 QueryRunner 用于事务管理
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. 使用悲观锁查找用户（FOR UPDATE）
      // 这将锁定用户记录，防止并发修改
      const user = await queryRunner.manager
        .createQueryBuilder(User, 'user')
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('user.username = :username', { username })
        .setLock('pessimistic_write') // 悲观锁
        .getOne();

      // 4. 防止时序攻击：无论用户是否存在，都执行密码哈希比较
      // 如果用户不存在，使用虚拟密码哈希，确保响应时间一致
      const passwordHash = user?.password || await bcrypt.hash('dummy_password_to_prevent_timing_attack', 10);
      const isPasswordValid = await bcrypt.compare(password, passwordHash);

      // 5. 统一验证：用户不存在或密码错误都返回相同错误
      if (!user || !isPasswordValid) {
        this.logger.warn(`Login failed for username: ${username}`);

        // 如果用户存在但密码错误，增加失败次数
        if (user && !isPasswordValid) {
          user.loginAttempts += 1;

          // 如果失败次数超过5次，锁定账号30分钟
          if (user.loginAttempts >= 5) {
            user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
            await queryRunner.manager.save(User, user);
            await queryRunner.commitTransaction();

            this.logger.warn(`Account locked due to too many failed attempts: ${username}`);
            throw new UnauthorizedException('登录失败次数过多，账号已被锁定30分钟');
          }

          await queryRunner.manager.save(User, user);
        }

        // 提交事务（如果有更新）
        await queryRunner.commitTransaction();
        throw new UnauthorizedException('用户名或密码错误');
      }

      // 6. 检查用户状态
      if (user.status !== UserStatus.ACTIVE) {
        await queryRunner.rollbackTransaction();
        throw new UnauthorizedException('账号已被禁用或删除');
      }

      // 7. 检查账号锁定
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await queryRunner.rollbackTransaction();
        const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw new UnauthorizedException(`账号已被锁定，请 ${remainingTime} 分钟后再试`);
      }

      // 8. 重置登录失败次数和更新登录信息
      user.loginAttempts = 0;
      user.lockedUntil = null as any;
      user.lastLoginAt = new Date();
      user.lastLoginIp = ''; // 可以从 request 中获取
      await queryRunner.manager.save(User, user);

      // 9. 提交事务
      await queryRunner.commitTransaction();

      // 10. 生成 JWT Token
      const payload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        tenantId: user.tenantId,
        roles: user.roles?.map(r => r.name) || [],
        permissions: user.roles?.flatMap(r => r.permissions?.map(p => `${p.resource}:${p.action}`)) || [],
      };

      const token = this.jwtService.sign(payload);

      this.logger.log(`User logged in successfully: ${username}`);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          roles: user.roles?.map(r => r.name) || [],
          tenantId: user.tenantId,
          isSuperAdmin: user.isSuperAdmin,
        },
      };
    } catch (error) {
      // 发生错误，回滚事务（如果还在事务中）
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      // 重新抛出错误
      throw error;
    } finally {
      // 释放 QueryRunner
      await queryRunner.release();
    }
  }

  /**
   * 登出（将 Token 加入黑名单）
   */
  async logout(userId: string, token?: string) {
    if (token) {
      try {
        // 解析 Token 获取过期时间
        const decoded = this.jwtService.decode(token) as { exp: number };

        if (decoded && decoded.exp) {
          // 计算剩余有效时间（秒）
          const now = Math.floor(Date.now() / 1000);
          const ttl = decoded.exp - now;

          // 只有 Token 还未过期才需要加入黑名单
          if (ttl > 0) {
            const blacklistKey = `blacklist:token:${token}`;
            await this.cacheService.set(blacklistKey, '1', {
              ttl,
              layer: CacheLayer.L2_ONLY, // 只存储在 Redis，不占用本地缓存
            });

            this.logger.log(`Token blacklisted for user ${userId}, expires in ${ttl}s`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to blacklist token: ${error.message}`);
        // 不影响登出流程，继续执行
      }
    }

    this.logger.log(`User logged out: ${userId}`);

    return {
      success: true,
      message: '登出成功',
    };
  }

  /**
   * 检查 Token 是否在黑名单中
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistKey = `blacklist:token:${token}`;
    return await this.cacheService.exists(blacklistKey);
  }

  /**
   * 获取用户信息 (优化: 使用 QueryBuilder 避免 N+1 查询)
   */
  async getProfile(userId: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const { password, ...userWithoutPassword } = user;

    return {
      success: true,
      data: userWithoutPassword,
    };
  }

  /**
   * 刷新 Token (优化: 使用 QueryBuilder 避免 N+1 查询)
   */
  async refreshToken(userId: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles?.map(r => r.name) || [],
      permissions: user.roles?.flatMap(r => r.permissions?.map(p => `${p.resource}:${p.action}`)) || [],
    };

    const token = this.jwtService.sign(payload);

    return {
      success: true,
      token,
    };
  }

  /**
   * 验证用户（供 JWT Strategy 使用）
   */
  async validateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles?.map(r => r.name) || [],
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}

