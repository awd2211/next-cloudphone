import { AppDataSource } from '../config/data-source';
import * as bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 开始初始化数据库...');

  try {
    // 初始化数据源
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 获取仓库
    const userRepo = AppDataSource.getRepository('User');
    const roleRepo = AppDataSource.getRepository('Role');
    const permissionRepo = AppDataSource.getRepository('Permission');
    const planRepo = AppDataSource.getRepository('Plan');

    // 1. 创建权限
    console.log('📝 创建权限...');
    const permissions = [
      // 用户管理权限
      { name: 'users.create', resource: 'users', action: 'create', description: '创建用户' },
      { name: 'users.read', resource: 'users', action: 'read', description: '查看用户' },
      { name: 'users.update', resource: 'users', action: 'update', description: '更新用户' },
      { name: 'users.delete', resource: 'users', action: 'delete', description: '删除用户' },

      // 设备管理权限
      { name: 'devices.create', resource: 'devices', action: 'create', description: '创建设备' },
      { name: 'devices.read', resource: 'devices', action: 'read', description: '查看设备' },
      { name: 'devices.update', resource: 'devices', action: 'update', description: '更新设备' },
      { name: 'devices.delete', resource: 'devices', action: 'delete', description: '删除设备' },
      { name: 'devices.control', resource: 'devices', action: 'control', description: '控制设备' },

      // 应用管理权限
      { name: 'apps.create', resource: 'apps', action: 'create', description: '上传应用' },
      { name: 'apps.read', resource: 'apps', action: 'read', description: '查看应用' },
      { name: 'apps.update', resource: 'apps', action: 'update', description: '更新应用' },
      { name: 'apps.delete', resource: 'apps', action: 'delete', description: '删除应用' },
      { name: 'apps.install', resource: 'apps', action: 'install', description: '安装应用' },

      // 计费管理权限
      { name: 'billing.read', resource: 'billing', action: 'read', description: '查看计费' },
      { name: 'billing.manage', resource: 'billing', action: 'manage', description: '管理计费' },

      // 角色管理权限
      { name: 'roles.create', resource: 'roles', action: 'create', description: '创建角色' },
      { name: 'roles.read', resource: 'roles', action: 'read', description: '查看角色' },
      { name: 'roles.update', resource: 'roles', action: 'update', description: '更新角色' },
      { name: 'roles.delete', resource: 'roles', action: 'delete', description: '删除角色' },
    ];

    const createdPermissions = [];
    for (const perm of permissions) {
      const existing = await permissionRepo.findOne({ where: { name: perm.name } });
      if (!existing) {
        const created = await permissionRepo.save(perm);
        createdPermissions.push(created);
      } else {
        createdPermissions.push(existing);
      }
    }
    console.log(`✅ 创建了 ${createdPermissions.length} 个权限`);

    // 2. 创建角色
    console.log('👥 创建角色...');

    // 超级管理员角色（所有权限）
    let adminRole = await roleRepo.findOne({ where: { name: 'admin' } });
    if (!adminRole) {
      adminRole = await roleRepo.save({
        name: 'admin',
        description: '超级管理员，拥有所有权限',
        isSystem: true,
      });
      // 关联所有权限
      adminRole.permissions = createdPermissions;
      await roleRepo.save(adminRole);
    }

    // 普通用户角色
    let userRole = await roleRepo.findOne({ where: { name: 'user' } });
    if (!userRole) {
      userRole = await roleRepo.save({
        name: 'user',
        description: '普通用户，基础权限',
        isSystem: true,
      });
      // 关联基础权限
      const userPermissions = createdPermissions.filter(p =>
        p.name.includes('read') ||
        p.name === 'devices.create' ||
        p.name === 'apps.install'
      );
      userRole.permissions = userPermissions;
      await roleRepo.save(userRole);
    }

    console.log('✅ 创建了 2 个默认角色');

    // 3. 创建管理员用户
    console.log('🔐 创建管理员用户...');
    const adminEmail = 'admin@cloudphone.com';
    let adminUser = await userRepo.findOne({ where: { email: adminEmail } });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123456', 10);
      adminUser = await userRepo.save({
        username: 'admin',
        email: adminEmail,
        password: hashedPassword,
        fullName: '系统管理员',
        status: 'active',
      });
      // 关联管理员角色
      adminUser.roles = [adminRole];
      await userRepo.save(adminUser);
      console.log('✅ 创建管理员用户成功');
      console.log('   用户名: admin');
      console.log('   邮箱: admin@cloudphone.com');
      console.log('   密码: admin123456');
    } else {
      console.log('⚠️  管理员用户已存在');
    }

    // 4. 创建测试用户
    console.log('👤 创建测试用户...');
    const testEmail = 'test@cloudphone.com';
    let testUser = await userRepo.findOne({ where: { email: testEmail } });

    if (!testUser) {
      const hashedPassword = await bcrypt.hash('test123456', 10);
      testUser = await userRepo.save({
        username: 'testuser',
        email: testEmail,
        password: hashedPassword,
        fullName: '测试用户',
        status: 'active',
      });
      // 关联普通用户角色
      testUser.roles = [userRole];
      await userRepo.save(testUser);
      console.log('✅ 创建测试用户成功');
      console.log('   用户名: testuser');
      console.log('   邮箱: test@cloudphone.com');
      console.log('   密码: test123456');
    } else {
      console.log('⚠️  测试用户已存在');
    }

    // 5. 创建套餐计划
    console.log('💰 创建套餐计划...');
    const plans = [
      {
        name: '免费版',
        type: 'free',
        description: '适合个人用户体验',
        price: 0,
        billingCycle: 'monthly',
        deviceQuota: 1,
        storageQuotaGB: 5,
        trafficQuotaGB: 10,
        features: ['1 个云手机', '5GB 存储', '10GB 流量'],
        isPublic: true,
        isActive: true,
      },
      {
        name: '基础版',
        type: 'basic',
        description: '适合个人开发者',
        price: 29.9,
        billingCycle: 'monthly',
        deviceQuota: 5,
        storageQuotaGB: 20,
        trafficQuotaGB: 50,
        features: ['5 个云手机', '20GB 存储', '50GB 流量', '标准支持'],
        isPublic: true,
        isActive: true,
      },
      {
        name: '专业版',
        type: 'pro',
        description: '适合团队和中小企业',
        price: 99.9,
        billingCycle: 'monthly',
        deviceQuota: 20,
        storageQuotaGB: 100,
        trafficQuotaGB: 200,
        features: ['20 个云手机', '100GB 存储', '200GB 流量', '优先支持', 'API 访问'],
        isPublic: true,
        isActive: true,
      },
      {
        name: '企业版',
        type: 'enterprise',
        description: '适合大型企业',
        price: 499.9,
        billingCycle: 'monthly',
        deviceQuota: 100,
        storageQuotaGB: 500,
        trafficQuotaGB: 1000,
        features: ['100 个云手机', '500GB 存储', '1TB 流量', '7x24 支持', 'API 访问', '专属服务器'],
        isPublic: true,
        isActive: true,
      },
    ];

    for (const plan of plans) {
      const existing = await planRepo.findOne({ where: { name: plan.name } });
      if (!existing) {
        await planRepo.save(plan);
      }
    }
    console.log(`✅ 创建了 ${plans.length} 个套餐计划`);

    console.log('\n🎉 数据库初始化完成！\n');
    console.log('===== 登录信息 =====');
    console.log('管理员账号:');
    console.log('  用户名: admin');
    console.log('  密码: admin123456');
    console.log('');
    console.log('测试账号:');
    console.log('  用户名: testuser');
    console.log('  密码: test123456');
    console.log('==================\n');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

// 执行种子数据
seed();
