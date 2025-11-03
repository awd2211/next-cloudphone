import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * 添加智能平台选择相关表
 * 1. provider_blacklist - 平台黑名单
 * 2. ab_test_config - A/B测试配置
 */
export class AddBlacklistAndABTest1730600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 provider_blacklist 表
    await queryRunner.createTable(
      new Table({
        name: 'provider_blacklist',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'blacklist_type',
            type: 'varchar',
            length: '20',
            comment: "temporary, permanent, manual",
          },
          {
            name: 'triggered_by',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: "auto, admin, or user ID",
          },
          {
            name: 'failure_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'last_failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'auto_removed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
            comment: "Expiration time for temporary blacklist",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 创建 provider_blacklist 表的索引
    await queryRunner.createIndex(
      'provider_blacklist',
      new TableIndex({
        name: 'idx_provider_blacklist_provider_reason',
        columnNames: ['provider', 'reason'],
      }),
    );

    await queryRunner.createIndex(
      'provider_blacklist',
      new TableIndex({
        name: 'idx_provider_blacklist_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'provider_blacklist',
      new TableIndex({
        name: 'idx_provider_blacklist_is_active',
        columnNames: ['is_active'],
      }),
    );

    // 创建 ab_test_config 表
    await queryRunner.createTable(
      new Table({
        name: 'ab_test_config',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'test_name',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'draft'",
            comment: "draft, running, paused, completed",
          },
          {
            name: 'providers',
            type: 'jsonb',
            comment: "Array of {provider, weight, enabled}",
          },
          {
            name: 'test_goal',
            type: 'varchar',
            length: '50',
            comment: "cost, success_rate, speed, balance",
          },
          {
            name: 'sample_size_target',
            type: 'int',
            default: 100,
          },
          {
            name: 'current_sample_size',
            type: 'int',
            default: 0,
          },
          {
            name: 'test_results',
            type: 'jsonb',
            isNullable: true,
            comment: "Statistics per provider",
          },
          {
            name: 'winner',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'confidence_level',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'start_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'end_time',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'created_by',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 创建 ab_test_config 表的索引
    await queryRunner.createIndex(
      'ab_test_config',
      new TableIndex({
        name: 'idx_ab_test_config_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'ab_test_config',
      new TableIndex({
        name: 'idx_ab_test_config_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除表（索引会自动删除）
    await queryRunner.dropTable('ab_test_config');
    await queryRunner.dropTable('provider_blacklist');
  }
}
