import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Device } from "./device.entity";

export enum AllocationStatus {
  ALLOCATED = "allocated",
  RELEASED = "released",
  EXPIRED = "expired",
}

@Entity("device_allocations")
@Index(["deviceId", "status"])
@Index(["userId", "status"])
@Index(["tenantId", "status"])
@Index(["allocatedAt", "expiresAt"])
export class DeviceAllocation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "device_id", type: "varchar" })
  @Index()
  deviceId: string;

  @Column({ name: "user_id", type: "varchar" })
  userId: string;

  @Column({ name: "tenant_id", type: "varchar", nullable: true })
  tenantId: string;

  @Column({
    type: "enum",
    enum: AllocationStatus,
    default: AllocationStatus.ALLOCATED,
  })
  status: AllocationStatus;

  @Column({ name: "allocated_at", type: "timestamptz" })
  allocatedAt: Date;

  @Column({ name: "released_at", type: "timestamptz", nullable: true })
  releasedAt: Date;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date;

  @Column({ name: "duration_minutes", type: "int", default: 60 })
  durationMinutes: number;

  @Column({ name: "duration_seconds", type: "int", nullable: true })
  durationSeconds: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Device, { eager: false })
  @JoinColumn({ name: "device_id" })
  device?: Device;
}
