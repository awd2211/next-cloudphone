import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LegalDocumentType {
  TERMS = 'terms',
  PRIVACY = 'privacy',
  REFUND = 'refund',
  SLA = 'sla',
  SECURITY = 'security',
}

export enum ContentType {
  HTML = 'html',
  MARKDOWN = 'markdown',
}

@Entity('legal_documents')
export class LegalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  type: LegalDocumentType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ContentType.HTML,
  })
  contentType: ContentType;

  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  effectiveDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
