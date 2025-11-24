import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VisitorProfile } from './visitor-profile.entity';

/**
 * 访客事件类型
 */
export enum VisitorEventType {
  PAGE_VIEW = 'page_view',           // 页面浏览
  CLICK = 'click',                   // 点击事件
  FORM_SUBMIT = 'form_submit',       // 表单提交
  CHAT_START = 'chat_start',         // 发起会话
  CHAT_END = 'chat_end',             // 结束会话
  PURCHASE = 'purchase',             // 购买
  SIGN_UP = 'sign_up',               // 注册
  LOGIN = 'login',                   // 登录
  SEARCH = 'search',                 // 搜索
  ADD_TO_CART = 'add_to_cart',       // 加购
  CUSTOM = 'custom',                 // 自定义事件
}

/**
 * 访客事件实体
 * 记录访客的行为轨迹
 */
@Entity('visitor_events')
@Index(['tenantId', 'visitorProfileId', 'createdAt'])
@Index(['tenantId', 'eventType', 'createdAt'])
@Index(['sessionId'])
export class VisitorEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  visitorProfileId: string;

  @ManyToOne(() => VisitorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visitorProfileId' })
  visitorProfile: VisitorProfile;

  /**
   * 会话 ID（同一次访问的事件共享一个 sessionId）
   */
  @Column()
  sessionId: string;

  /**
   * 事件类型
   */
  @Column({
    type: 'enum',
    enum: VisitorEventType,
  })
  eventType: VisitorEventType;

  /**
   * 事件名称（自定义事件时使用）
   */
  @Column({ nullable: true })
  eventName: string;

  /**
   * 页面 URL
   */
  @Column({ nullable: true })
  pageUrl: string;

  /**
   * 页面标题
   */
  @Column({ nullable: true })
  pageTitle: string;

  /**
   * 引荐来源
   */
  @Column({ nullable: true })
  referrer: string;

  /**
   * 事件数据
   */
  @Column({ type: 'jsonb', nullable: true })
  eventData: Record<string, any>;

  /**
   * 停留时长（秒）- 用于页面浏览事件
   */
  @Column({ nullable: true })
  duration: number;

  /**
   * 设备信息
   */
  @Column({ type: 'jsonb', nullable: true })
  deviceInfo: {
    browser?: string;
    os?: string;
    device?: string;
    screenResolution?: string;
  };

  /**
   * IP 地址
   */
  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
