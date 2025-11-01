import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1735700000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1735700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users表索引优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users"("username");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_tenant_status" ON "users"("tenant_id", "status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users"("created_at" DESC);
    `);
    
    // user_events表索引（事件溯源）
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_events_aggregate_id" ON "user_events"("aggregate_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_events_type" ON "user_events"("event_type");
    `);
    
    // roles表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_roles_name" ON "roles"("name");
    `);
    
    // quotas表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_quotas_user_id" ON "quotas"("user_id");
    `);
    
    // api_keys表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_api_keys_user_id" ON "api_keys"("user_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_api_keys_key_hash" ON "api_keys"("key_hash");
    `);
    
    // audit_logs表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_username"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_tenant_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_events_aggregate_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_events_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_roles_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_quotas_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_api_keys_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_api_keys_key_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_created_at"`);
  }
}
