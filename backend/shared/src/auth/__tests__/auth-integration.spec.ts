/**
 * 认证系统集成测试
 *
 * 测试范围:
 * 1. JWT Token 生成和验证
 * 2. 权限守卫集成
 * 3. 跨服务 Token 验证
 * 4. 权限检查完整流程
 *
 * 注意: 这是模拟集成测试,真实的 E2E 测试应该在独立的测试套件中进行
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, UseGuards, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BaseJwtStrategy } from '../strategies/base-jwt.strategy';
import { BasePermissionsGuard } from '../guards/base-permissions.guard';
import { RequirePermissions, PermissionOperator, PERMISSIONS_KEY, PermissionRequirement } from '../decorators/permissions.decorator';
import { Public } from '../decorators/public.decorator';
import { Reflector, APP_GUARD } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import request = require('supertest');

// ==================== 测试用的装饰器 ====================

/**
 * 测试专用的 Permissions 装饰器
 * 支持数组参数和操作符
 */
const Permissions = (permissions: string[], operator: PermissionOperator = PermissionOperator.AND): MethodDecorator => {
  return SetMetadata(PERMISSIONS_KEY, {
    permissions,
    operator,
  } as PermissionRequirement);
};

// ==================== 测试用的实现类 ====================

/**
 * 测试用 JWT Strategy
 */
class TestJwtStrategy extends BaseJwtStrategy {
  constructor(configService: ConfigService) {
    super(configService);
  }
}

/**
 * 测试用 Permissions Guard
 */
class TestPermissionsGuard extends BasePermissionsGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }
}

// ==================== 测试用的控制器 ====================

@Controller('test')
class TestController {
  @Public()
  @Get('public')
  publicEndpoint() {
    return { message: '公开端点' };
  }

  @Get('authenticated')
  @UseGuards(AuthGuard('jwt'))
  authenticatedEndpoint() {
    return { message: '需要认证的端点' };
  }

  @Get('with-permission')
  @UseGuards(AuthGuard('jwt'), TestPermissionsGuard)
  @Permissions(['device:read'])
  withPermissionEndpoint() {
    return { message: '需要 device:read 权限' };
  }

  @Get('with-multiple-permissions')
  @UseGuards(AuthGuard('jwt'), TestPermissionsGuard)
  @Permissions(['device:read', 'device:write'], PermissionOperator.AND)
  withMultiplePermissionsEndpoint() {
    return { message: '需要 device:read 和 device:write 权限' };
  }

  @Get('with-or-permissions')
  @UseGuards(AuthGuard('jwt'), TestPermissionsGuard)
  @Permissions(['device:read', 'user:read'], PermissionOperator.OR)
  withOrPermissionsEndpoint() {
    return { message: '需要 device:read 或 user:read 任一权限' };
  }

  @Get('superadmin-only')
  @UseGuards(AuthGuard('jwt'), TestPermissionsGuard)
  @Permissions(['sensitive:delete'])
  superadminOnlyEndpoint() {
    return { message: '仅超级管理员可访问' };
  }
}

// ==================== 测试模块 ====================

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [
        () => ({
          JWT_SECRET: 'T3stS3cr3t!K3y@F0rUn1tT3st1ng#W1thC0mpl3x1ty$',
          JWT_EXPIRES_IN: '1h',
          NODE_ENV: 'test',
        }),
      ],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  controllers: [TestController],
  providers: [
    TestJwtStrategy,
    TestPermissionsGuard,
    // 注意: 不使用 APP_GUARD,而是在路由级别使用
  ],
})
class TestAppModule {}

// ==================== 集成测试 ====================

