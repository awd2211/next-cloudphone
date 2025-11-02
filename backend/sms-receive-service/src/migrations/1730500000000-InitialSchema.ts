import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class InitialSchema1730500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create provider_configs table
    await queryRunner.createTable(
      new Table({
        name: 'provider_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'provider', type: 'varchar', length: '50', isUnique: true },
          { name: 'display_name', type: 'varchar', length: '100', isNullable: true },
          { name: 'api_endpoint', type: 'varchar', length: '255' },
          { name: 'api_key', type: 'text' },
          { name: 'api_key_encrypted', type: 'boolean', default: true },
          { name: 'balance', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'balance_threshold', type: 'decimal', precision: 10, scale: 2, default: 10.00 },
          { name: 'last_balance_check', type: 'timestamp', isNullable: true },
          { name: 'priority', type: 'int', default: 1 },
          { name: 'rate_limit_per_minute', type: 'int', default: 60 },
          { name: 'rate_limit_per_second', type: 'int', default: 10 },
          { name: 'concurrent_requests_limit', type: 'int', default: 50 },
          { name: 'enabled', type: 'boolean', default: true },
          { name: 'health_status', type: 'varchar', length: '20', default: "'healthy'" },
          { name: 'last_health_check', type: 'timestamp', isNullable: true },
          { name: 'total_requests', type: 'bigint', default: 0 },
          { name: 'total_success', type: 'bigint', default: 0 },
          { name: 'total_failures', type: 'bigint', default: 0 },
          { name: 'cost_weight', type: 'decimal', precision: 3, scale: 2, default: 0.4 },
          { name: 'speed_weight', type: 'decimal', precision: 3, scale: 2, default: 0.3 },
          { name: 'success_rate_weight', type: 'decimal', precision: 3, scale: 2, default: 0.3 },
          { name: 'alert_enabled', type: 'boolean', default: true },
          { name: 'alert_channels', type: 'jsonb', isNullable: true },
          { name: 'alert_recipients', type: 'jsonb', isNullable: true },
          { name: 'avg_sms_receive_time', type: 'int', isNullable: true },
          { name: 'p95_sms_receive_time', type: 'int', isNullable: true },
          { name: 'last_success_rate', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'webhook_enabled', type: 'boolean', default: false },
          { name: 'webhook_url', type: 'varchar', length: '255', isNullable: true },
          { name: 'webhook_secret', type: 'varchar', length: '255', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
          { name: 'metadata', type: 'jsonb', isNullable: true },
        ],
      }),
      true,
    );

    // Create number_pool table
    await queryRunner.createTable(
      new Table({
        name: 'number_pool',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'provider', type: 'varchar', length: '50' },
          { name: 'provider_activation_id', type: 'varchar', length: '100' },
          { name: 'phone_number', type: 'varchar', length: '20' },
          { name: 'country_code', type: 'varchar', length: '5' },
          { name: 'service_code', type: 'varchar', length: '50' },
          { name: 'cost', type: 'decimal', precision: 10, scale: 4 },
          { name: 'status', type: 'varchar', length: '20', default: "'available'" },
          { name: 'reserved_by_device', type: 'uuid', isNullable: true },
          { name: 'reserved_at', type: 'timestamp', isNullable: true },
          { name: 'preheated', type: 'boolean', default: false },
          { name: 'preheated_at', type: 'timestamp', isNullable: true },
          { name: 'priority', type: 'int', default: 0 },
          { name: 'reserved_count', type: 'int', default: 0 },
          { name: 'used_count', type: 'int', default: 0 },
          { name: 'bulk_purchased', type: 'boolean', default: false },
          { name: 'discount_rate', type: 'decimal', precision: 5, scale: 2, default: 0.00 },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'expires_at', type: 'timestamp' },
        ],
      }),
      true,
    );

    // Create virtual_numbers table
    await queryRunner.createTable(
      new Table({
        name: 'virtual_numbers',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'provider', type: 'varchar', length: '50' },
          { name: 'provider_activation_id', type: 'varchar', length: '100' },
          { name: 'phone_number', type: 'varchar', length: '20' },
          { name: 'country_code', type: 'varchar', length: '5' },
          { name: 'country_name', type: 'varchar', length: '100', isNullable: true },
          { name: 'service_code', type: 'varchar', length: '50' },
          { name: 'service_name', type: 'varchar', length: '100', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', default: "'active'" },
          { name: 'cost', type: 'decimal', precision: 10, scale: 4 },
          { name: 'currency', type: 'varchar', length: '10', default: "'USD'" },
          { name: 'device_id', type: 'uuid', isNullable: true },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'rental_type', type: 'varchar', length: '20', default: "'one_time'" },
          { name: 'rental_start', type: 'timestamp', isNullable: true },
          { name: 'rental_end', type: 'timestamp', isNullable: true },
          { name: 'rental_sms_count', type: 'int', default: 0 },
          { name: 'from_pool', type: 'boolean', default: false },
          { name: 'pool_id', type: 'uuid', isNullable: true },
          { name: 'selected_by_algorithm', type: 'varchar', length: '50', isNullable: true },
          { name: 'fallback_count', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'activated_at', type: 'timestamp', isNullable: true },
          { name: 'sms_received_at', type: 'timestamp', isNullable: true },
          { name: 'completed_at', type: 'timestamp', isNullable: true },
          { name: 'expires_at', type: 'timestamp' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
          { name: 'metadata', type: 'jsonb', isNullable: true },
        ],
      }),
      true,
    );

    // Create sms_messages table
    await queryRunner.createTable(
      new Table({
        name: 'sms_messages',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'virtual_number_id', type: 'uuid' },
          { name: 'message_text', type: 'text', isNullable: true },
          { name: 'verification_code', type: 'varchar', length: '20', isNullable: true },
          { name: 'sender', type: 'varchar', length: '50', isNullable: true },
          { name: 'delivered_to_device', type: 'boolean', default: false },
          { name: 'received_at', type: 'timestamp', default: 'now()' },
          { name: 'delivered_at', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'virtual_numbers',
      new TableIndex({ name: 'idx_virtual_numbers_provider_activation', columnNames: ['provider', 'provider_activation_id'], isUnique: true }),
    );
    await queryRunner.createIndex('virtual_numbers', new TableIndex({ name: 'idx_virtual_numbers_status', columnNames: ['status'] }));
    await queryRunner.createIndex('virtual_numbers', new TableIndex({ name: 'idx_virtual_numbers_device_id', columnNames: ['device_id'] }));
    await queryRunner.createIndex('virtual_numbers', new TableIndex({ name: 'idx_virtual_numbers_created_at', columnNames: ['created_at'] }));
    await queryRunner.createIndex('virtual_numbers', new TableIndex({ name: 'idx_virtual_numbers_expires_at', columnNames: ['expires_at'] }));

    await queryRunner.createIndex('number_pool', new TableIndex({ name: 'idx_number_pool_status_service', columnNames: ['status', 'service_code'] }));
    await queryRunner.createIndex('number_pool', new TableIndex({ name: 'idx_number_pool_expires_at', columnNames: ['expires_at'] }));

    await queryRunner.createIndex('sms_messages', new TableIndex({ name: 'idx_sms_messages_virtual_number_id', columnNames: ['virtual_number_id'] }));
    await queryRunner.createIndex('sms_messages', new TableIndex({ name: 'idx_sms_messages_received_at', columnNames: ['received_at'] }));

    // Create foreign keys
    await queryRunner.createForeignKey(
      'virtual_numbers',
      new TableForeignKey({
        columnNames: ['pool_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'number_pool',
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'sms_messages',
      new TableForeignKey({
        columnNames: ['virtual_number_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'virtual_numbers',
        onDelete: 'CASCADE',
      }),
    );

    // Insert initial provider configs
    await queryRunner.query(`
      INSERT INTO provider_configs (provider, display_name, api_endpoint, api_key, priority, enabled)
      VALUES
        ('sms-activate', 'SMS-Activate', 'https://api.sms-activate.io/stubs/handler_api.php', '', 1, TRUE),
        ('5sim', '5sim', 'https://5sim.net/v1', '', 2, FALSE),
        ('smspool', 'SMSPool', 'https://api.smspool.net', '', 3, FALSE)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sms_messages');
    await queryRunner.dropTable('virtual_numbers');
    await queryRunner.dropTable('number_pool');
    await queryRunner.dropTable('provider_configs');
  }
}
