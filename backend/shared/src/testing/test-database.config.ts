import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Test Database Configuration
 *
 * 用于创建测试数据库连接
 *
 * 使用方法:
 * ```typescript
 * import { createTestDataSource } from '@cloudphone/shared/testing';
 *
 * let dataSource: DataSource;
 *
 * beforeAll(async () => {
 *   dataSource = await createTestDataSource({
 *     database: 'cloudphone_test',
 *     entities: [User, UserEvent],
 *   });
 * });
 *
 * afterAll(async () => {
 *   await dataSource.destroy();
 * });
 * ```
 */

/**
 * 创建测试数据源
 *
 * @param options 额外的数据源选项
 * @returns 数据源实例
 */
export async function createTestDataSource(
  options: Partial<DataSourceOptions> = {}
): Promise<DataSource> {
  const defaultOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: (process.env.DB_TEST_DATABASE || 'cloudphone_test') as string,
    synchronize: true, // 测试环境自动同步schema
    dropSchema: false, // 不自动删除schema（由测试控制）
    logging: process.env.DB_LOGGING === 'true',
    entities: [],
    migrations: [],
    ...options,
  } as DataSourceOptions;

  const dataSource = new DataSource(defaultOptions);
  await dataSource.initialize();

  return dataSource;
}

/**
 * 清空所有表数据（保留schema）
 *
 * @param dataSource 数据源
 */
export async function clearAllTables(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;

  // 禁用外键约束
  await dataSource.query('SET session_replication_role = replica;');

  // 清空所有表
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }

  // 启用外键约束
  await dataSource.query('SET session_replication_role = DEFAULT;');
}

/**
 * 重置数据库（删除并重建schema）
 *
 * @param dataSource 数据源
 */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.dropDatabase();
  await dataSource.synchronize();
}

/**
 * 创建测试事务
 *
 * 用于隔离测试，每个测试在独立事务中运行，测试结束后回滚
 *
 * @param dataSource 数据源
 * @param callback 测试回调函数
 */
export async function runInTestTransaction<T>(
  dataSource: DataSource,
  callback: (dataSource: DataSource) => Promise<T>
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // 创建临时数据源（使用当前事务）
    const testDataSource = {
      ...dataSource,
      manager: queryRunner.manager,
      createQueryRunner: () => queryRunner,
    } as DataSource;

    const result = await callback(testDataSource);

    // 测试结束后回滚（不提交）
    await queryRunner.rollbackTransaction();

    return result;
  } finally {
    await queryRunner.release();
  }
}

/**
 * 等待数据库连接就绪
 *
 * @param dataSource 数据源
 * @param maxRetries 最大重试次数
 * @param delayMs 重试间隔（毫秒）
 */
export async function waitForDatabase(
  dataSource: DataSource,
  maxRetries: number = 10,
  delayMs: number = 1000
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await dataSource.query('SELECT 1');
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error(
          `Database connection failed after ${maxRetries} attempts: ${error.message}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
