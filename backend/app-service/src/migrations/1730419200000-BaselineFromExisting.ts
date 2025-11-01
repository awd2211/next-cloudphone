import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 基线迁移 - App Service
 *
 * 用途: 标记当前数据库状态为迁移起点
 *
 * 当前数据库已包含以下表:
 * - applications (应用管理)
 * - app_audit_records (审核记录)
 *
 * 注意:
 * - 此迁移的 up() 方法为空,因为所有表已存在
 * - 这只是一个标记,用于 TypeORM 追踪迁移历史
 * - 执行后会在数据库创建 typeorm_migrations 表
 */
export class BaselineFromExisting1730419200000 implements MigrationInterface {
  name = 'BaselineFromExisting1730419200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 空实现 - 所有表已存在于数据库
    // 这个迁移只是标记当前状态为基线
    console.log('✅ [App Service] Baseline migration - 所有表已存在');
    console.log('📊 当前数据库包含应用管理相关表');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 基线迁移不支持回滚
    console.log('⚠️  无法回滚基线迁移');
    throw new Error('Cannot revert baseline migration');
  }
}
