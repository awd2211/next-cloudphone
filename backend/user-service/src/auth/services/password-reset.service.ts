import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { ForgotPasswordDto, ResetPasswordDto, ResetType, ChangePasswordDto } from '../dto/password-reset.dto';
import { EventBusService } from '@cloudphone/shared';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly tokenExpirationHours: number;
  private readonly maxTokensPerUser: number;

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly eventBusService: EventBusService,
  ) {
    this.tokenExpirationHours = this.configService.get<number>('PASSWORD_RESET_TOKEN_HOURS', 1);
    this.maxTokensPerUser = this.configService.get<number>('MAX_RESET_TOKENS_PER_USER', 3);
  }

  /**
   * 发送密码重置链接
   */
  async forgotPassword(dto: ForgotPasswordDto, requestIp?: string, userAgent?: string): Promise<{ message: string }> {
    const { type, email, phone } = dto;

    // 验证参数
    if (type === ResetType.EMAIL && !email) {
      throw new BadRequestException('邮箱重置需要提供邮箱地址');
    }
    if (type === ResetType.PHONE && !phone) {
      throw new BadRequestException('手机重置需要提供手机号');
    }

    // 查找用户
    const user = await this.findUserByContact(type, email, phone);

    // 安全起见，即使用户不存在也返回成功消息（防止用户枚举）
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent user: ${email || phone}`);
      return { message: '如果该账号存在，重置链接已发送' };
    }

    // 检查用户是否被禁用
    if (!user.isActive) {
      this.logger.warn(`Password reset requested for disabled user: ${user.id}`);
      return { message: '如果该账号存在，重置链接已发送' };
    }

    // 清理该用户的旧令牌（限制数量）
    await this.cleanupOldTokens(user.id);

    // 生成新令牌
    const token = await this.createResetToken(user, type, requestIp, userAgent);

    // 发送通知（通过 RabbitMQ 事件发布到 notification-service）
    await this.sendResetNotification(user, type, token);

    return { message: '如果该账号存在，重置链接已发送' };
  }

  /**
   * 验证重置令牌
   */
  async verifyResetToken(token: string): Promise<{ valid: boolean; message?: string; userId?: string }> {
    const hashedToken = this.hashToken(token);

    const resetToken = await this.tokenRepository.findOne({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetToken) {
      return { valid: false, message: '令牌无效或已过期' };
    }

    return { valid: true, userId: resetToken.userId };
  }

  /**
   * 重置密码
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password } = dto;
    const hashedToken = this.hashToken(token);

    // 查找有效的重置令牌
    const resetToken = await this.tokenRepository.findOne({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetToken) {
      throw new BadRequestException('令牌无效或已过期');
    }

    // 查找用户
    const user = await this.userRepository.findOne({
      where: { id: resetToken.userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查新密码不能与旧密码相同
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      throw new BadRequestException('新密码不能与旧密码相同');
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    });

    // 标记令牌为已使用
    await this.tokenRepository.update(resetToken.id, {
      used: true,
      usedAt: new Date(),
    });

    // 清理该用户的所有其他重置令牌
    await this.tokenRepository.delete({
      userId: user.id,
      id: resetToken.id ? undefined : resetToken.id, // 排除当前令牌（已更新）
    });

    this.logger.log(`Password reset successful for user: ${user.id}`);

    return { message: '密码重置成功' };
  }

  /**
   * 修改密码（已登录用户）
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const { oldPassword, newPassword } = dto;

    // 查找用户
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('当前密码错误');
    }

    // 检查新密码不能与旧密码相同
    if (oldPassword === newPassword) {
      throw new BadRequestException('新密码不能与旧密码相同');
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
    });

    this.logger.log(`Password changed for user: ${userId}`);

    return { message: '密码修改成功' };
  }

  /**
   * 根据联系方式查找用户
   */
  private async findUserByContact(type: ResetType, email?: string, phone?: string): Promise<User | null> {
    if (type === ResetType.EMAIL && email) {
      return this.userRepository.findOne({ where: { email } });
    }
    if (type === ResetType.PHONE && phone) {
      return this.userRepository.findOne({ where: { phone } });
    }
    return null;
  }

  /**
   * 清理旧令牌
   */
  private async cleanupOldTokens(userId: string): Promise<void> {
    // 删除过期的令牌
    await this.tokenRepository.delete({
      userId,
      expiresAt: MoreThan(new Date()),
    });

    // 检查剩余令牌数量
    const existingTokens = await this.tokenRepository.count({
      where: { userId, used: false },
    });

    if (existingTokens >= this.maxTokensPerUser) {
      // 删除最旧的令牌
      const oldestTokens = await this.tokenRepository.find({
        where: { userId, used: false },
        order: { createdAt: 'ASC' },
        take: existingTokens - this.maxTokensPerUser + 1,
      });

      for (const token of oldestTokens) {
        await this.tokenRepository.delete(token.id);
      }
    }
  }

  /**
   * 创建重置令牌
   */
  private async createResetToken(
    user: User,
    type: ResetType,
    requestIp?: string,
    userAgent?: string,
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.tokenExpirationHours);

    // 脱敏目标
    const target = type === ResetType.EMAIL
      ? this.maskEmail(user.email || '')
      : this.maskPhone(user.phone || '');

    const resetToken = this.tokenRepository.create({
      userId: user.id,
      token: hashedToken,
      type,
      target,
      expiresAt,
      requestIp,
      userAgent,
    });

    await this.tokenRepository.save(resetToken);

    return rawToken;
  }

  /**
   * 哈希令牌
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 脱敏邮箱
   */
  private maskEmail(email: string): string {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = localPart.length > 2
      ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
      : localPart[0] + '*';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * 脱敏手机号
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) return phone;
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }

  /**
   * 发送重置通知
   * ✅ 已集成 notification-service（通过 RabbitMQ 事件）
   */
  private async sendResetNotification(user: User, type: ResetType, token: string): Promise<void> {
    // 计算过期时间
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.tokenExpirationHours);

    // 获取用户角色（默认为 'user'）
    const userWithRoles = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['roles'],
    });
    const userRole = userWithRoles?.roles?.[0]?.name || 'user';

    if (type === ResetType.EMAIL && user.email) {
      // 发送邮件通知事件
      try {
        await this.eventBusService.publish(
          'cloudphone.events',
          'user.password_reset_requested',
          {
            eventType: 'user.password_reset_requested',
            timestamp: new Date().toISOString(),
            source: 'user-service',
            payload: {
              userId: user.id,
              username: user.username,
              email: user.email,
              userRole,
              resetToken: token,
              expiresAt: expiresAt.toISOString(),
            },
          },
        );

        this.logger.log(`Password reset event published for user: ${user.id} (email: ${user.email})`);
      } catch (error) {
        this.logger.error(`Failed to publish password reset event: ${error.message}`, error.stack);
        // 不抛出错误，让用户继续收到成功响应（安全考虑）
      }
    } else if (type === ResetType.PHONE && user.phone) {
      // 发送短信通知事件
      try {
        await this.eventBusService.publish(
          'cloudphone.events',
          'user.password_reset_sms_requested',
          {
            eventType: 'user.password_reset_sms_requested',
            timestamp: new Date().toISOString(),
            source: 'user-service',
            payload: {
              userId: user.id,
              username: user.username,
              phone: user.phone,
              userRole,
              resetCode: token.substring(0, 6), // 短信只发送6位验证码
              expiresAt: expiresAt.toISOString(),
            },
          },
        );

        this.logger.log(`Password reset SMS event published for user: ${user.id} (phone: ${this.maskPhone(user.phone)})`);
      } catch (error) {
        this.logger.error(`Failed to publish password reset SMS event: ${error.message}`, error.stack);
      }
    }
  }
}
