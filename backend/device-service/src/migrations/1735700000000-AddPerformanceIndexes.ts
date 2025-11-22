import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1735700000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1735700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // devices表索引优化 (mixed)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devices_user_status" ON "devices"("userId", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devices_provider_status" ON "devices"("provider_type", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devices_created_at" ON "devices"("createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_devices_external_id" ON "devices"("external_id") WHERE "external_id" IS NOT NULL;
    `);

    // device_allocations表索引 (snake_case)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_allocations_user_status" ON "device_allocations"("user_id", "status");
    `);

    // device_reservations表索引 (snake_case)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_device_reservations_user_status" ON "device_reservations"("user_id", "status");
    `);

    // snapshots表索引 (camelCase, table name is device_snapshots)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_snapshots_device_id" ON "device_snapshots"("deviceId");
    `);

    // templates表索引 (camelCase, table name is device_templates)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_templates_public" ON "device_templates"("isPublic");
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
