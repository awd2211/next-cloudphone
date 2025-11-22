import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SettingType {
  STRING = 'string',
  JSON = 'json',
  HTML = 'html',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

export enum SettingCategory {
  GENERAL = 'general',
  CONTACT = 'contact',
  SEO = 'seo',
  SOCIAL = 'social',
}

@Entity('site_settings')
export class SiteSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: SettingType.STRING,
  })
  type: SettingType;

  @Column({
    type: 'varchar',
    length: 50,
    default: SettingCategory.GENERAL,
  })
  category: SettingCategory;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 获取解析后的值
   */
  getParsedValue(): any {
    switch (this.type) {
      case SettingType.JSON:
        try {
          return JSON.parse(this.value);
        } catch {
          return this.value;
        }
      case SettingType.NUMBER:
        return Number(this.value);
      case SettingType.BOOLEAN:
        return this.value === 'true';
      default:
        return this.value;
    }
  }
}
