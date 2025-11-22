import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1735700000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1735700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // payments表索引优化 (snake_case)
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

    // orders表索引 (camelCase)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_user_status" ON "orders"("userId", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders"("createdAt" DESC);
    `);

    // invoices表索引 (camelCase)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_invoices_user_status" ON "invoices"("userId", "status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_invoices_due_date" ON "invoices"("dueDate");
    `);

    // balances表索引 (table name is user_balances, camelCase)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_balances_user_id" ON "user_balances"("userId");
    `);

    // usage_records表索引 (camelCase)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_usage_records_user_id" ON "usage_records"("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_usage_records_device_id" ON "usage_records"("deviceId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_usage_records_created_at" ON "usage_records"("createdAt" DESC);
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
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_balances_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usage_records_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usage_records_device_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_usage_records_created_at"`);
  }
}
