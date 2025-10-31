import { DataSource } from 'typeorm';
import { seedPlans } from './plans.seed';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'cloudphone_billing',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function runSeeds() {
  try {
    console.log('🌱 Starting database seeding...');

    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    // 运行种子
    await seedPlans(AppDataSource);

    console.log('✅ All seeds completed successfully!');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

runSeeds();