describe('认证系统集成测试', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== Helper 函数 ====================

  const generateToken = (payload: any) => {
    return jwtService.sign(payload, {
      issuer: 'cloudphone-platform',
      audience: 'cloudphone-users',
    });
  };

  // ==================== 公开端点测试 ====================

  describe('公开端点访问', () => {
    it('应该允许无 Token 访问公开端点', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/public')
        .expect(200);

      expect(response.body.message).toBe('公开端点');
    });
  });

  // ==================== 认证测试 ====================

  describe('JWT 认证', () => {
    it('应该拒绝无 Token 访问受保护端点', async () => {
      await request(app.getHttpServer())
        .get('/test/authenticated')
        .expect(401);
    });

    it('应该拒绝无效 Token 访问', async () => {
      await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('应该允许有效 Token 访问受保护端点', async () => {
      const token = generateToken({
        sub: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        permissions: [],
      });

      const response = await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('需要认证的端点');
    });

    it('应该拒绝缺少必需字段的 Token', async () => {
      const token = generateToken({
        // 缺少 sub 和 username
        email: 'test@example.com',
      });

      await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  // ==================== 权限检查测试 ====================

  describe('单一权限检查', () => {
    it('应该允许拥有正确权限的用户访问', async () => {
      const token = generateToken({
        sub: 'user-with-perm',
        username: 'permuser',
        permissions: ['device:read', 'device:write'],
      });

      const response = await request(app.getHttpServer())
        .get('/test/with-permission')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('需要 device:read 权限');
    });

    it('应该拒绝没有权限的用户访问', async () => {
      const token = generateToken({
        sub: 'user-no-perm',
        username: 'nopermuser',
        permissions: ['app:read'],
      });

      await request(app.getHttpServer())
        .get('/test/with-permission')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('AND 操作符权限检查', () => {
    it('应该允许拥有所有必需权限的用户访问', async () => {
      const token = generateToken({
        sub: 'user-all-perms',
        username: 'allpermsuser',
        permissions: ['device:read', 'device:write', 'device:delete'],
      });

      const response = await request(app.getHttpServer())
        .get('/test/with-multiple-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('需要 device:read 和 device:write 权限');
    });

    it('应该拒绝只拥有部分权限的用户访问', async () => {
      const token = generateToken({
        sub: 'user-partial-perms',
        username: 'partialuser',
        permissions: ['device:read'], // 缺少 device:write
      });

      await request(app.getHttpServer())
        .get('/test/with-multiple-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('OR 操作符权限检查', () => {
    it('应该允许拥有任一权限的用户访问', async () => {
      const token = generateToken({
        sub: 'user-one-perm',
        username: 'onepermuser',
        permissions: ['device:read'], // 有 device:read,没有 user:read
      });

      const response = await request(app.getHttpServer())
        .get('/test/with-or-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('需要 device:read 或 user:read 任一权限');
    });

    it('应该允许拥有另一个权限的用户访问', async () => {
      const token = generateToken({
        sub: 'user-other-perm',
        username: 'otheruser',
        permissions: ['user:read'], // 没有 device:read,有 user:read
      });

      const response = await request(app.getHttpServer())
        .get('/test/with-or-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('需要 device:read 或 user:read 任一权限');
    });

    it('应该拒绝没有任何必需权限的用户访问', async () => {
      const token = generateToken({
        sub: 'user-no-match',
        username: 'nomatchuser',
        permissions: ['app:read'], // 既没有 device:read 也没有 user:read
      });

      await request(app.getHttpServer())
        .get('/test/with-or-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ==================== 超级管理员测试 ====================

  describe('超级管理员权限', () => {
    it('应该允许超级管理员访问所有端点 (即使没有对应权限)', async () => {
      const token = generateToken({
        sub: 'admin-001',
        username: 'superadmin',
        isSuperAdmin: true,
        permissions: [], // 没有任何权限
      });

      // 测试需要敏感权限的端点
      const response = await request(app.getHttpServer())
        .get('/test/superadmin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('仅超级管理员可访问');
    });

    it('应该允许超级管理员访问多权限端点', async () => {
      const token = generateToken({
        sub: 'admin-002',
        username: 'rootadmin',
        isSuperAdmin: true,
        permissions: [],
      });

      await request(app.getHttpServer())
        .get('/test/with-multiple-permissions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  // ==================== Token 有效期测试 ====================

  describe('Token 过期处理', () => {
    it('应该拒绝过期的 Token', async () => {
      // 生成一个已过期的 token (expiresIn: -1s)
      const expiredToken = jwtService.sign(
        {
          sub: 'user-expired',
          username: 'expireduser',
        },
        {
          expiresIn: '-1s',
          issuer: 'cloudphone-platform',
          audience: 'cloudphone-users',
        }
      );

      await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });

  // ==================== 边界情况测试 ====================

  describe('边界情况', () => {
    it('应该处理空权限数组的用户', async () => {
      const token = generateToken({
        sub: 'user-empty-perms',
        username: 'emptyuser',
        permissions: [],
      });

      await request(app.getHttpServer())
        .get('/test/with-permission')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('应该正确处理点号格式的权限', async () => {
      const token = generateToken({
        sub: 'user-dot-format',
        username: 'dotuser',
        permissions: ['device.read'], // 使用点号格式
      });

      // 端点要求 device:read (冒号格式),应该自动匹配
      const response = await request(app.getHttpServer())
        .get('/test/with-permission')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('需要 device:read 权限');
    });

    it('应该处理大小写敏感的权限', async () => {
      const token = generateToken({
        sub: 'user-case',
        username: 'caseuser',
        permissions: ['Device:Read'], // 不同大小写
      });

      // 权限检查应该是大小写敏感的
      await request(app.getHttpServer())
        .get('/test/with-permission')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
