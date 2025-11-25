import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

import {
  EncryptionKey,
  KeyType,
  KeyStatus,
  EncryptionAlgorithm,
} from '../entities/encryption-key.entity';
import {
  EncryptionAudit,
  EncryptionOperation,
  OperationResult,
  EncryptedResourceType,
} from '../entities/encryption-audit.entity';
import {
  CreateKeyDto,
  RotateKeyDto,
  RevokeKeyDto,
  QueryKeysDto,
  EncryptDataDto,
  DecryptDataDto,
  InitSessionEncryptionDto,
  SessionKeyExchangeDto,
  QueryAuditLogsDto,
  KeyResponse,
  EncryptionResult,
  DecryptionResult,
  SessionEncryptionInfo,
  AuditLogResponse,
  EncryptionStatsResponse,
} from './dto';

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag?: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly enabled: boolean;
  private readonly masterKey: string;
  private readonly defaultAlgorithm: EncryptionAlgorithm;

  constructor(
    @InjectRepository(EncryptionKey)
    private keyRepository: Repository<EncryptionKey>,
    @InjectRepository(EncryptionAudit)
    private auditRepository: Repository<EncryptionAudit>,
    private configService: ConfigService,
  ) {
    this.enabled = configService.get('ENCRYPTION_ENABLED', true);
    this.masterKey = configService.get('ENCRYPTION_MASTER_KEY', 'your-32-character-master-key!!!');
    this.defaultAlgorithm = configService.get(
      'ENCRYPTION_ALGORITHM',
      EncryptionAlgorithm.AES_256_GCM,
    ) as EncryptionAlgorithm;

    if (this.enabled && this.masterKey.length < 32) {
      this.logger.warn('Master encryption key should be at least 32 characters for AES-256');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // ========== Key Management ==========

  async createKey(
    tenantId: string,
    dto: CreateKeyDto,
    createdBy: string,
  ): Promise<KeyResponse> {
    const startTime = Date.now();

    try {
      // 生成新密钥
      const keyLength = dto.keyLength || 256;
      const rawKey = crypto.randomBytes(keyLength / 8);

      // 使用主密钥加密存储
      const { encrypted, iv, authTag } = this.encryptWithMasterKey(rawKey.toString('base64'));

      // 生成密钥指纹
      const fingerprint = crypto
        .createHash('sha256')
        .update(rawKey)
        .digest('hex')
        .substring(0, 16);

      // 计算有效期
      let validUntil: Date | undefined;
      if (dto.validDays) {
        validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + dto.validDays);
      }

      const key = this.keyRepository.create({
        tenantId,
        name: dto.name,
        keyType: dto.keyType,
        status: KeyStatus.ACTIVE,
        encryptedKeyMaterial: encrypted,
        iv,
        version: 1,
        algorithm: dto.algorithm || this.defaultAlgorithm,
        keyLength,
        conversationId: dto.conversationId,
        fingerprint,
        validUntil,
        createdBy,
        metadata: {
          purpose: dto.purpose,
          tags: dto.tags,
          rotationPolicy: dto.autoRotate ? {
            autoRotate: true,
            rotationIntervalDays: dto.rotationIntervalDays || 90,
          } : undefined,
          usageCount: 0,
        },
      });

      // 如果有 authTag，存储在 metadata 中
      if (authTag) {
        key.metadata = { ...key.metadata, authTag };
      }

      const savedKey = await this.keyRepository.save(key);

      // 记录审计日志
      await this.logAudit({
        tenantId,
        operation: EncryptionOperation.KEY_GENERATE,
        result: OperationResult.SUCCESS,
        keyId: savedKey.id,
        keyVersion: 1,
        performedBy: createdBy,
        performedByType: 'agent',
        processingTimeMs: Date.now() - startTime,
        details: {
          keyFingerprint: fingerprint,
        },
      });

      this.logger.log(`Created encryption key ${savedKey.id} for tenant ${tenantId}`);

      return this.mapKeyToResponse(savedKey);
    } catch (error) {
      await this.logAudit({
        tenantId,
        operation: EncryptionOperation.KEY_GENERATE,
        result: OperationResult.FAILURE,
        performedBy: createdBy,
        performedByType: 'agent',
        errorMessage: error.message,
        processingTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async rotateKey(
    tenantId: string,
    keyId: string,
    dto: RotateKeyDto,
    performedBy: string,
  ): Promise<KeyResponse> {
    const startTime = Date.now();

    const existingKey = await this.keyRepository.findOne({
      where: { id: keyId, tenantId, status: KeyStatus.ACTIVE },
    });

    if (!existingKey) {
      throw new NotFoundException('Active key not found');
    }

    try {
      // 生成新密钥
      const keyLength = dto.newKeyLength || existingKey.keyLength;
      const rawKey = crypto.randomBytes(keyLength / 8);
      const { encrypted, iv, authTag } = this.encryptWithMasterKey(rawKey.toString('base64'));
      const fingerprint = crypto
        .createHash('sha256')
        .update(rawKey)
        .digest('hex')
        .substring(0, 16);

      // 标记旧密钥为已轮换
      existingKey.status = dto.expireOldKeyImmediately
        ? KeyStatus.EXPIRED
        : KeyStatus.ROTATED;
      existingKey.rotatedAt = new Date();
      await this.keyRepository.save(existingKey);

      // 创建新密钥
      const newKey = this.keyRepository.create({
        tenantId,
        name: existingKey.name,
        keyType: existingKey.keyType,
        status: KeyStatus.ACTIVE,
        encryptedKeyMaterial: encrypted,
        iv,
        version: existingKey.version + 1,
        algorithm: existingKey.algorithm,
        keyLength,
        conversationId: existingKey.conversationId,
        fingerprint,
        validUntil: existingKey.validUntil,
        createdBy: performedBy,
        metadata: {
          ...existingKey.metadata,
          authTag,
          usageCount: 0,
        },
      });

      const savedKey = await this.keyRepository.save(newKey);

      // 记录审计日志
      await this.logAudit({
        tenantId,
        operation: EncryptionOperation.KEY_ROTATE,
        result: OperationResult.SUCCESS,
        keyId: savedKey.id,
        keyVersion: savedKey.version,
        performedBy,
        performedByType: 'agent',
        processingTimeMs: Date.now() - startTime,
        details: {
          reason: dto.reason,
          previousKeyVersion: existingKey.version,
          newKeyVersion: savedKey.version,
          keyFingerprint: fingerprint,
        },
      });

      this.logger.log(`Rotated key ${keyId} to version ${savedKey.version}`);

      return this.mapKeyToResponse(savedKey);
    } catch (error) {
      await this.logAudit({
        tenantId,
        operation: EncryptionOperation.KEY_ROTATE,
        result: OperationResult.FAILURE,
        keyId,
        performedBy,
        performedByType: 'agent',
        errorMessage: error.message,
        processingTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async revokeKey(
    tenantId: string,
    keyId: string,
    dto: RevokeKeyDto,
    performedBy: string,
  ): Promise<void> {
    const key = await this.keyRepository.findOne({
      where: { id: keyId, tenantId },
    });

    if (!key) {
      throw new NotFoundException('Key not found');
    }

    if (key.status === KeyStatus.REVOKED) {
      throw new BadRequestException('Key already revoked');
    }

    key.status = KeyStatus.REVOKED;
    key.revokedAt = new Date();
    key.revocationReason = dto.reason;
    await this.keyRepository.save(key);

    await this.logAudit({
      tenantId,
      operation: EncryptionOperation.KEY_REVOKE,
      result: OperationResult.SUCCESS,
      keyId,
      keyVersion: key.version,
      performedBy,
      performedByType: 'agent',
      details: { reason: dto.reason },
    });

    this.logger.log(`Revoked key ${keyId}: ${dto.reason}`);
  }

  async getKeys(
    tenantId: string,
    query: QueryKeysDto,
  ): Promise<{ items: KeyResponse[]; total: number }> {
    const { keyType, status, conversationId, page = 1, limit = 20 } = query;

    const qb = this.keyRepository
      .createQueryBuilder('k')
      .where('k.tenantId = :tenantId', { tenantId });

    if (keyType) {
      qb.andWhere('k.keyType = :keyType', { keyType });
    }
    if (status) {
      qb.andWhere('k.status = :status', { status });
    }
    if (conversationId) {
      qb.andWhere('k.conversationId = :conversationId', { conversationId });
    }

    const [items, total] = await qb
      .orderBy('k.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(k => this.mapKeyToResponse(k)),
      total,
    };
  }

  async getKey(tenantId: string, keyId: string): Promise<KeyResponse> {
    const key = await this.keyRepository.findOne({
      where: { id: keyId, tenantId },
    });

    if (!key) {
      throw new NotFoundException('Key not found');
    }

    return this.mapKeyToResponse(key);
  }

  // ========== Encryption Operations ==========

  async encryptData(
    tenantId: string,
    dto: EncryptDataDto,
    performedBy: string,
    clientIp?: string,
  ): Promise<EncryptionResult> {
    const startTime = Date.now();
    const dataSize = Buffer.byteLength(dto.plaintext, 'utf8');

    try {
      // 获取或创建密钥
      let key: EncryptionKey | null = null;
      if (dto.keyId) {
        key = await this.keyRepository.findOne({
          where: { id: dto.keyId, tenantId, status: KeyStatus.ACTIVE },
        });
        if (!key) {
          throw new NotFoundException('Active key not found');
        }
      } else if (dto.conversationId) {
        // 查找会话密钥
        key = await this.keyRepository.findOne({
          where: {
            tenantId,
            conversationId: dto.conversationId,
            keyType: KeyType.SESSION,
            status: KeyStatus.ACTIVE,
          },
        });
        if (!key) {
          // 创建会话密钥
          key = await this.createSessionKey(tenantId, dto.conversationId, performedBy);
        }
      } else {
        // 使用默认数据密钥
        key = await this.getOrCreateDataKey(tenantId, performedBy);
      }

      // TypeScript 类型收窄：此时 key 一定存在
      if (!key) {
        throw new Error('Failed to obtain encryption key');
      }

      // 解密密钥材料
      const rawKey = this.decryptWithMasterKey(
        key.encryptedKeyMaterial,
        key.iv,
        (key.metadata as any)?.authTag,
      );

      // 加密数据
      const result = this.encryptWithKey(
        dto.plaintext,
        Buffer.from(rawKey, 'base64'),
        key.algorithm,
      );

      // 更新使用计数
      if (key.metadata) {
        key.metadata.usageCount = (key.metadata.usageCount || 0) + 1;
        await this.keyRepository.save(key);
      }

      // 记录审计日志
      await this.logAudit({
        tenantId,
        operation: EncryptionOperation.ENCRYPT,
        result: OperationResult.SUCCESS,
        keyId: key.id,
        keyVersion: key.version,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        conversationId: dto.conversationId,
        performedBy,
        performedByType: 'agent',
        clientIp,
        dataSize,
        processingTimeMs: Date.now() - startTime,
        details: {
          e2eEnabled: key.keyType === KeyType.SESSION,
          keyFingerprint: key.fingerprint,
        },
      });

      return {
        ciphertext: result.encrypted,
        iv: result.iv,
        authTag: result.authTag,
        keyId: key.id,
        keyVersion: key.version,
        algorithm: key.algorithm,
      };
    } catch (error) {
      await this.logAudit({
        tenantId,
        operation: EncryptionOperation.ENCRYPT,
        result: OperationResult.FAILURE,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        performedBy,
        performedByType: 'agent',
        clientIp,
        dataSize,
        errorMessage: error.message,
        processingTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  async decryptData(
    tenantId: string,
    dto: DecryptDataDto,
    performedBy: string,
    clientIp?: string,
  ): Promise<DecryptionResult> {
    const startTime = Date.now();

    try {
      // 查找密钥
      const keyQuery: any = { tenantId };
      if (dto.keyId) {
        keyQuery.id = dto.keyId;
      }
      if (dto.keyVersion) {
        keyQuery.version = dto.keyVersion;
      }

      const key = await this.keyRepository.findOne({ where: keyQuery });
      if (!key) {
        throw new NotFoundException('Key not found');
      }

      if (key.status === KeyStatus.REVOKED) {
        throw new BadRequestException('Cannot decrypt with revoked key');
      }

      // 解密密钥材料
      const rawKey = this.decryptWithMasterKey(
        key.encryptedKeyMaterial,
        key.iv,
        (key.metadata as any)?.authTag,
      );

      // 解密数据 (iv 是必须的，如果没有则抛出错误)
      if (!dto.iv) {
        throw new BadRequestException('IV is required for decryption');
      }
      const plaintext = this.decryptWithKey(
        dto.ciphertext,
        Buffer.from(rawKey, 'base64'),
        key.algorithm,
        dto.iv,
        dto.authTag,
      );

      // 记录审计日志
      await this.logAudit({
        tenantId,
        operation: EncryptionOperation.DECRYPT,
        result: OperationResult.SUCCESS,
        keyId: key.id,
        keyVersion: key.version,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        performedBy,
        performedByType: 'agent',
        clientIp,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        plaintext,
        keyId: key.id,
        keyVersion: key.version,
      };
    } catch (error) {
      await this.logAudit({
        tenantId,
        operation: EncryptionOperation.DECRYPT,
        result: OperationResult.FAILURE,
        keyId: dto.keyId,
        resourceType: dto.resourceType,
        resourceId: dto.resourceId,
        performedBy,
        performedByType: 'agent',
        clientIp,
        errorMessage: error.message,
        processingTimeMs: Date.now() - startTime,
      });
      throw error;
    }
  }

  // ========== Session (E2E) Encryption ==========

  async initSessionEncryption(
    tenantId: string,
    dto: InitSessionEncryptionDto,
    performedBy: string,
  ): Promise<SessionEncryptionInfo> {
    // 检查是否已存在会话密钥
    let key = await this.keyRepository.findOne({
      where: {
        tenantId,
        conversationId: dto.conversationId,
        keyType: KeyType.SESSION,
        status: KeyStatus.ACTIVE,
      },
    });

    if (!key) {
      key = await this.createSessionKey(
        tenantId,
        dto.conversationId,
        performedBy,
        dto.algorithm,
      );
    }

    return {
      conversationId: dto.conversationId,
      keyId: key.id,
      algorithm: key.algorithm,
      publicKey: key.publicKey,
      established: true,
      establishedAt: key.createdAt,
      expiresAt: key.validUntil,
    };
  }

  async exchangeSessionKey(
    tenantId: string,
    dto: SessionKeyExchangeDto,
    performedBy: string,
  ): Promise<SessionEncryptionInfo> {
    const key = await this.keyRepository.findOne({
      where: {
        tenantId,
        conversationId: dto.conversationId,
        keyType: KeyType.SESSION,
        status: KeyStatus.ACTIVE,
      },
    });

    if (!key) {
      throw new NotFoundException('Session encryption not initialized');
    }

    // 记录密钥交换
    await this.logAudit({
      tenantId,
      operation: EncryptionOperation.SESSION_KEY_EXCHANGE,
      result: OperationResult.SUCCESS,
      keyId: key.id,
      conversationId: dto.conversationId,
      performedBy,
      performedByType: 'agent',
      details: {
        sessionId: dto.conversationId,
      },
    });

    return {
      conversationId: dto.conversationId,
      keyId: key.id,
      algorithm: key.algorithm,
      publicKey: key.publicKey,
      established: true,
      establishedAt: key.createdAt,
      expiresAt: key.validUntil,
    };
  }

  async getSessionEncryption(
    tenantId: string,
    conversationId: string,
  ): Promise<SessionEncryptionInfo | null> {
    const key = await this.keyRepository.findOne({
      where: {
        tenantId,
        conversationId,
        keyType: KeyType.SESSION,
        status: KeyStatus.ACTIVE,
      },
    });

    if (!key) {
      return null;
    }

    return {
      conversationId,
      keyId: key.id,
      algorithm: key.algorithm,
      publicKey: key.publicKey,
      established: true,
      establishedAt: key.createdAt,
      expiresAt: key.validUntil,
    };
  }

  // ========== Audit Logs ==========

  async getAuditLogs(
    tenantId: string,
    query: QueryAuditLogsDto,
  ): Promise<{ items: AuditLogResponse[]; total: number }> {
    const {
      operation,
      result,
      keyId,
      resourceType,
      resourceId,
      conversationId,
      performedBy,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const qb = this.auditRepository
      .createQueryBuilder('a')
      .where('a.tenantId = :tenantId', { tenantId });

    if (operation) {
      qb.andWhere('a.operation = :operation', { operation });
    }
    if (result) {
      qb.andWhere('a.result = :result', { result });
    }
    if (keyId) {
      qb.andWhere('a.keyId = :keyId', { keyId });
    }
    if (resourceType) {
      qb.andWhere('a.resourceType = :resourceType', { resourceType });
    }
    if (resourceId) {
      qb.andWhere('a.resourceId = :resourceId', { resourceId });
    }
    if (conversationId) {
      qb.andWhere('a.conversationId = :conversationId', { conversationId });
    }
    if (performedBy) {
      qb.andWhere('a.performedBy = :performedBy', { performedBy });
    }
    if (startDate) {
      qb.andWhere('a.createdAt >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      qb.andWhere('a.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const [items, total] = await qb
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(a => this.mapAuditToResponse(a)),
      total,
    };
  }

  // ========== Statistics ==========

  async getStats(tenantId: string): Promise<EncryptionStatsResponse> {
    // 密钥统计
    const keyStats = await this.keyRepository
      .createQueryBuilder('k')
      .select('k.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('k.tenantId = :tenantId', { tenantId })
      .groupBy('k.status')
      .getRawMany();

    const keyStatsByStatus: Record<string, number> = {};
    keyStats.forEach(s => {
      keyStatsByStatus[s.status] = parseInt(s.count);
    });

    // 操作统计
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const operationStats = await this.auditRepository
      .createQueryBuilder('a')
      .select('a.operation', 'operation')
      .addSelect('COUNT(*)', 'count')
      .where('a.tenantId = :tenantId', { tenantId })
      .andWhere('a.createdAt >= :last24h', { last24h })
      .groupBy('a.operation')
      .getRawMany();

    const operationsByType: Record<string, number> = {};
    operationStats.forEach(s => {
      operationsByType[s.operation] = parseInt(s.count);
    });

    const resultStats = await this.auditRepository
      .createQueryBuilder('a')
      .select('a.result', 'result')
      .addSelect('COUNT(*)', 'count')
      .where('a.tenantId = :tenantId', { tenantId })
      .andWhere('a.createdAt >= :last24h', { last24h })
      .groupBy('a.result')
      .getRawMany();

    const operationsByResult: Record<string, number> = {};
    resultStats.forEach(s => {
      operationsByResult[s.result] = parseInt(s.count);
    });

    // 平均处理时间
    const avgTime = await this.auditRepository
      .createQueryBuilder('a')
      .select('AVG(a.processingTimeMs)', 'avgTime')
      .where('a.tenantId = :tenantId', { tenantId })
      .andWhere('a.createdAt >= :last24h', { last24h })
      .andWhere('a.processingTimeMs IS NOT NULL')
      .getRawOne();

    // 活跃的端到端加密会话
    const e2eSessions = await this.keyRepository.count({
      where: {
        tenantId,
        keyType: KeyType.SESSION,
        status: KeyStatus.ACTIVE,
      },
    });

    // 加密数据总量
    const totalData = await this.auditRepository
      .createQueryBuilder('a')
      .select('SUM(a.dataSize)', 'total')
      .where('a.tenantId = :tenantId', { tenantId })
      .andWhere('a.operation = :op', { op: EncryptionOperation.ENCRYPT })
      .getRawOne();

    return {
      totalKeys: Object.values(keyStatsByStatus).reduce((a, b) => a + b, 0),
      activeKeys: keyStatsByStatus[KeyStatus.ACTIVE] || 0,
      rotatedKeys: keyStatsByStatus[KeyStatus.ROTATED] || 0,
      expiredKeys: keyStatsByStatus[KeyStatus.EXPIRED] || 0,
      revokedKeys: keyStatsByStatus[KeyStatus.REVOKED] || 0,
      operationsByType: operationsByType as any,
      operationsByResult: operationsByResult as any,
      recentOperations: Object.values(operationsByType).reduce((a, b) => a + b, 0),
      averageProcessingTimeMs: parseFloat(avgTime?.avgTime) || 0,
      totalDataEncrypted: parseInt(totalData?.total) || 0,
      e2eSessionsActive: e2eSessions,
    };
  }

  // ========== Scheduled Tasks ==========

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async autoRotateKeys(): Promise<void> {
    this.logger.log('Starting auto key rotation check...');

    const keysToRotate = await this.keyRepository
      .createQueryBuilder('k')
      .where('k.status = :status', { status: KeyStatus.ACTIVE })
      .andWhere("k.metadata->'rotationPolicy'->>'autoRotate' = 'true'")
      .andWhere(`
        k.createdAt < NOW() - (
          COALESCE((k.metadata->'rotationPolicy'->>'rotationIntervalDays')::int, 90)
          || ' days'
        )::interval
      `)
      .getMany();

    for (const key of keysToRotate) {
      try {
        await this.rotateKey(key.tenantId, key.id, { reason: 'Auto rotation' }, 'system');
        this.logger.log(`Auto-rotated key ${key.id}`);
      } catch (error) {
        this.logger.error(`Failed to auto-rotate key ${key.id}: ${error.message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireKeys(): Promise<void> {
    const now = new Date();

    const result = await this.keyRepository.update(
      {
        status: KeyStatus.ACTIVE,
        validUntil: LessThan(now),
      },
      {
        status: KeyStatus.EXPIRED,
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} keys`);
    }
  }

  // ========== Legacy Methods (Backward Compatibility) ==========

  encrypt(plaintext: string): EncryptedData {
    if (!this.enabled) {
      return { encrypted: plaintext, iv: '' };
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(this.masterKey.padEnd(32, '0').slice(0, 32)),
        iv,
      );

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag().toString('base64');

      return {
        encrypted,
        iv: iv.toString('base64'),
        authTag,
      };
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw error;
    }
  }

  decrypt(encryptedData: string, iv?: string, authTag?: string): string {
    if (!this.enabled || !encryptedData) {
      return encryptedData;
    }

    if (!iv) {
      throw new Error('IV is required for decryption');
    }

    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.masterKey.padEnd(32, '0').slice(0, 32)),
        Buffer.from(iv, 'base64'),
      );

      if (authTag) {
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));
      }

      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw error;
    }
  }

  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // ========== Private Methods ==========

  private async createSessionKey(
    tenantId: string,
    conversationId: string,
    createdBy: string,
    algorithm?: EncryptionAlgorithm,
  ): Promise<EncryptionKey> {
    const rawKey = crypto.randomBytes(32);
    const { encrypted, iv, authTag } = this.encryptWithMasterKey(rawKey.toString('base64'));
    const fingerprint = crypto
      .createHash('sha256')
      .update(rawKey)
      .digest('hex')
      .substring(0, 16);

    // 会话密钥有效期24小时
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24);

    const key = this.keyRepository.create({
      tenantId,
      name: `session-${conversationId}`,
      keyType: KeyType.SESSION,
      status: KeyStatus.ACTIVE,
      encryptedKeyMaterial: encrypted,
      iv,
      version: 1,
      algorithm: algorithm || this.defaultAlgorithm,
      keyLength: 256,
      conversationId,
      fingerprint,
      validUntil,
      createdBy,
      metadata: {
        purpose: 'End-to-end session encryption',
        authTag,
        usageCount: 0,
      },
    });

    return this.keyRepository.save(key);
  }

  private async getOrCreateDataKey(
    tenantId: string,
    createdBy: string,
  ): Promise<EncryptionKey> {
    let key = await this.keyRepository.findOne({
      where: {
        tenantId,
        keyType: KeyType.DATA,
        status: KeyStatus.ACTIVE,
      },
    });

    if (!key) {
      const rawKey = crypto.randomBytes(32);
      const { encrypted, iv, authTag } = this.encryptWithMasterKey(rawKey.toString('base64'));
      const fingerprint = crypto
        .createHash('sha256')
        .update(rawKey)
        .digest('hex')
        .substring(0, 16);

      key = this.keyRepository.create({
        tenantId,
        name: 'default-data-key',
        keyType: KeyType.DATA,
        status: KeyStatus.ACTIVE,
        encryptedKeyMaterial: encrypted,
        iv,
        version: 1,
        algorithm: this.defaultAlgorithm,
        keyLength: 256,
        fingerprint,
        createdBy,
        metadata: {
          purpose: 'Default data encryption',
          authTag,
          usageCount: 0,
          rotationPolicy: {
            autoRotate: true,
            rotationIntervalDays: 90,
          },
        },
      });

      key = await this.keyRepository.save(key);
    }

    return key;
  }

  private encryptWithMasterKey(
    plaintext: string,
  ): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.masterKey.padEnd(32, '0').slice(0, 32)),
      iv,
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag,
    };
  }

  private decryptWithMasterKey(
    ciphertext: string,
    iv: string,
    authTag?: string,
  ): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.masterKey.padEnd(32, '0').slice(0, 32)),
      Buffer.from(iv, 'base64'),
    );

    if (authTag) {
      decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    }

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private encryptWithKey(
    plaintext: string,
    key: Buffer,
    algorithm: EncryptionAlgorithm,
  ): { encrypted: string; iv: string; authTag?: string } {
    const iv = crypto.randomBytes(16);

    if (algorithm === EncryptionAlgorithm.AES_256_GCM) {
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag().toString('base64');
      return { encrypted, iv: iv.toString('base64'), authTag };
    } else {
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return { encrypted, iv: iv.toString('base64') };
    }
  }

  private decryptWithKey(
    ciphertext: string,
    key: Buffer,
    algorithm: EncryptionAlgorithm,
    iv: string,
    authTag?: string,
  ): string {
    if (algorithm === EncryptionAlgorithm.AES_256_GCM) {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        Buffer.from(iv, 'base64'),
      );
      if (authTag) {
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));
      }
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } else {
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        key,
        Buffer.from(iv, 'base64'),
      );
      let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
  }

  private async logAudit(data: Partial<EncryptionAudit>): Promise<void> {
    try {
      const audit = this.auditRepository.create(data);
      await this.auditRepository.save(audit);
    } catch (error) {
      this.logger.error(`Failed to log audit: ${error.message}`);
    }
  }

  private mapKeyToResponse(key: EncryptionKey): KeyResponse {
    return {
      id: key.id,
      name: key.name,
      keyType: key.keyType,
      status: key.status,
      version: key.version,
      algorithm: key.algorithm,
      keyLength: key.keyLength,
      fingerprint: key.fingerprint,
      conversationId: key.conversationId,
      validFrom: key.validFrom,
      validUntil: key.validUntil,
      rotatedAt: key.rotatedAt,
      createdBy: key.createdBy,
      createdAt: key.createdAt,
      metadata: key.metadata ? {
        purpose: key.metadata.purpose,
        tags: key.metadata.tags,
        rotationPolicy: key.metadata.rotationPolicy,
      } : undefined,
    };
  }

  private mapAuditToResponse(audit: EncryptionAudit): AuditLogResponse {
    return {
      id: audit.id,
      operation: audit.operation,
      result: audit.result,
      keyId: audit.keyId,
      keyVersion: audit.keyVersion,
      resourceType: audit.resourceType,
      resourceId: audit.resourceId,
      conversationId: audit.conversationId,
      performedBy: audit.performedBy,
      performedByType: audit.performedByType,
      clientIp: audit.clientIp,
      dataSize: audit.dataSize ? Number(audit.dataSize) : undefined,
      processingTimeMs: audit.processingTimeMs,
      errorMessage: audit.errorMessage,
      createdAt: audit.createdAt,
    };
  }
}
