import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';

/**
 * 创建测试用户脚本
 * 为每个角色创建对应的测试账户
 */

interface TestUser {
  username: string;
  email: string;
  password: string;
  phone: string;
  roleName: string;
  description: string;
}

const TEST_USERS: TestUser[] = [
  {
    username: 'admin',
    email: 'admin@cloudphone.com',
    password: 'admin123',
    phone: '13800138000',
    roleName: 'Super Admin',
    description: '超级管理员 - 拥有所有权限',
  },
  {
    username: 'manager',
    email: 'manager@cloudphone.com',
    password: 'manager123',
    phone: '13800138001',
    roleName: 'Admin',
    description: '管理员 - 拥有大部分管理权限',
  },
  {
    username: 'device_admin',
    email: 'device@cloudphone.com',
    password: 'device123',
    phone: '13800138002',
    roleName: 'Device Manager',
    description: '设备管理员 - 管理云手机设备',
  },
  {
    username: 'user_admin',
    email: 'usermgr@cloudphone.com',
    password: 'user123',
    phone: '13800138003',
    roleName: 'User Manager',
    description: '用户管理员 - 管理用户账户',
  },
  {
    username: 'finance',
    email: 'finance@cloudphone.com',
    password: 'finance123',
    phone: '13800138004',
    roleName: 'Finance Manager',
    description: '财务管理员 - 管理订单和账单',
  },
  {
    username: 'testuser',
    email: 'user@cloudphone.com',
    password: 'user123',
    phone: '13800138005',
    roleName: 'User',
    description: '普通用户 - 基础功能权限',
  },
  {
    username: 'demo',
    email: 'demo@cloudphone.com',
    password: 'demo123',
    phone: '13800138006',
    roleName: 'User',
    description: '演示账户 - 普通用户',
  },
];

async function createTestUsers(connection: DataSource): Promise<void> {
  const userRepo = connection.getRepository(User);
  const roleRepo = connection.getRepository(Role);

  console.log('\n👥 创建测试用户...\n');

  for (const testUser of TEST_USERS) {
    try {
      // 检查用户是否已存在
      const existingUser = await userRepo.findOne({
        where: { username: testUser.username },
      });

      if (existingUser) {
        console.log(`  ⏭️  用户已存在: ${testUser.username}`);
        continue;
      }

      // 查找角色
      const role = await roleRepo.findOne({
        where: { name: testUser.roleName },
      });

      if (!role) {
        console.log(`  ❌ 角色不存在: ${testUser.roleName}`);
        continue;
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(testUser.password, 10);

      // 创建用户
      const user = userRepo.create({
        username: testUser.username,
        email: testUser.email,
        password: hashedPassword,
        phone: testUser.phone,
        status: UserStatus.ACTIVE,
        roles: [role],
      });

      await userRepo.save(user);

      console.log(
        `  ✅ 创建用户: ${testUser.username} / ${testUser.password} (${testUser.roleName})`,
      );
      console.log(`     描述: ${testUser.description}`);
      console.log(`     邮箱: ${testUser.email}`);
    } catch (error) {
      console.error(`  ❌ 创建用户失败 ${testUser.username}:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 开始创建测试用户...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'cloudphone_user',
    entities: [User, Role, Permission],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    await createTestUsers(dataSource);

    console.log('\n✅ 测试用户创建完成！');
    console.log('\n📊 测试账户列表:');
    console.log('╔════════════════╦═══════════════╦══════════════════════════╗');
    console.log('║ 用户名         ║ 密码          ║ 角色                     ║');
    console.log('╠════════════════╬═══════════════╬══════════════════════════╣');
    TEST_USERS.forEach((user) => {
      console.log(
        `║ ${user.username.padEnd(14)} ║ ${user.password.padEnd(13)} ║ ${user.roleName.padEnd(24)} ║`,
      );
    });
    console.log('╚════════════════╩═══════════════╩══════════════════════════╝');
    console.log('\n⚠️  请妥善保管测试账户信息！');
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();

