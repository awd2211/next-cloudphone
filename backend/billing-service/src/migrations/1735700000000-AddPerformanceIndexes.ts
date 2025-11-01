import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1735700000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1735700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // payments表索引优化
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_user_status" ON "payments"("user_id", "status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_order_id" ON "payments"("order_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_created_at" ON "payments"("created_at" DESC);
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_method_status" ON "payments"("method", "status");
    `);
    
    // orders表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_user_status" ON "orders"("user_id", "status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders"("created_at" DESC);
    `);
    
    // invoices表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_invoices_user_status" ON "invoices"("user_id", "status");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_invoices_due_date" ON "invoices"("due_date");
    `);
    
    // balances表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_balances_user_id" ON "balances"("user_id");
    `);
    
    // usage_records表索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_usage_records_user_id" ON "usage_records"("user_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_usage_records_device_id" ON "usage_records"("device_id");
    `);
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_usage_records_created_at" ON "usage_records"("created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_method_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoices_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_balances_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usage_records_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usage_records_device_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usage_records_created_at"`);
  }
}
