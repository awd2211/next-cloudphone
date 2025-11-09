import { DataSource } from 'typeorm';
import { Notification } from '../../src/entities/notification.entity';
import { NotificationPreference } from '../../src/entities/notification-preference.entity';
import { NotificationTemplate } from '../../src/entities/notification-template.entity';

/**
 * 创建测试数据库连接
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USERNAME || 'test_user',
    password: process.env.DB_PASSWORD || 'test_password',
    database: process.env.DB_DATABASE || 'cloudphone_notification_test',
    entities: [Notification, NotificationPreference, NotificationTemplate],
    synchronize: true, // 测试环境自动同步表结构
    dropSchema: false, // 不自动删除表（手动清理更可控）
    logging: process.env.LOG_LEVEL === 'debug',
  });

  await dataSource.initialize();
  return dataSource;
}

/**
 * 清理所有测试数据
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // 禁用外键约束
    await queryRunner.query('SET session_replication_role = replica;');

    // 清空所有表
    await queryRunner.query('TRUNCATE TABLE notifications CASCADE;');
    await queryRunner.query('TRUNCATE TABLE notification_preferences CASCADE;');
    await queryRunner.query('TRUNCATE TABLE notification_templates CASCADE;');

    // 重新启用外键约束
    await queryRunner.query('SET session_replication_role = DEFAULT;');
  } finally {
    await queryRunner.release();
  }
}

/**
 * 关闭测试数据库连接
 */
export async function closeTestDataSource(dataSource: DataSource): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
}

/**
 * 重置数据库序列（用于ID从1开始）
 */
export async function resetSequences(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.query(`
      SELECT setval(pg_get_serial_sequence('notifications', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('notification_preferences', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('notification_templates', 'id'), 1, false);
    `);
  } finally {
    await queryRunner.release();
  }
}
