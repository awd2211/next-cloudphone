import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus } from '../entities/api-key.entity';
import * as crypto from 'crypto';

export interface CreateApiKeyDto {
  userId: string;
  name: string;
  scopes: string[];
  expiresAt?: Date;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ApiKeyWithSecret {
  apiKey: ApiKey;
  secret: string; // 只在创建时返回一次
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * 创建 API 密钥
   */
  async createApiKey(dto: CreateApiKeyDto): Promise<ApiKeyWithSecret> {
    // 生成随机密钥
    const secret = this.generateSecret();
    const keyHash = this.hashKey(secret);
    const prefix = 'cp_live_' + secret.slice(0, 7);

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
   * 获取用户的 API 密钥列表
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
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
    },
  ): Promise<ApiKey> {
    const apiKey = await this.getApiKey(apiKeyId);

    if (updates.name) apiKey.name = updates.name;
    if (updates.scopes) apiKey.scopes = updates.scopes;
    if (updates.description) apiKey.description = updates.description;
    if (updates.expiresAt) apiKey.expiresAt = updates.expiresAt;

    const updatedApiKey = await this.apiKeyRepository.save(apiKey);
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

    this.logger.log(`API 密钥已撤销 - ID: ${apiKeyId}`);

    return revokedApiKey;
  }

  /**
   * 删除 API 密钥
   */
  async deleteApiKey(apiKeyId: string): Promise<void> {
    const apiKey = await this.getApiKey(apiKeyId);
    await this.apiKeyRepository.remove(apiKey);

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

    const mostUsedKey = keys.length > 0 ? keys.reduce((max, k) =>
      !max || k.usageCount > max.usageCount ? k : max,
    keys[0]) : null;

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
}
