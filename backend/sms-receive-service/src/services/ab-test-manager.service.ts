import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ABTestConfig } from '../entities/ab-test-config.entity';

/**
 * A/B 测试管理器服务
 *
 * 功能：
 * 1. 创建和管理 A/B 测试
 * 2. 根据权重分配流量到不同平台
 * 3. 收集和分析测试结果
 * 4. 自动判定胜出平台
 */
@Injectable()
export class ABTestManagerService {
  private readonly logger = new Logger(ABTestManagerService.name);

  // 缓存当前运行的测试
  private activeTest: ABTestConfig | null = null;
  private lastTestLoadTime: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 1分钟缓存

  constructor(
    @InjectRepository(ABTestConfig)
    private readonly abTestRepo: Repository<ABTestConfig>,
  ) {
    this.loadActiveTest().catch(err => {
      this.logger.error(`Failed to load active test: ${err.message}`);
    });
  }

  /**
   * 加载当前活跃的测试
   */
  private async loadActiveTest(): Promise<void> {
    const now = Date.now();

    // 使用缓存
    if (this.activeTest && (now - this.lastTestLoadTime < this.CACHE_TTL_MS)) {
      return;
    }

    const runningTests = await this.abTestRepo.find({
      where: { status: 'running' },
      order: { createdAt: 'DESC' },
      take: 1,
    });

    this.activeTest = runningTests.length > 0 ? runningTests[0] : null;
    this.lastTestLoadTime = now;

    if (this.activeTest) {
      this.logger.log(`Loaded active A/B test: ${this.activeTest.testName}`);
    }
  }

  /**
   * 检查是否有运行中的测试
   */
  async hasActiveTest(): Promise<boolean> {
    await this.loadActiveTest();
    return this.activeTest !== null;
  }

  /**
   * 根据测试配置选择平台
   * @returns 选中的平台名称，如果没有测试返回 null
   */
  async selectProviderForTest(): Promise<string | null> {
    await this.loadActiveTest();

    if (!this.activeTest) {
      return null;
    }

    // 过滤出启用的平台
    const enabledProviders = this.activeTest.providers.filter(p => p.enabled);

    if (enabledProviders.length === 0) {
      this.logger.warn(`No enabled providers in test ${this.activeTest.testName}`);
      return null;
    }

    // 根据权重随机选择
    const totalWeight = enabledProviders.reduce((sum, p) => sum + p.weight, 0);
    const random = Math.random() * totalWeight;

    let cumulativeWeight = 0;
    for (const provider of enabledProviders) {
      cumulativeWeight += provider.weight;
      if (random <= cumulativeWeight) {
        return provider.provider;
      }
    }

    // 兜底：返回第一个
    return enabledProviders[0].provider;
  }

  /**
   * 记录测试结果
   */
  async recordTestResult(
    provider: string,
    success: boolean,
    responseTime: number,
    cost: number,
  ): Promise<void> {
    await this.loadActiveTest();

    if (!this.activeTest) {
      return;
    }

    // 初始化结果对象
    if (!this.activeTest.testResults) {
      this.activeTest.testResults = {};
    }

    if (!this.activeTest.testResults[provider]) {
      this.activeTest.testResults[provider] = {
        requests: 0,
        successes: 0,
        failures: 0,
        successRate: 0,
        averageCost: 0,
        averageResponseTime: 0,
      };
    }

    const stats = this.activeTest.testResults[provider];
    stats.requests++;

    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    // 更新平均值
    stats.successRate = (stats.successes / stats.requests) * 100;
    stats.averageCost = (stats.averageCost * (stats.requests - 1) + cost) / stats.requests;
    stats.averageResponseTime =
      (stats.averageResponseTime * (stats.requests - 1) + responseTime) / stats.requests;

    // 更新样本量
    this.activeTest.currentSampleSize++;

    // 保存更新
    await this.abTestRepo.save(this.activeTest);

    // 检查是否达到目标样本量
    if (this.activeTest.currentSampleSize >= this.activeTest.sampleSizeTarget) {
      await this.completeTest(this.activeTest.id);
    }
  }

