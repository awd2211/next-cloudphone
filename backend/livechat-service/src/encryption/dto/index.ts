import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsDateString,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  KeyType,
  KeyStatus,
  EncryptionAlgorithm,
} from '../../entities/encryption-key.entity';
import {
  EncryptionOperation,
  OperationResult,
  EncryptedResourceType,
} from '../../entities/encryption-audit.entity';

// ========== Key Management DTOs ==========

export class CreateKeyDto {
  @ApiProperty({ description: '密钥名称' })
  @IsString()
  name: string;

  @ApiProperty({ enum: KeyType, description: '密钥类型' })
  @IsEnum(KeyType)
  keyType: KeyType;

  @ApiPropertyOptional({ enum: EncryptionAlgorithm, description: '加密算法' })
  @IsOptional()
  @IsEnum(EncryptionAlgorithm)
  algorithm?: EncryptionAlgorithm;

  @ApiPropertyOptional({ description: '密钥长度（位）' })
  @IsOptional()
  @IsNumber()
  @Min(128)
  @Max(512)
  keyLength?: number;

  @ApiPropertyOptional({ description: '关联会话ID' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: '有效期（天）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  validDays?: number;

  @ApiPropertyOptional({ description: '自动轮换' })
  @IsOptional()
  @IsBoolean()
  autoRotate?: boolean;

  @ApiPropertyOptional({ description: '轮换间隔（天）' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  rotationIntervalDays?: number;

  @ApiPropertyOptional({ description: '用途描述' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ description: '标签', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class RotateKeyDto {
  @ApiPropertyOptional({ description: '新密钥长度' })
  @IsOptional()
  @IsNumber()
  @Min(128)
  @Max(512)
  newKeyLength?: number;

  @ApiPropertyOptional({ description: '轮换原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: '立即使旧密钥过期' })
  @IsOptional()
  @IsBoolean()
  expireOldKeyImmediately?: boolean;
}

export class RevokeKeyDto {
  @ApiProperty({ description: '撤销原因' })
  @IsString()
  reason: string;
}

export class QueryKeysDto {
  @ApiPropertyOptional({ enum: KeyType, description: '密钥类型' })
  @IsOptional()
  @IsEnum(KeyType)
  keyType?: KeyType;

  @ApiPropertyOptional({ enum: KeyStatus, description: '密钥状态' })
  @IsOptional()
  @IsEnum(KeyStatus)
  status?: KeyStatus;

  @ApiPropertyOptional({ description: '会话ID' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

// ========== Encryption Operation DTOs ==========

export class EncryptDataDto {
  @ApiProperty({ description: '要加密的数据' })
  @IsString()
  plaintext: string;

  @ApiPropertyOptional({ description: '指定密钥ID' })
  @IsOptional()
  @IsUUID()
  keyId?: string;

  @ApiPropertyOptional({ description: '资源类型' })
  @IsOptional()
  @IsEnum(EncryptedResourceType)
  resourceType?: EncryptedResourceType;

  @ApiPropertyOptional({ description: '资源ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: '会话ID' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class DecryptDataDto {
  @ApiProperty({ description: '加密后的数据' })
  @IsString()
  ciphertext: string;

  @ApiPropertyOptional({ description: 'IV' })
  @IsOptional()
  @IsString()
  iv?: string;

  @ApiPropertyOptional({ description: '认证标签' })
  @IsOptional()
  @IsString()
  authTag?: string;

  @ApiPropertyOptional({ description: '密钥ID' })
  @IsOptional()
  @IsUUID()
  keyId?: string;

  @ApiPropertyOptional({ description: '密钥版本' })
  @IsOptional()
  @IsNumber()
  keyVersion?: number;

  @ApiPropertyOptional({ description: '资源类型' })
  @IsOptional()
  @IsEnum(EncryptedResourceType)
  resourceType?: EncryptedResourceType;

  @ApiPropertyOptional({ description: '资源ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;
}

// ========== Session Encryption DTOs ==========

export class InitSessionEncryptionDto {
  @ApiProperty({ description: '会话ID' })
  @IsUUID()
  conversationId: string;

  @ApiPropertyOptional({ description: '算法' })
  @IsOptional()
  @IsEnum(EncryptionAlgorithm)
  algorithm?: EncryptionAlgorithm;
}

export class SessionKeyExchangeDto {
  @ApiProperty({ description: '会话ID' })
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: '公钥' })
  @IsString()
  publicKey: string;

  @ApiPropertyOptional({ description: '参与者ID' })
  @IsOptional()
  @IsString()
  participantId?: string;
}

// ========== Audit Query DTOs ==========

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ enum: EncryptionOperation, description: '操作类型' })
  @IsOptional()
  @IsEnum(EncryptionOperation)
  operation?: EncryptionOperation;

  @ApiPropertyOptional({ enum: OperationResult, description: '操作结果' })
  @IsOptional()
  @IsEnum(OperationResult)
  result?: OperationResult;

  @ApiPropertyOptional({ description: '密钥ID' })
  @IsOptional()
  @IsUUID()
  keyId?: string;

  @ApiPropertyOptional({ description: '资源类型' })
  @IsOptional()
  @IsEnum(EncryptedResourceType)
  resourceType?: EncryptedResourceType;

  @ApiPropertyOptional({ description: '资源ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: '会话ID' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: '执行者' })
  @IsOptional()
  @IsString()
  performedBy?: string;

  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '页码' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;
}

// ========== Response Types ==========

export interface KeyResponse {
  id: string;
  name: string;
  keyType: KeyType;
  status: KeyStatus;
  version: number;
  algorithm: EncryptionAlgorithm;
  keyLength: number;
  fingerprint: string;
  conversationId?: string;
  validFrom: Date;
  validUntil?: Date;
  rotatedAt?: Date;
  createdBy: string;
  createdAt: Date;
  metadata?: {
    purpose?: string;
    tags?: string[];
    rotationPolicy?: {
      autoRotate: boolean;
      rotationIntervalDays: number;
    };
  };
}

export interface EncryptionResult {
  ciphertext: string;
  iv: string;
  authTag?: string;
  keyId: string;
  keyVersion: number;
  algorithm: string;
}

export interface DecryptionResult {
  plaintext: string;
  keyId: string;
  keyVersion: number;
}

export interface SessionEncryptionInfo {
  conversationId: string;
  keyId: string;
  algorithm: EncryptionAlgorithm;
  publicKey?: string;
  established: boolean;
  establishedAt?: Date;
  expiresAt?: Date;
}

export interface AuditLogResponse {
  id: string;
  operation: EncryptionOperation;
  result: OperationResult;
  keyId?: string;
  keyVersion?: number;
  resourceType?: EncryptedResourceType;
  resourceId?: string;
  conversationId?: string;
  performedBy: string;
  performedByType: string;
  clientIp?: string;
  dataSize?: number;
  processingTimeMs?: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface EncryptionStatsResponse {
  totalKeys: number;
  activeKeys: number;
  rotatedKeys: number;
  expiredKeys: number;
  revokedKeys: number;
  operationsByType: Record<EncryptionOperation, number>;
  operationsByResult: Record<OperationResult, number>;
  recentOperations: number;
  averageProcessingTimeMs: number;
  totalDataEncrypted: number;
  e2eSessionsActive: number;
}

export interface KeyRotationPolicy {
  keyId: string;
  autoRotate: boolean;
  rotationIntervalDays: number;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
}
