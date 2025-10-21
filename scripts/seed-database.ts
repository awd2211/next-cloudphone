#!/usr/bin/env ts-node
import { DataSource } from 'typeorm';
import * as path from 'path';

// 用户服务配置
const userServiceDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cloudphone',
  entities: [path.join(__dirname, '../backend/user-service/src/entities/*.entity.ts')],
  synchronize: false,
});

// 设备服务配置
const deviceServiceDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cloudphone',
  entities: [path.join(__dirname, '../backend/device-service/src/entities/*.entity.ts')],
  synchronize: false,
});

// 计费服务配置
const billingServiceDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cloudphone',
  entities: [
    path.join(__dirname, '../backend/billing-service/src/billing/entities/*.entity.ts'),
    path.join(__dirname, '../backend/billing-service/src/balance/entities/*.entity.ts'),
    path.join(__dirname, '../backend/billing-service/src/invoices/entities/*.entity.ts'),
    path.join(__dirname, '../backend/billing-service/src/billing-rules/entities/*.entity.ts'),
    path.join(__dirname, '../backend/billing-service/src/payments/entities/*.entity.ts'),
  ],
  synchronize: false,
});

// 应用服务配置
const appServiceDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cloudphone',
  entities: [path.join(__dirname, '../backend/app-service/src/entities/*.entity.ts')],
  synchronize: false,
});

async function runSeeds() {
  console.log('🚀 Starting database seeding...\n');

  try {
    // 1. 初始化用户服务数据源
    console.log('📦 Connecting to User Service database...');
    await userServiceDataSource.initialize();
    console.log('✅ User Service connected\n');

    // 加载并运行用户种子数据
    const { seedUsers } = await import('../backend/user-service/src/seeds/user.seed');
    const { users } = await seedUsers(userServiceDataSource);
    const userIds = users.filter(u => u.username.startsWith('testuser')).map(u => u.id);

    // 2. 初始化设备服务数据源
    console.log('\n📦 Connecting to Device Service database...');
    await deviceServiceDataSource.initialize();
    console.log('✅ Device Service connected\n');

    // 加载并运行设备种子数据
    const { seedDevices } = await import('../backend/device-service/src/seeds/device.seed');
    await seedDevices(deviceServiceDataSource, userIds);

    // 3. 初始化计费服务数据源
    console.log('\n📦 Connecting to Billing Service database...');
    await billingServiceDataSource.initialize();
    console.log('✅ Billing Service connected\n');

    // 加载并运行计费种子数据
    const { seedBilling } = await import('../backend/billing-service/src/seeds/billing.seed');
    await seedBilling(billingServiceDataSource, userIds);

    // 4. 初始化应用服务数据源
    console.log('\n📦 Connecting to App Service database...');
    await appServiceDataSource.initialize();
    console.log('✅ App Service connected\n');

    // 加载并运行应用种子数据
    const { seedApps } = await import('../backend/app-service/src/seeds/app.seed');
    await seedApps(appServiceDataSource);

    console.log('\n\n🎉 All seed data has been successfully created!\n');
    console.log('📝 Summary:');
    console.log('   ✅ Users, Roles, Permissions, Quotas');
    console.log('   ✅ Devices, Templates, Nodes');
    console.log('   ✅ Plans, Orders, Balances, Billing Rules');
    console.log('   ✅ Applications');
    console.log('\n💡 You can now login with:');
    console.log('   - admin / admin123 (管理员)');
    console.log('   - testuser1 / user123 (测试用户)');
    console.log('   - testuser2 / user123 (测试用户)');
    console.log('   - testuser3 / user123 (测试用户)');
    console.log('   - support1 / user123 (客服)\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    // 关闭所有连接
    if (userServiceDataSource.isInitialized) {
      await userServiceDataSource.destroy();
    }
    if (deviceServiceDataSource.isInitialized) {
      await deviceServiceDataSource.destroy();
    }
    if (billingServiceDataSource.isInitialized) {
      await billingServiceDataSource.destroy();
    }
    if (appServiceDataSource.isInitialized) {
      await appServiceDataSource.destroy();
    }
    console.log('\n✅ Database connections closed');
  }
}

// 运行种子脚本
runSeeds()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
