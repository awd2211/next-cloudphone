import { Injectable, NotFoundException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus } from '../entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CacheService } from '../cache/cache.service';
import * as crypto from 'crypto';

export interface ApiKeyWithSecret {
  apiKey: ApiKey;
  secret: string; // 只在创建时返回一次
}

// 重新导出 DTO 以便其他地方导入
export { CreateApiKeyDto };

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @Optional() private cacheService: CacheService
  ) {}

  /**
   * 创建 API 密钥
   */
  async createApiKey(dto: CreateApiKeyDto): Promise<ApiKeyWithSecret> {
    // 生成随机密钥
    const secret = this.generateSecret();
    const keyHash = this.hashKey(secret);
    const prefix = `cp_live_${secret.slice(0, 7)}`;

    const apiKey = this.apiKeyRepository.create({
      userId: dto.userId,
      name: dto.name,
      key: keyHash,
      prefix,
      status: ApiKeyStatus.ACTIVE,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt,
      description: dto.description,
      metadata: dto.metadata,
      usageCount: 0,
    });

    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    // ✅ 清除用户 API Keys 列表缓存
    await this.clearUserApiKeysCache(dto.userId);

    this.logger.log(`API 密钥已创建 - 用户: ${dto.userId}, 名称: ${dto.name}`);

    return {
      apiKey: savedApiKey,
      secret, // 明文密钥只返回一次
    };
  }

  /**
   * 验证 API 密钥
   */
  async validateApiKey(secret: string): Promise<ApiKey | null> {
    const keyHash = this.hashKey(secret);

    const apiKey = await this.apiKeyRepository.findOne({
      where: { key: keyHash },
      relations: ['user'],
    });

    if (!apiKey) {
      return null;
    }

    // 检查状态和过期时间
    if (!apiKey.isActive()) {
      if (apiKey.isExpired()) {
        apiKey.status = ApiKeyStatus.EXPIRED;
        await this.apiKeyRepository.save(apiKey);
      }
      return null;
    }

    // 更新使用统计
    apiKey.lastUsedAt = new Date();
    apiKey.usageCount += 1;
    await this.apiKeyRepository.save(apiKey);

    return apiKey;
  }

  /**
   * 获取所有 API 密钥列表（管理员）
   */
  async getAllApiKeys(options?: {
    status?: ApiKeyStatus;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ apiKeys: ApiKey[]; total: number }> {
    const queryBuilder = this.apiKeyRepository
      .createQueryBuilder('apiKey')
      .leftJoinAndSelect('apiKey.user', 'user');

    if (options?.status) {
      queryBuilder.andWhere('apiKey.status = :status', { status: options.status });
    }

    if (options?.userId) {
      queryBuilder.andWhere('apiKey.userId = :userId', { userId: options.userId });
    }

    queryBuilder.orderBy('apiKey.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    const apiKeys = await queryBuilder.getMany();

    return { apiKeys, total };
  }

  /**
   * 获取用户的 API 密钥列表
   * ✅ 添加缓存优化 (30秒 TTL - 中频访问)
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const cacheKey = `api-keys:user:${userId}`;

    // 尝试从缓存获取
    if (this.cacheService) {
      try {
        const cached = await this.cacheService.get<ApiKey[]>(cacheKey);
        if (cached) {
          this.logger.debug(`API Keys 列表缓存命中 - 用户: ${userId}`);
          return cached;
        }
      } catch (error) {
        this.logger.warn(`获取 API Keys 缓存失败: ${error.message}`);
      }
    }

    // 查询数据库
    const apiKeys = await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // 写入缓存 (30秒 TTL - 中频访问)
    if (this.cacheService) {
      try {
        await this.cacheService.set(cacheKey, apiKeys, { ttl: 30 });
        this.logger.debug(`API Keys 列表已缓存 - 用户: ${userId}, TTL: 30s`);
      } catch (error) {
        this.logger.warn(`写入 API Keys 缓存失败: ${error.message}`);
      }
    }

    return apiKeys;
  }

  /**
   * 获取 API 密钥详情
   */
  async getApiKey(apiKeyId: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId },
      relations: ['user'],
    });

    if (!apiKey) {
      throw new NotFoundException(`API 密钥 ${apiKeyId} 未找到`);
    }

    return apiKey;
  }

  /**
   * 更新 API 密钥
   */
  async updateApiKey(
    apiKeyId: string,
    updates: {
      name?: string;
      scopes?: string[];
      description?: string;
      expiresAt?: Date;
    }
  ): Promise<ApiKey> {
    const apiKey = await this.getApiKey(apiKeyId);

    if (updates.name) apiKey.name = updates.name;
    if (updates.scopes) apiKey.scopes = updates.scopes;
    if (updates.description) apiKey.description = updates.description;
    if (updates.expiresAt) apiKey.expiresAt = updates.expiresAt;

    const updatedApiKey = await this.apiKeyRepository.save(apiKey);

    // ✅ 清除用户 API Keys 列表缓存
    await this.clearUserApiKeysCache(apiKey.userId);

    this.logger.log(`API 密钥已更新 - ID: ${apiKeyId}`);

    return updatedApiKey;
  }

  /**
   * 撤销 API 密钥
   */
  async revokeApiKey(apiKeyId: string): Promise<ApiKey> {
    const apiKey = await this.getApiKey(apiKeyId);

    if (apiKey.status === ApiKeyStatus.REVOKED) {
      throw new BadRequestException('API 密钥已被撤销');
    }

    apiKey.status = ApiKeyStatus.REVOKED;
    const revokedApiKey = await this.apiKeyRepository.save(apiKey);

    // ✅ 清除用户 API Keys 列表缓存
    await this.clearUserApiKeysCache(apiKey.userId);

    this.logger.log(`API 密钥已撤销 - ID: ${apiKeyId}`);

    return revokedApiKey;
  }

  /**
   * 删除 API 密钥
   */
  async deleteApiKey(apiKeyId: string): Promise<void> {
    const apiKey = await this.getApiKey(apiKeyId);
    const userId = apiKey.userId;

    await this.apiKeyRepository.remove(apiKey);

    // ✅ 清除用户 API Keys 列表缓存
    await this.clearUserApiKeysCache(userId);

    this.logger.log(`API 密钥已删除 - ID: ${apiKeyId}`);
  }

  /**
   * 获取 API 密钥统计
   */
  async getApiKeyStatistics(userId: string): Promise<{
    totalKeys: number;
    activeKeys: number;
    revokedKeys: number;
    expiredKeys: number;
    totalUsage: number;
    mostUsedKey: ApiKey | null;
  }> {
    const keys = await this.getUserApiKeys(userId);

    const totalKeys = keys.length;
    const activeKeys = keys.filter((k) => k.status === ApiKeyStatus.ACTIVE).length;
    const revokedKeys = keys.filter((k) => k.status === ApiKeyStatus.REVOKED).length;
    const expiredKeys = keys.filter((k) => k.status === ApiKeyStatus.EXPIRED).length;
    const totalUsage = keys.reduce((sum, k) => sum + k.usageCount, 0);

    const mostUsedKey =
      keys.length > 0
        ? keys.reduce((max, k) => (!max || k.usageCount > max.usageCount ? k : max), keys[0])
        : null;

    return {
      totalKeys,
      activeKeys,
      revokedKeys,
      expiredKeys,
      totalUsage,
      mostUsedKey,
    };
  }

  // 私有辅助方法
  private generateSecret(): string {
    // 生成 32 字节的随机密钥，转换为 base64
    return crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, '');
  }

  private hashKey(secret: string): string {
    // 使用 SHA-256 哈希密钥
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * ✅ 清除用户 API Keys 列表缓存
   */
  private async clearUserApiKeysCache(userId: string): Promise<void> {
    if (!this.cacheService) return;

    try {
      const cacheKey = `api-keys:user:${userId}`;
      await this.cacheService.del(cacheKey);
      this.logger.debug(`API Keys 列表缓存已清除 - 用户: ${userId}`);
    } catch (error) {
      this.logger.error(`清除 API Keys 缓存失败: ${error.message}`, error.stack);
    }
  }
}