  /**
   * 创建新的 A/B 测试
   */
  async createTest(params: {
    testName: string;
    description?: string;
    providers: Array<{ provider: string; weight: number }>;
    testGoal: 'cost' | 'success_rate' | 'speed' | 'balance';
    sampleSizeTarget?: number;
    createdBy?: string;
  }): Promise<ABTestConfig> {
    // 检查是否已有运行中的测试
    const runningTests = await this.abTestRepo.count({
      where: { status: 'running' },
    });

    if (runningTests > 0) {
      throw new Error('Cannot create new test while another test is running');
    }

    // 验证权重总和为100
    const totalWeight = params.providers.reduce((sum, p) => sum + p.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Provider weights must sum to 100, got ${totalWeight}`);
    }

    const testConfig = this.abTestRepo.create({
      testName: params.testName,
      description: params.description,
      providers: params.providers.map(p => ({ ...p, enabled: true })),
      testGoal: params.testGoal,
      sampleSizeTarget: params.sampleSizeTarget || 100,
      currentSampleSize: 0,
      status: 'draft',
      createdBy: params.createdBy,
    });

    const saved = await this.abTestRepo.save(testConfig);
    this.logger.log(`Created A/B test: ${saved.testName}`);

    return saved;
  }

  /**
   * 启动测试
   */
  async startTest(testId: string): Promise<void> {
    const test = await this.abTestRepo.findOne({ where: { id: testId } });

    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    if (test.status !== 'draft') {
      throw new Error(`Test must be in draft status to start, current: ${test.status}`);
    }

    test.status = 'running';
    test.startTime = new Date();
    await this.abTestRepo.save(test);

    // 清除缓存
    this.activeTest = test;
    this.lastTestLoadTime = Date.now();

    this.logger.log(`Started A/B test: ${test.testName}`);
  }

  /**
   * 暂停测试
   */
  async pauseTest(testId: string): Promise<void> {
    const test = await this.abTestRepo.findOne({ where: { id: testId } });

    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'paused';
    await this.abTestRepo.save(test);

    // 清除缓存
    this.activeTest = null;

    this.logger.log(`Paused A/B test: ${test.testName}`);
  }

  /**
   * 完成测试并分析结果
   */
  async completeTest(testId: string): Promise<void> {
    const test = await this.abTestRepo.findOne({ where: { id: testId } });

    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'completed';
    test.endTime = new Date();

    // 根据测试目标判定胜者
    test.winner = this.determineWinner(test);

    // 计算置信度（简化版）
    test.confidenceLevel = this.calculateConfidence(test);

    await this.abTestRepo.save(test);

    // 清除缓存
    this.activeTest = null;

    this.logger.log(
      `Completed A/B test: ${test.testName}, Winner: ${test.winner} (${test.confidenceLevel}% confidence)`,
    );
  }

  /**
   * 判定胜出平台
   */
  private determineWinner(test: ABTestConfig): string {
    if (!test.testResults || Object.keys(test.testResults).length === 0) {
      return 'none';
    }

    const providers = Object.keys(test.testResults);

    switch (test.testGoal) {
      case 'cost':
        // 成本最低的获胜
        return providers.reduce((best, curr) =>
          test.testResults![curr].averageCost < test.testResults![best].averageCost ? curr : best
        );

      case 'success_rate':
        // 成功率最高的获胜
        return providers.reduce((best, curr) =>
          test.testResults![curr].successRate > test.testResults![best].successRate ? curr : best
        );

      case 'speed':
        // 响应时间最快的获胜
        return providers.reduce((best, curr) =>
          test.testResults![curr].averageResponseTime < test.testResults![best].averageResponseTime
            ? curr
            : best
        );

      case 'balance':
        // 综合评分：成功率40% + 速度30% + 成本30%
        const scores: Record<string, number> = {};

        for (const provider of providers) {
          const stats = test.testResults![provider];

          // 归一化各指标（0-100）
          const successScore = stats.successRate;
          const speedScore = Math.max(0, 100 - stats.averageResponseTime / 600 * 100); // 假设10分钟为最慢
          const costScore = Math.max(0, 100 - stats.averageCost / 0.2 * 100); // 假设$0.2为最贵

          scores[provider] = successScore * 0.4 + speedScore * 0.3 + costScore * 0.3;
        }

        return providers.reduce((best, curr) => (scores[curr] > scores[best] ? curr : best));

      default:
        return providers[0];
    }
  }

  /**
   * 计算置信度（简化版）
   */
  private calculateConfidence(test: ABTestConfig): number {
    if (!test.testResults || Object.keys(test.testResults).length < 2) {
      return 0;
    }

    // 基于样本量的简单置信度
    const sampleSizeRatio = test.currentSampleSize / test.sampleSizeTarget;

    if (sampleSizeRatio >= 1) {
      return 95;
    } else if (sampleSizeRatio >= 0.5) {
      return 80;
    } else if (sampleSizeRatio >= 0.25) {
      return 60;
    } else {
      return 40;
    }
  }

  /**
   * 获取所有测试
   */
  async getAllTests(): Promise<ABTestConfig[]> {
    return this.abTestRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取测试详情
   */
  async getTestById(testId: string): Promise<ABTestConfig | null> {
    return this.abTestRepo.findOne({ where: { id: testId } });
  }
}
