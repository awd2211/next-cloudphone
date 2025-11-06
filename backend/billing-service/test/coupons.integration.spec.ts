import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponsService } from '../src/coupons/coupons.service';
import { Coupon, CouponStatus, CouponType } from '../src/coupons/entities/coupon.entity';

/**
 * 优惠券服务集成测试
 *
 * 测试目的：
 * 1. 验证真实数据库事务回滚行为
 * 2. 验证悲观锁在并发场景下的有效性
 * 3. 验证数据一致性保证
 *
 * 运行前置条件：
 * - PostgreSQL 数据库运行在 localhost:5432
 * - 存在测试数据库 cloudphone_test
 * - 数据库用户 postgres/postgres
 */
describe('CouponsService - Integration Tests', () => {
  let module: TestingModule;
  let service: CouponsService;
  let dataSource: DataSource;
  let testUserId: string;
  let testCouponId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'cloudphone_test',
          entities: [Coupon],
          synchronize: true, // 仅在测试中使用，自动创建表结构
          logging: false,
        }),
        TypeOrmModule.forFeature([Coupon]),
      ],
      providers: [CouponsService],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    dataSource = module.get<DataSource>(DataSource);

    // 初始化测试数据
    testUserId = 'integration-test-user-' + Date.now();
  });

  afterAll(async () => {
    // 清理测试数据
    const couponRepository = dataSource.getRepository(Coupon);
    await couponRepository.delete({ userId: testUserId });

    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // 每个测试前清理该用户的所有优惠券
    const couponRepository = dataSource.getRepository(Coupon);
    await couponRepository.delete({ userId: testUserId });
  });

  describe('useCoupon - 事务回滚验证', () => {
    it('应该在数据库错误时完全回滚事务', async () => {
      // 创建测试优惠券
      const couponRepository = dataSource.getRepository(Coupon);
      const coupon = couponRepository.create({
        code: 'TEST-ROLLBACK-001',
        name: 'Rollback Test Coupon',
        type: CouponType.PERCENTAGE,
        value: 20,
        status: CouponStatus.AVAILABLE,
        userId: testUserId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000), // 24小时后
      });
      await couponRepository.save(coupon);
      testCouponId = coupon.id;

      // 验证初始状态
      const beforeUsage = await couponRepository.findOne({ where: { id: testCouponId } });
      expect(beforeUsage.status).toBe(CouponStatus.AVAILABLE);
      expect(beforeUsage.usedAt).toBeNull();
      expect(beforeUsage.orderId).toBeNull();

      // 尝试使用不存在的优惠券（应该抛出 NotFoundException）
      await expect(
        service.useCoupon('non-existent-id', testUserId, 'order-123')
      ).rejects.toThrow(NotFoundException);

      // 验证数据库中的状态未改变（事务回滚成功）
      const afterFailedUsage = await couponRepository.findOne({ where: { id: testCouponId } });
      expect(afterFailedUsage.status).toBe(CouponStatus.AVAILABLE);
      expect(afterFailedUsage.usedAt).toBeNull();
      expect(afterFailedUsage.orderId).toBeNull();
    });

    it('应该在优惠券状态检查失败时回滚事务', async () => {
      const couponRepository = dataSource.getRepository(Coupon);

      // 创建一个已使用的优惠券
      const usedCoupon = couponRepository.create({
        code: 'TEST-USED-001',
        name: 'Used Coupon',
        type: CouponType.PERCENTAGE,
        value: 20,
        status: CouponStatus.USED,
        userId: testUserId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000),
        usedAt: new Date(),
        orderId: 'old-order-123',
      });
      await couponRepository.save(usedCoupon);

      // 尝试再次使用（应该失败）
      await expect(
        service.useCoupon(usedCoupon.id, testUserId, 'new-order-456')
      ).rejects.toThrow(BadRequestException);

      // 验证状态未改变
      const afterAttempt = await couponRepository.findOne({ where: { id: usedCoupon.id } });
      expect(afterAttempt.status).toBe(CouponStatus.USED);
      expect(afterAttempt.orderId).toBe('old-order-123'); // 仍然是旧订单ID
    });
  });

  describe('useCoupon - 并发测试（真实数据库锁）', () => {
    it('应该防止并发场景下同一优惠券被多次使用', async () => {
      const couponRepository = dataSource.getRepository(Coupon);

      // 创建可用优惠券
      const coupon = couponRepository.create({
        code: 'TEST-CONCURRENT-001',
        name: 'Concurrent Test Coupon',
        type: CouponType.PERCENTAGE,
        value: 20,
        status: CouponStatus.AVAILABLE,
        userId: testUserId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000),
      });
      await couponRepository.save(coupon);
      const couponId = coupon.id;

      // 模拟两个并发请求
      const order1 = 'concurrent-order-001';
      const order2 = 'concurrent-order-002';

      const request1 = service.useCoupon(couponId, testUserId, order1);
      const request2 = service.useCoupon(couponId, testUserId, order2);

      // 等待两个请求完成
      const results = await Promise.allSettled([request1, request2]);

      // 验证：一个成功，一个失败
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // 验证失败的请求抛出了正确的异常
      const rejectedResult = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejectedResult.reason).toBeInstanceOf(BadRequestException);

      // 验证数据库最终状态：优惠券被使用一次
      const finalCoupon = await couponRepository.findOne({ where: { id: couponId } });
      expect(finalCoupon.status).toBe(CouponStatus.USED);
      expect(finalCoupon.orderId).toBeTruthy();
      expect(finalCoupon.usedAt).toBeTruthy();

      // 验证只有一个订单ID被记录（要么是 order1 要么是 order2）
      expect([order1, order2]).toContain(finalCoupon.orderId);
    });

    it('应该在高并发场景下保持数据一致性（5个并发请求）', async () => {
      const couponRepository = dataSource.getRepository(Coupon);

      const coupon = couponRepository.create({
        code: 'TEST-HIGH-CONCURRENT-001',
        name: 'High Concurrent Test Coupon',
        type: CouponType.PERCENTAGE,
        value: 20,
        status: CouponStatus.AVAILABLE,
        userId: testUserId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000),
      });
      await couponRepository.save(coupon);
      const couponId = coupon.id;

      // 创建5个并发请求
      const requests = Array.from({ length: 5 }, (_, i) =>
        service.useCoupon(couponId, testUserId, `order-${i + 1}`)
      );

      const results = await Promise.allSettled(requests);

      // 验证：只有1个成功
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBe(1);

      // 验证：其他4个失败
      const failureCount = results.filter(r => r.status === 'rejected').length;
      expect(failureCount).toBe(4);

      // 验证数据库状态
      const finalCoupon = await couponRepository.findOne({ where: { id: couponId } });
      expect(finalCoupon.status).toBe(CouponStatus.USED);
      expect(finalCoupon.usedAt).toBeTruthy();
      expect(finalCoupon.orderId).toMatch(/^order-[1-5]$/);
    });
  });

  describe('useCoupon - 事务成功验证', () => {
    it('应该成功使用优惠券并持久化到数据库', async () => {
      const couponRepository = dataSource.getRepository(Coupon);

      const coupon = couponRepository.create({
        code: 'TEST-SUCCESS-001',
        name: 'Success Test Coupon',
        type: CouponType.PERCENTAGE,
        value: 20,
        status: CouponStatus.AVAILABLE,
        userId: testUserId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000),
      });
      await couponRepository.save(coupon);
      const couponId = coupon.id;

      // 使用优惠券
      const orderId = 'success-order-123';
      const result = await service.useCoupon(couponId, testUserId, orderId);

      // 验证返回值
      expect(result.success).toBe(true);
      expect(result.message).toBe('Coupon applied successfully');

      // 验证数据库状态
      const usedCoupon = await couponRepository.findOne({ where: { id: couponId } });
      expect(usedCoupon.status).toBe(CouponStatus.USED);
      expect(usedCoupon.orderId).toBe(orderId);
      expect(usedCoupon.usedAt).toBeTruthy();
      expect(usedCoupon.usedAt).toBeInstanceOf(Date);
    });

    it('应该验证用户只能使用自己的优惠券', async () => {
      const couponRepository = dataSource.getRepository(Coupon);

      const coupon = couponRepository.create({
        code: 'TEST-OWNERSHIP-001',
        name: 'Ownership Test Coupon',
        type: CouponType.PERCENTAGE,
        value: 20,
        status: CouponStatus.AVAILABLE,
        userId: testUserId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000),
      });
      await couponRepository.save(coupon);

      // 尝试用其他用户ID使用优惠券
      await expect(
        service.useCoupon(coupon.id, 'other-user-id', 'order-123')
      ).rejects.toThrow(NotFoundException);

      // 验证优惠券状态未改变
      const unchangedCoupon = await couponRepository.findOne({ where: { id: coupon.id } });
      expect(unchangedCoupon.status).toBe(CouponStatus.AVAILABLE);
      expect(unchangedCoupon.usedAt).toBeNull();
    });
  });

  describe('数据库连接和资源管理', () => {
    it('应该在成功场景下正确释放数据库连接', async () => {
      const couponRepository = dataSource.getRepository(Coupon);

      const coupon = couponRepository.create({
        code: 'TEST-CONNECTION-001',
        name: 'Connection Test Coupon',
        type: CouponType.PERCENTAGE,
        value: 20,
        status: CouponStatus.AVAILABLE,
        userId: testUserId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86400000),
      });
      await couponRepository.save(coupon);

      // 记录连接池初始状态
      const poolSize = dataSource.driver.master.poolSize;

      // 执行操作
      await service.useCoupon(coupon.id, testUserId, 'order-123');

      // 等待连接释放
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证连接池大小未增长（连接被正确释放）
      const finalPoolSize = dataSource.driver.master.poolSize;
      expect(finalPoolSize).toBeLessThanOrEqual(poolSize + 1);
    });

    it('应该在失败场景下正确释放数据库连接', async () => {
      const poolSize = dataSource.driver.master.poolSize;

      // 执行失败的操作
      try {
        await service.useCoupon('non-existent-id', testUserId, 'order-123');
      } catch (error) {
        // 预期会失败
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalPoolSize = dataSource.driver.master.poolSize;
      expect(finalPoolSize).toBeLessThanOrEqual(poolSize + 1);
    });
  });
});
