import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('number_pool')
@Index(['status', 'serviceCode'])
@Index(['expiresAt'])
export class NumberPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'provider', length: 50 })
  provider: string;

  @Column({ name: 'provider_activation_id', length: 100 })
  providerActivationId: string;

  @Column({ name: 'phone_number', length: 20 })
  phoneNumber: string;

  @Column({ name: 'country_code', length: 5 })
  countryCode: string;

  @Column({ name: 'service_code', length: 50 })
  serviceCode: string;

  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 4 })
  cost: number;

  // Status
  @Column({ name: 'status', length: 20, default: 'available' })
  status: string; // available, reserved, used

  @Column({ name: 'reserved_by_device', type: 'uuid', nullable: true })
  reservedByDevice: string | null;

  @Column({ name: 'reserved_at', type: 'timestamp', nullable: true })
  reservedAt: Date | null;

  // Preheat Strategy
  @Column({ name: 'preheated', type: 'boolean', default: false })
  preheated: boolean;

  @Column({ name: 'preheated_at', type: 'timestamp', nullable: true })
  preheatedAt: Date;

  @Column({ name: 'priority', type: 'int', default: 0 })
  priority: number;

  // Usage Statistics
  @Column({ name: 'reserved_count', type: 'int', default: 0 })
  reservedCount: number;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount: number;

  // Cost Optimization
  @Column({ name: 'bulk_purchased', type: 'boolean', default: false })
  bulkPurchased: boolean;

  @Column({ name: 'discount_rate', type: 'decimal', precision: 5, scale: 2, default: 0.00 })
  discountRate: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}
