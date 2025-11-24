import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// 密钥类型
export enum KeyType {
  MASTER = 'master',           // 主密钥
  DATA = 'data',               // 数据加密密钥
  SESSION = 'session',         // 会话密钥（端到端加密）
  BACKUP = 'backup',           // 备份加密密钥
}

// 密钥状态
export enum KeyStatus {
  ACTIVE = 'active',           // 当前使用中
  ROTATED = 'rotated',         // 已轮换（可用于解密）
  EXPIRED = 'expired',         // 已过期
  REVOKED = 'revoked',         // 已撤销
}

// 加密算法
export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm',
  AES_256_CBC = 'aes-256-cbc',
  CHACHA20_POLY1305 = 'chacha20-poly1305',
}

@Entity('encryption_keys')
@Index(['tenantId', 'keyType', 'status'])
@Index(['tenantId', 'version'])
export class EncryptionKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  tenantId: string;

  // 密钥名称/标识
  @Column()
  name: string;

  // 密钥类型
  @Column({
    type: 'enum',
    enum: KeyType,
    default: KeyType.DATA,
  })
  keyType: KeyType;

  // 密钥状态
  @Column({
    type: 'enum',
    enum: KeyStatus,
    default: KeyStatus.ACTIVE,
  })
  status: KeyStatus;

  // 加密后的密钥材料（用主密钥加密存储）
  @Column({ type: 'text' })
  encryptedKeyMaterial: string;

  // 初始化向量
  @Column({ nullable: true })
  iv: string;

  // 密钥版本
  @Column({ default: 1 })
  version: number;

  // 加密算法
  @Column({
    type: 'enum',
    enum: EncryptionAlgorithm,
    default: EncryptionAlgorithm.AES_256_GCM,
  })
  algorithm: EncryptionAlgorithm;

  // 密钥长度（位）
  @Column({ default: 256 })
  keyLength: number;

  // 关联的会话ID（用于会话级密钥）
  @Column({ nullable: true })
  @Index()
  conversationId: string;

  // 公钥（用于非对称加密）
  @Column({ type: 'text', nullable: true })
  publicKey: string;

  // 密钥指纹
  @Column({ nullable: true })
  @Index()
  fingerprint: string;

  // 有效期开始
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  validFrom: Date;

  // 有效期结束
  @Column({ type: 'timestamp with time zone', nullable: true })
  validUntil: Date;

  // 轮换时间
  @Column({ type: 'timestamp with time zone', nullable: true })
  rotatedAt: Date;

  // 撤销时间
  @Column({ type: 'timestamp with time zone', nullable: true })
  revokedAt: Date;

  // 撤销原因
  @Column({ nullable: true })
  revocationReason: string;

  // 创建者
  @Column({ nullable: true })
  createdBy: string;

  // 元数据
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    purpose?: string;
    tags?: string[];
    rotationPolicy?: {
      autoRotate: boolean;
      rotationIntervalDays: number;
    };
    usageCount?: number;
  };

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}
