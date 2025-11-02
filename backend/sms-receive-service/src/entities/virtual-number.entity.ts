import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NumberPool } from './number-pool.entity';

@Entity('virtual_numbers')
@Index(['provider', 'providerActivationId'], { unique: true })
@Index(['status'])
@Index(['deviceId'])
@Index(['createdAt'])
@Index(['expiresAt'])
@Index(['rentalType'])
export class VirtualNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Provider Information
  @Column({ name: 'provider', length: 50 })
  provider: string; // sms-activate, 5sim, smspool

  @Column({ name: 'provider_activation_id', length: 100 })
  providerActivationId: string; // Platform's activation ID

  // Phone Number Information
  @Column({ name: 'phone_number', length: 20 })
  phoneNumber: string; // +79123456789

  @Column({ name: 'country_code', length: 5 })
  countryCode: string; // RU, US, CN

  @Column({ name: 'country_name', length: 100, nullable: true })
  countryName: string; // Russia, United States

  // Service Information
  @Column({ name: 'service_code', length: 50 })
  serviceCode: string; // go, tg, wa (platform-specific)

  @Column({ name: 'service_name', length: 100, nullable: true })
  serviceName: string; // google, telegram, whatsapp

  // Status Management
  @Column({ name: 'status', length: 20, default: 'active' })
  status: string;
  // active, waiting_sms, received, completed, cancelled, expired

  // Cost Information
  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 4 })
  cost: number; // In USD

  @Column({ name: 'currency', length: 10, default: 'USD' })
  currency: string;

  // Device Association
  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  // Rental Support
  @Column({ name: 'rental_type', length: 20, default: 'one_time' })
  rentalType: string; // one_time, rental_24h, rental_7d

  @Column({ name: 'rental_start', type: 'timestamp', nullable: true })
  rentalStart: Date;

  @Column({ name: 'rental_end', type: 'timestamp', nullable: true })
  rentalEnd: Date;

  @Column({ name: 'rental_sms_count', type: 'int', default: 0 })
  rentalSmsCount: number;

  // Number Pool Association
  @Column({ name: 'from_pool', type: 'boolean', default: false })
  fromPool: boolean;

  @Column({ name: 'pool_id', type: 'uuid', nullable: true })
  poolId: string;

  @ManyToOne(() => NumberPool, { nullable: true })
  @JoinColumn({ name: 'pool_id' })
  pool: NumberPool;

  // Smart Routing Information
  @Column({ name: 'selected_by_algorithm', length: 50, nullable: true })
  selectedByAlgorithm: string; // cost, availability, success_rate

  @Column({ name: 'fallback_count', type: 'int', default: 0 })
  fallbackCount: number; // How many times fell back to another provider

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'activated_at', type: 'timestamp', nullable: true })
  activatedAt: Date;

  @Column({ name: 'sms_received_at', type: 'timestamp', nullable: true })
  smsReceivedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Metadata (JSON)
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
