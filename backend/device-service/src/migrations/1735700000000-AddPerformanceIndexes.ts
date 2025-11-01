import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1735700000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1735700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // devices表索引优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devices_user_status" ON "devices"("user_id", "status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devices_provider_status" ON "devices"("provider_type", "status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devices_created_at" ON "devices"("created_at" DESC);
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devices_external_id" ON "devices"("external_id") WHERE "external_id" IS NOT NULL;
    `);
    
    // device_allocations表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_allocations_user_status" ON "device_allocations"("user_id", "status");
    `);
    
    // device_reservations表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_reservations_user_status" ON "device_reservations"("user_id", "status");
    `);
    
    // snapshots表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_snapshots_device_id" ON "snapshots"("device_id");
    `);
    
    // templates表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_templates_public" ON "templates"("is_public");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_devices_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_devices_provider_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_devices_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_devices_external_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_device_allocations_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_device_reservations_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_snapshots_device_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_templates_public"`);
  }
}
