import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Conversation } from './conversation.entity';

/**
 * 访客来源类型
 */
export enum VisitorSource {
  DIRECT = 'direct',           // 直接访问
  SEARCH = 'search',           // 搜索引擎
  SOCIAL = 'social',           // 社交媒体
  REFERRAL = 'referral',       // 外部链接
  AD = 'ad',                   // 广告
  EMAIL = 'email',             // 邮件营销
  APP = 'app',                 // 移动应用
  OTHER = 'other',
}

/**
 * 访客画像实体
 * 记录访客的详细信息、行为数据和标签
 */
@Entity('visitor_profiles')
@Index(['tenantId', 'visitorId'], { unique: true })
@Index(['tenantId', 'lastVisitAt'])
@Index(['tenantId', 'totalConversations'])
export class VisitorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /**
   * 访客唯一标识（可以是用户ID、设备指纹等）
   */
  @Column()
  visitorId: string;

  /**
   * 访客显示名称
   */
  @Column({ nullable: true })
  displayName: string;

  /**
   * 邮箱
   */
  @Column({ nullable: true })
  email: string;

  /**
   * 手机号
   */
  @Column({ nullable: true })
  phone: string;

  /**
   * 头像
   */
  @Column({ nullable: true })
  avatar: string;

  /**
   * 访客来源
   */
  @Column({
    type: 'enum',
    enum: VisitorSource,
    default: VisitorSource.DIRECT,
  })
  source: VisitorSource;

  /**
   * 来源详情（如搜索关键词、引荐网站等）
   */
  @Column({ nullable: true })
  sourceDetail: string;

  /**
   * 首次来源 URL
   */
  @Column({ nullable: true })
  initialUrl: string;

  /**
   * 首次访问时间
   */
  @Column({ type: 'timestamp' })
  firstVisitAt: Date;

  /**
   * 最后访问时间
   */
  @Column({ type: 'timestamp' })
  lastVisitAt: Date;

  /**
   * 总访问次数
   */
  @Column({ default: 1 })
  totalVisits: number;

  /**
   * 总会话数
   */
  @Column({ default: 0 })
  totalConversations: number;

  /**
   * 总消息数
   */
  @Column({ default: 0 })
  totalMessages: number;

  /**
   * 平均满意度评分
   */
  @Column({ type: 'float', nullable: true })
  avgSatisfactionScore: number;

  /**
   * 设备信息
   */
  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: {
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
    device?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
    screenResolution?: string;
    language?: string;
  };

  /**
   * 地理位置信息
   */
  @Column({ type: 'jsonb', nullable: true })
  geoInfo: {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    timezone?: string;
    ip?: string;
  };

  /**
   * 用户自定义属性
   */
  @Column({ type: 'jsonb', nullable: true })
  customAttributes: Record<string, any>;

  /**
   * 系统自动标签
   */
  @Column({ type: 'jsonb', default: [] })
  autoTags: string[];

  /**
   * 手动标签
   */
  @Column({ type: 'jsonb', default: [] })
  manualTags: string[];

  /**
   * 意向等级 (1-5, 5为最高)
   */
  @Column({ type: 'smallint', nullable: true })
  intentLevel: number;

  /**
   * 客户价值等级
   */
  @Column({ nullable: true })
  valueLevel: 'low' | 'medium' | 'high' | 'vip';

  /**
   * 最常咨询的问题类别
   */
  @Column({ type: 'jsonb', nullable: true })
  topCategories: { category: string; count: number }[];

  /**
   * 行为摘要
   */
  @Column({ type: 'jsonb', nullable: true })
  behaviorSummary: {
    avgSessionDuration?: number;    // 平均会话时长（秒）
    avgResponseTime?: number;       // 平均响应时间
    peakHours?: number[];           // 活跃时段
    preferredChannel?: string;      // 偏好渠道
    lastPurchase?: Date;            // 最后购买时间
    purchaseCount?: number;         // 购买次数
    lifetimeValue?: number;         // 客户终身价值
  };

  /**
   * 备注
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * 是否黑名单
   */
  @Column({ default: false })
  isBlocked: boolean;

  /**
   * 黑名单原因
   */
  @Column({ nullable: true })
  blockedReason: string;

  /**
   * 关联的会话记录
   */
  @OneToMany(() => Conversation, (conv) => conv.visitor)
  conversations: Conversation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
