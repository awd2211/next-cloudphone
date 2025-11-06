import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { QuotasService } from '../src/quotas/quotas.service';
import { Quota, QuotaStatus } from '../src/entities/quota.entity';

/**
 * 配额操作性能测试
 *
 * 测试目的：
 * 1. 评估悲观锁的性能开销
 * 2. 对比不同并发级别下的吞吐量
 * 3. 识别性能瓶颈
 * 4. 为生产环境提供性能基准
 *
 * 运行前置条件：
 * - PostgreSQL 数据库运行在 localhost:5432
 * - 存在测试数据库 cloudphone_user_test
 */
describe('Quota Performance Tests', () => {
  let module: TestingModule;
  let service: QuotasService;
  let dataSource: DataSource;
  let repository: any;
  let testUserId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'cloudphone_user_test',
          entities: [Quota],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([Quota]),
      ],
      providers: [QuotasService],
    }).compile();

    service = module.get<QuotasService>(QuotasService);
    dataSource = module.get<DataSource>(DataSource);
    repository = dataSource.getRepository(Quota);

    // Generate unique test user ID
    testUserId = 'perf-test-user-' + Date.now();
  });

  afterAll(async () => {
    // Clean up test data
    await repository.delete({ userId: testUserId });
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    // Clean up and create test quota
    await repository.delete({ userId: testUserId });

    const quota = repository.create({
      userId: testUserId,
      limits: {
        maxDevices: 1000, // Large limit for performance testing
        maxCpuCores: 2000,
        maxMemoryGB: 4000,
      },
      usage: {
        currentDevices: 0,
        usedCpuCores: 0,
        usedMemoryGB: 0,
      },
      status: QuotaStatus.ACTIVE,
    });
    await repository.save(quota);
  });

  describe('悲观锁性能测试', () => {
    it('应该测量单个请求的延迟', async () => {
      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();

        await service.deductQuota({
          userId: testUserId,
          deviceCount: 1,
        });

        const latency = Date.now() - start;
        latencies.push(latency);
      }

      // Calculate statistics
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

      console.log('\n📊 单个请求性能统计:');
      console.log(`  迭代次数: ${iterations}`);
      console.log(`  平均延迟: ${avgLatency.toFixed(2)}ms`);
      console.log(`  最小延迟: ${minLatency}ms`);
      console.log(`  最大延迟: ${maxLatency}ms`);
      console.log(`  P95延迟: ${p95Latency}ms`);

      // Performance expectations
      expect(avgLatency).toBeLessThan(50); // Average should be < 50ms
      expect(p95Latency).toBeLessThan(100); // P95 should be < 100ms
    });

    it('应该测量低并发下的吞吐量 (10个并发)', async () => {
      const concurrency = 10;
      const start = Date.now();

      const requests = Array.from({ length: concurrency }, () =>
        service.deductQuota({
          userId: testUserId,
          deviceCount: 1,
        })
      );

      await Promise.all(requests);
      const duration = Date.now() - start;
      const throughput = (concurrency / duration) * 1000;

      console.log('\n📊 低并发性能统计 (10个并发):');
      console.log(`  总耗时: ${duration}ms`);
      console.log(`  吞吐量: ${throughput.toFixed(2)} req/s`);
      console.log(`  平均每个请求: ${(duration / concurrency).toFixed(2)}ms`);

      // Verify final quota
      const quota = await repository.findOne({ where: { userId: testUserId } });
      expect(quota.usage.currentDevices).toBe(concurrency);
    });

    it('应该测量中并发下的吞吐量 (50个并发)', async () => {
      const concurrency = 50;
      const start = Date.now();

      const requests = Array.from({ length: concurrency }, () =>
        service.deductQuota({
          userId: testUserId,
          deviceCount: 1,
        })
      );

      await Promise.all(requests);
      const duration = Date.now() - start;
      const throughput = (concurrency / duration) * 1000;

      console.log('\n📊 中并发性能统计 (50个并发):');
      console.log(`  总耗时: ${duration}ms`);
      console.log(`  吞吐量: ${throughput.toFixed(2)} req/s`);
      console.log(`  平均每个请求: ${(duration / concurrency).toFixed(2)}ms`);

      // Verify final quota
      const quota = await repository.findOne({ where: { userId: testUserId } });
      expect(quota.usage.currentDevices).toBe(concurrency);
    });

    it('应该测量高并发下的吞吐量 (100个并发)', async () => {
      const concurrency = 100;
      const start = Date.now();

      const requests = Array.from({ length: concurrency }, () =>
        service.deductQuota({
          userId: testUserId,
          deviceCount: 1,
        })
      );

      await Promise.all(requests);
      const duration = Date.now() - start;
      const throughput = (concurrency / duration) * 1000;

      console.log('\n📊 高并发性能统计 (100个并发):');
      console.log(`  总耗时: ${duration}ms`);
      console.log(`  吞吐量: ${throughput.toFixed(2)} req/s`);
      console.log(`  平均每个请求: ${(duration / concurrency).toFixed(2)}ms`);

      // Verify final quota
      const quota = await repository.findOne({ where: { userId: testUserId } });
      expect(quota.usage.currentDevices).toBe(concurrency);
    });

    it('应该测量混合操作的性能 (扣减+恢复)', async () => {
      const operations = 100;
      const start = Date.now();

      // 先扣减50个
      await service.deductQuota({
        userId: testUserId,
        deviceCount: 50,
      });

      // 50个扣减 + 50个恢复，交替执行
      const requests: Promise<any>[] = [];
      for (let i = 0; i < operations; i++) {
        if (i % 2 === 0) {
          requests.push(
            service.deductQuota({
              userId: testUserId,
              deviceCount: 1,
            })
          );
        } else {
          requests.push(
            service.restoreQuota({
              userId: testUserId,
              deviceCount: 1,
            })
          );
        }
      }

      await Promise.all(requests);
      const duration = Date.now() - start;
      const throughput = (operations / duration) * 1000;

      console.log('\n📊 混合操作性能统计:');
      console.log(`  操作数量: ${operations} (50扣减 + 50恢复)`);
      console.log(`  总耗时: ${duration}ms`);
      console.log(`  吞吐量: ${throughput.toFixed(2)} ops/s`);

      // Verify final quota (50 initial + 50 deduct - 50 restore = 50)
      const quota = await repository.findOne({ where: { userId: testUserId } });
      expect(quota.usage.currentDevices).toBe(100); // Initial 50 + net 50
    });
  });

  describe('扩展性测试', () => {
    it('应该测试不同并发级别的性能趋势', async () => {
      const concurrencyLevels = [5, 10, 20, 50, 100];
      const results: any[] = [];

      console.log('\n📈 并发扩展性测试:');
      console.log('并发数 | 总耗时(ms) | 吞吐量(req/s) | 平均延迟(ms)');
      console.log('-------|-----------|--------------|-------------');

      for (const concurrency of concurrencyLevels) {
        // Reset quota
        await repository.update(
          { userId: testUserId },
          {
            usage: {
              currentDevices: 0,
              usedCpuCores: 0,
              usedMemoryGB: 0,
            },
          }
        );

        const start = Date.now();

        const requests = Array.from({ length: concurrency }, () =>
          service.deductQuota({
            userId: testUserId,
            deviceCount: 1,
          })
        );

        await Promise.all(requests);
        const duration = Date.now() - start;
        const throughput = (concurrency / duration) * 1000;
        const avgLatency = duration / concurrency;

        results.push({
          concurrency,
          duration,
          throughput,
          avgLatency,
        });

        console.log(
          `${concurrency.toString().padEnd(7)} | ` +
          `${duration.toString().padEnd(9)} | ` +
          `${throughput.toFixed(2).padEnd(12)} | ` +
          `${avgLatency.toFixed(2)}`
        );
      }

      // Analyze scalability
      const throughputDegradation =
        (results[0].throughput - results[results.length - 1].throughput) /
        results[0].throughput;

      console.log(`\n吞吐量下降: ${(throughputDegradation * 100).toFixed(2)}%`);

      // Expect reasonable degradation (< 50%)
      expect(throughputDegradation).toBeLessThan(0.5);
    });
  });

  describe('数据库连接池压力测试', () => {
    it('应该在持续负载下保持稳定性能', async () => {
      const rounds = 5;
      const requestsPerRound = 20;
      const latencies: number[] = [];

      console.log('\n⏱️  持续负载测试:');
      console.log('轮次 | 平均延迟(ms) | 吞吐量(req/s)');
      console.log('-----|-------------|-------------');

      for (let round = 0; round < rounds; round++) {
        const start = Date.now();

        const requests = Array.from({ length: requestsPerRound }, () =>
          service.deductQuota({
            userId: testUserId,
            deviceCount: 1,
          })
        );

        await Promise.all(requests);
        const duration = Date.now() - start;
        const avgLatency = duration / requestsPerRound;
        const throughput = (requestsPerRound / duration) * 1000;

        latencies.push(avgLatency);

        console.log(
          `${(round + 1).toString().padEnd(5)} | ` +
          `${avgLatency.toFixed(2).padEnd(11)} | ` +
          `${throughput.toFixed(2)}`
        );

        // Short delay between rounds
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Calculate variance
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const variance =
        latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) /
        latencies.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / avgLatency;

      console.log(`\n平均延迟: ${avgLatency.toFixed(2)}ms`);
      console.log(`标准差: ${stdDev.toFixed(2)}ms`);
      console.log(`变异系数: ${coefficientOfVariation.toFixed(4)}`);

      // Expect stable performance (low variation)
      expect(coefficientOfVariation).toBeLessThan(0.3); // CV < 30%
    });
  });
});
