import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../../entities/user.entity';

export enum ReplyType {
  USER = 'user', // 用户回复
  STAFF = 'staff', // 客服回复
  SYSTEM = 'system', // 系统消息
}

@Entity('ticket_replies')
export class TicketReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.replies)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: ReplyType,
  })
  @Index()
  type: ReplyType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Array<{
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }>;

  @Column({ type: 'boolean', default: false })
  isInternal: boolean; // 是否为内部备注（客户不可见）

  @CreateDateColumn()
  createdAt: Date;
}
