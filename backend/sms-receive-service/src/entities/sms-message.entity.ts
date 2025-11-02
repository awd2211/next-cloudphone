import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VirtualNumber } from './virtual-number.entity';

@Entity('sms_messages')
@Index(['virtualNumberId'])
@Index(['receivedAt'])
export class SmsMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'virtual_number_id', type: 'uuid' })
  virtualNumberId: string;

  @ManyToOne(() => VirtualNumber, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'virtual_number_id' })
  virtualNumber: VirtualNumber;

  // SMS Content
  @Column({ name: 'message_text', type: 'text', nullable: true })
  messageText: string;

  @Column({ name: 'verification_code', length: 20, nullable: true })
  verificationCode: string;

  @Column({ name: 'sender', length: 50, nullable: true })
  sender: string;

  // Delivery Status
  @Column({ name: 'delivered_to_device', type: 'boolean', default: false })
  deliveredToDevice: boolean;

  // Timestamps
  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;
}
