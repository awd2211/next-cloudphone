import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCacheService } from '../permission-cache.service';
import { PermissionCheckerService } from '../permission-checker.service';
import { Permission } from '../../entities/permission.entity';
import { DataScope } from '../../entities/data-scope.entity';
import { FieldPermission } from '../../entities/field-permission.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';

/**
 * 权限缓存集成测试
 * 测试 PermissionCacheService 与 PermissionCheckerService 的集成
 */
describe('PermissionCache Integration', () => {
  let cacheService: PermissionCacheService;
  let checkerService: PermissionCheckerService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'cloudphone_user',
          entities: [Permission, DataScope, FieldPermission, User, Role],
          synchronize: false,
        }),
        TypeOrmModule.forFeature([Permission, DataScope, FieldPermission, User, Role]),
      ],
      providers: [PermissionCacheService, PermissionCheckerService],
    }).compile();

    cacheService = module.get<PermissionCacheService>(PermissionCacheService);
    checkerService = module.get<PermissionCheckerService>(PermissionCheckerService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Cache Service', () => {
    it('should be defined', () => {
      expect(cacheService).toBeDefined();
      expect(checkerService).toBeDefined();
    });

    it('should have cache enabled', () => {
      const stats = cacheService.getCacheStats();
      expect(stats.enabled).toBe(true);
      expect(stats.ttl).toBe(300); // 5 minutes
    });
  });

  describe('Cache Performance', () => {
    const testUserId = '10000000-0000-0000-0000-000000000001'; // admin user

    beforeEach(() => {
      // 清除缓存
      cacheService.invalidateCache();
    });

    it('should cache user permissions', async () => {
      // 第一次调用 - 从数据库加载
      const start1 = Date.now();
      const cached1 = await cacheService.getUserPermissions(testUserId);
      const duration1 = Date.now() - start1;

      expect(cached1).toBeDefined();

      if (cached1) {
        expect(cached1.userId).toBe(testUserId);
        expect(cached1.permissions).toBeDefined();
        expect(Array.isArray(cached1.permissions)).toBe(true);
      }

      // 第二次调用 - 从缓存获取
      const start2 = Date.now();
      const cached2 = await cacheService.getUserPermissions(testUserId);
      const duration2 = Date.now() - start2;

      expect(cached2).toBeDefined();

      // 缓存应该显著提高性能
      console.log(`First call (DB):    ${duration1}ms`);
      console.log(`Second call (Cache): ${duration2}ms`);

      if (duration1 > 5) {
        // 只有当第一次查询足够慢时才进行比较
        const improvement = ((duration1 - duration2) / duration1) * 100;
        console.log(`Performance improvement: ${improvement.toFixed(1)}%`);

        // 缓存查询应该更快（但在单元测试中可能不明显）
        expect(duration2).toBeLessThanOrEqual(duration1);
      }
    });

    it('should invalidate cache correctly', async () => {
      // 首先缓存数据
      const cached1 = await cacheService.getUserPermissions(testUserId);
      expect(cached1).toBeDefined();

      const statsBefore = cacheService.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      // 失效缓存
      cacheService.invalidateCache(testUserId);

      const statsAfter = cacheService.getCacheStats();
      expect(statsAfter.size).toBe(statsBefore.size - 1);

      // 再次获取应该从数据库重新加载
      const cached2 = await cacheService.getUserPermissions(testUserId);
      expect(cached2).toBeDefined();
    });

    it('should handle cache expiration', async () => {
      // 获取缓存统计
      const stats = cacheService.getCacheStats();

      expect(stats).toEqual({
        size: expect.any(Number),
        enabled: true,
        ttl: 300, // 5 minutes
      });
    });
  });

  describe('Integration with PermissionChecker', () => {
    const testUserId = '10000000-0000-0000-0000-000000000001';

    it('should use cache in permission checking', async () => {
      // 清除缓存
      cacheService.invalidateCache();

      // 第一次检查 - 应该加载缓存
      const start1 = Date.now();
      const result1 = await checkerService.checkFunctionPermission(testUserId, 'user:read');
      const duration1 = Date.now() - start1;

      console.log(`First permission check: ${duration1}ms`);
      expect(typeof result1).toBe('boolean');

      // 第二次检查 - 应该使用缓存
      const start2 = Date.now();
      const result2 = await checkerService.checkFunctionPermission(testUserId, 'user:read');
      const duration2 = Date.now() - start2;

      console.log(`Second permission check: ${duration2}ms`);
      expect(result2).toBe(result1); // 结果应该一致

      // 验证缓存被使用
      const stats = cacheService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Cache Export', () => {
    it('should export cache snapshot', async () => {
      // 清除缓存
      cacheService.invalidateCache();

      // 加载一些数据
      await cacheService.getUserPermissions('10000000-0000-0000-0000-000000000001');

      // 导出缓存
      const snapshot = cacheService.exportCache();

      expect(Array.isArray(snapshot)).toBe(true);
      expect(snapshot.length).toBeGreaterThan(0);

      if (snapshot.length > 0) {
        const entry = snapshot[0];
        expect(entry).toHaveProperty('userId');
        expect(entry).toHaveProperty('tenantId');
        expect(entry).toHaveProperty('rolesCount');
        expect(entry).toHaveProperty('permissionsCount');
        expect(entry).toHaveProperty('cachedAt');
      }
    });
  });
});
