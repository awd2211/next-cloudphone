# 运营优化实施方案

> 基于云手机平台现有架构的运营优化详细实施计划
> 生成日期: 2025-11-05

## 目录

1. [健康度评分与预警系统](#1-健康度评分与预警系统)
2. [智能运维自动化增强](#2-智能运维自动化增强)
3. [成本与容量优化系统](#3-成本与容量优化系统)
4. [工单与支持系统优化](#4-工单与支持系统优化)
5. [实施路线图](#5-实施路线图)

---

## 1. 健康度评分与预警系统

### 1.1 系统目标

**核心目标**：通过多维度指标监控用户使用健康度，提前识别流失风险，主动干预提升留存率。

**预期效果**：
- 流失预警准确率 > 85%
- 提前预警时间 7-14 天
- 用户留存率提升 15-25%

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                   Health Score System                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Data        │  │ Score        │  │ Alert &         │   │
│  │ Collection  │─▶│ Calculation  │─▶│ Intervention    │   │
│  │             │  │              │  │                 │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│         │                  │                   │            │
│         ▼                  ▼                   ▼            │
│  [Metrics API]    [Health Service]    [Notification]       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 健康度评分模型

#### 评分维度（总分 100 分）

| 维度 | 权重 | 指标 | 评分规则 |
|------|------|------|---------|
| **活跃度** | 35% | • 登录频率<br>• 设备使用时长<br>• API 调用频率 | • 每日登录: +10分<br>• 设备运行 >4h/天: +15分<br>• API 活跃: +10分 |
| **资源利用率** | 25% | • 设备利用率<br>• 配额使用率<br>• 功能覆盖度 | • 利用率 70-90%: +15分<br>• 多功能使用: +10分 |
| **稳定性** | 20% | • 错误率<br>• 工单提交率<br>• 支付成功率 | • 错误率 <5%: +10分<br>• 无工单: +10分 |
| **增长性** | 15% | • 设备增长趋势<br>• 消费增长趋势<br>• 套餐升级 | • 正增长: +10分<br>• 已升级: +5分 |
| **互动性** | 5% | • 文档阅读<br>• 社区参与<br>• 反馈提交 | • 有互动: +5分 |

#### 健康度等级划分

```typescript
enum HealthLevel {
  EXCELLENT = 'excellent',    // 90-100 分：优秀用户
  GOOD = 'good',             // 75-89 分：健康用户
  FAIR = 'fair',             // 60-74 分：观察用户
  POOR = 'poor',             // 40-59 分：预警用户
  CRITICAL = 'critical'      // 0-39 分：高危用户
}
```

### 1.4 技术实现方案

#### 1.4.1 新增服务模块

在 **user-service** 中新增健康度模块：

```
backend/user-service/src/health-score/
├── health-score.module.ts
├── health-score.service.ts
├── health-score.controller.ts
├── health-score.scheduler.ts
├── entities/
│   ├── user-health-score.entity.ts
│   └── health-score-history.entity.ts
├── dto/
│   ├── health-score.dto.ts
│   └── health-alert.dto.ts
└── calculators/
    ├── activity-calculator.ts
    ├── utilization-calculator.ts
    ├── stability-calculator.ts
    ├── growth-calculator.ts
    └── engagement-calculator.ts
```

#### 1.4.2 数据库表设计

```sql
-- 用户健康度评分表
CREATE TABLE user_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    level VARCHAR(20) NOT NULL,

    -- 分维度得分
    activity_score INTEGER,
    utilization_score INTEGER,
    stability_score INTEGER,
    growth_score INTEGER,
    engagement_score INTEGER,

    -- 详细指标
    metrics JSONB,

    -- 风险标记
    churn_risk BOOLEAN DEFAULT FALSE,
    risk_factors TEXT[],

    -- 干预记录
    intervention_status VARCHAR(50),
    last_intervention_at TIMESTAMP,

    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 健康度历史记录表
CREATE TABLE health_score_histories (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL,
    level VARCHAR(20) NOT NULL,
    metrics JSONB,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_health_scores_user_id ON user_health_scores(user_id);
CREATE INDEX idx_health_scores_level ON user_health_scores(level);
CREATE INDEX idx_health_scores_churn_risk ON user_health_scores(churn_risk) WHERE churn_risk = TRUE;
CREATE INDEX idx_health_histories_user_time ON health_score_histories(user_id, recorded_at DESC);
```

#### 1.4.3 核心服务代码框架

```typescript
// backend/user-service/src/health-score/health-score.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventBusService } from '@cloudphone/shared';
import { UserHealthScore } from './entities/user-health-score.entity';
import {
  ActivityCalculator,
  UtilizationCalculator,
  StabilityCalculator,
  GrowthCalculator,
  EngagementCalculator
} from './calculators';

@Injectable()
export class HealthScoreService {
  private readonly logger = new Logger(HealthScoreService.name);

  constructor(
    @InjectRepository(UserHealthScore)
    private healthScoreRepo: Repository<UserHealthScore>,
    private activityCalc: ActivityCalculator,
    private utilizationCalc: UtilizationCalculator,
    private stabilityCalc: StabilityCalculator,
    private growthCalc: GrowthCalculator,
    private engagementCalc: EngagementCalculator,
    private eventBus: EventBusService,
  ) {}

  /**
   * 计算用户健康度评分
   */
  async calculateUserHealthScore(userId: string): Promise<UserHealthScore> {
    this.logger.log(`计算用户 ${userId} 的健康度评分`);

    // 获取各维度得分
    const activityScore = await this.activityCalc.calculate(userId);
    const utilizationScore = await this.utilizationCalc.calculate(userId);
    const stabilityScore = await this.stabilityCalc.calculate(userId);
    const growthScore = await this.growthCalc.calculate(userId);
    const engagementScore = await this.engagementCalc.calculate(userId);

    // 加权计算总分
    const totalScore = Math.round(
      activityScore * 0.35 +
      utilizationScore * 0.25 +
      stabilityScore * 0.20 +
      growthScore * 0.15 +
      engagementScore * 0.05
    );

    // 确定健康度等级
    const level = this.determineHealthLevel(totalScore);

    // 识别风险因素
    const riskFactors = this.identifyRiskFactors({
      activityScore,
      utilizationScore,
      stabilityScore,
      growthScore,
      engagementScore,
    });

    const churnRisk = level === HealthLevel.POOR || level === HealthLevel.CRITICAL;

    // 保存评分
    const healthScore = await this.healthScoreRepo.save({
      userId,
      score: totalScore,
      level,
      activityScore,
      utilizationScore,
      stabilityScore,
      growthScore,
      engagementScore,
      churnRisk,
      riskFactors,
      metrics: {
        activityScore,
        utilizationScore,
        stabilityScore,
        growthScore,
        engagementScore,
      },
      calculatedAt: new Date(),
    });

    // 如果有流失风险，触发告警
    if (churnRisk) {
      await this.triggerChurnAlert(healthScore);
    }

    return healthScore;
  }

  /**
   * 确定健康度等级
   */
  private determineHealthLevel(score: number): HealthLevel {
    if (score >= 90) return HealthLevel.EXCELLENT;
    if (score >= 75) return HealthLevel.GOOD;
    if (score >= 60) return HealthLevel.FAIR;
    if (score >= 40) return HealthLevel.POOR;
    return HealthLevel.CRITICAL;
  }

  /**
   * 识别风险因素
   */
  private identifyRiskFactors(scores: {
    activityScore: number;
    utilizationScore: number;
    stabilityScore: number;
    growthScore: number;
    engagementScore: number;
  }): string[] {
    const risks: string[] = [];

    if (scores.activityScore < 20) {
      risks.push('活跃度低：近期登录和使用频率下降');
    }
    if (scores.utilizationScore < 15) {
      risks.push('资源利用率低：设备和配额未充分使用');
    }
    if (scores.stabilityScore < 10) {
      risks.push('稳定性差：错误率高或频繁提交工单');
    }
    if (scores.growthScore < 5) {
      risks.push('增长停滞：未见设备或消费增长');
    }
    if (scores.engagementScore < 3) {
      risks.push('互动缺失：未参与社区或反馈');
    }

    return risks;
  }

  /**
   * 触发流失风险告警
   */
  private async triggerChurnAlert(healthScore: UserHealthScore): Promise<void> {
    this.logger.warn(
      `用户 ${healthScore.userId} 存在流失风险，评分: ${healthScore.score}，等级: ${healthScore.level}`
    );

    // 发布流失风险事件
    await this.eventBus.publishUserEvent('churn_risk_detected', {
      userId: healthScore.userId,
      score: healthScore.score,
      level: healthScore.level,
      riskFactors: healthScore.riskFactors,
      timestamp: new Date().toISOString(),
    });

    // 触发自动干预流程
    await this.triggerIntervention(healthScore);
  }

  /**
   * 触发自动干预
   */
  private async triggerIntervention(healthScore: UserHealthScore): Promise<void> {
    // 根据风险等级和因素，选择干预策略
    const interventionStrategies = this.selectInterventionStrategies(healthScore);

    for (const strategy of interventionStrategies) {
      await this.executeIntervention(healthScore.userId, strategy);
    }

    // 更新干预状态
    await this.healthScoreRepo.update(healthScore.id, {
      interventionStatus: 'in_progress',
      lastInterventionAt: new Date(),
    });
  }

  /**
   * 选择干预策略
   */
  private selectInterventionStrategies(healthScore: UserHealthScore): InterventionStrategy[] {
    const strategies: InterventionStrategy[] = [];

    // 根据风险因素选择对应策略
    if (healthScore.riskFactors.some(r => r.includes('活跃度低'))) {
      strategies.push({
        type: 'engagement_boost',
        action: 'send_feature_highlight_email',
        params: { features: ['新功能', '优惠活动'] },
      });
    }

    if (healthScore.riskFactors.some(r => r.includes('资源利用率低'))) {
      strategies.push({
        type: 'usage_optimization',
        action: 'send_optimization_tips',
        params: { tips: ['资源配置建议', '最佳实践'] },
      });
    }

    if (healthScore.riskFactors.some(r => r.includes('稳定性差'))) {
      strategies.push({
        type: 'support_outreach',
        action: 'assign_customer_success_manager',
        params: { priority: 'high' },
      });
    }

    if (healthScore.level === HealthLevel.CRITICAL) {
      strategies.push({
        type: 'retention_offer',
        action: 'send_discount_coupon',
        params: { discount: '20%', validDays: 7 },
      });
    }

    return strategies;
  }

  /**
   * 执行干预措施
   */
  private async executeIntervention(
    userId: string,
    strategy: InterventionStrategy
  ): Promise<void> {
    this.logger.log(
      `执行干预策略 [${strategy.type}] for user ${userId}: ${strategy.action}`
    );

    // 发布干预事件，由notification-service处理
    await this.eventBus.publish('cloudphone.events', 'user.intervention_triggered', {
      userId,
      strategyType: strategy.type,
      action: strategy.action,
      params: strategy.params,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 定时任务：每日凌晨2点计算所有用户健康度
   */
  @Cron('0 2 * * *')
  async calculateAllUsersHealthScore(): Promise<void> {
    this.logger.log('开始批量计算用户健康度评分');

    // 获取所有活跃用户
    const activeUsers = await this.getActiveUsers();

    let processed = 0;
    let errors = 0;

    for (const user of activeUsers) {
      try {
        await this.calculateUserHealthScore(user.id);
        processed++;
      } catch (error) {
        this.logger.error(
          `计算用户 ${user.id} 健康度失败: ${error.message}`,
          error.stack
        );
        errors++;
      }
    }

    this.logger.log(
      `健康度评分计算完成: 成功 ${processed}, 失败 ${errors}, 总计 ${activeUsers.length}`
    );
  }

  /**
   * 获取用户健康度趋势
   */
  async getUserHealthTrend(
    userId: string,
    days: number = 30
  ): Promise<HealthScoreTrend> {
    const histories = await this.healthScoreRepo
      .createQueryBuilder('h')
      .where('h.userId = :userId', { userId })
      .andWhere('h.calculatedAt >= NOW() - INTERVAL :days DAY', { days })
      .orderBy('h.calculatedAt', 'ASC')
      .getMany();

    return {
      userId,
      period: { days, from: histories[0]?.calculatedAt, to: new Date() },
      dataPoints: histories.map(h => ({
        date: h.calculatedAt,
        score: h.score,
        level: h.level,
      })),
      trend: this.calculateTrend(histories),
      insights: this.generateInsights(histories),
    };
  }

  /**
   * 计算趋势方向
   */
  private calculateTrend(histories: UserHealthScore[]): 'improving' | 'stable' | 'declining' {
    if (histories.length < 2) return 'stable';

    const recent = histories.slice(-7);
    const earlier = histories.slice(-14, -7);

    const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, h) => sum + h.score, 0) / earlier.length;

    if (recentAvg > earlierAvg + 5) return 'improving';
    if (recentAvg < earlierAvg - 5) return 'declining';
    return 'stable';
  }

  /**
   * 生成洞察报告
   */
  private generateInsights(histories: UserHealthScore[]): string[] {
    const insights: string[] = [];

    if (histories.length === 0) return insights;

    const latest = histories[histories.length - 1];
    const trend = this.calculateTrend(histories);

    if (trend === 'declining') {
      insights.push('⚠️ 健康度呈下降趋势，需要关注');
    } else if (trend === 'improving') {
      insights.push('✅ 健康度持续改善，保持良好');
    }

    if (latest.activityScore < 20) {
      insights.push('💡 活跃度较低，建议了解最新功能和优惠活动');
    }

    if (latest.utilizationScore < 15) {
      insights.push('💡 资源利用率偏低，可能存在配置优化空间');
    }

    return insights;
  }

  /**
   * 获取高危用户列表
   */
  async getHighRiskUsers(): Promise<UserHealthScore[]> {
    return this.healthScoreRepo.find({
      where: { churnRisk: true },
      order: { score: 'ASC', calculatedAt: 'DESC' },
      take: 100,
    });
  }
}

// 类型定义
enum HealthLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  CRITICAL = 'critical',
}

interface InterventionStrategy {
  type: string;
  action: string;
  params: Record<string, any>;
}

interface HealthScoreTrend {
  userId: string;
  period: { days: number; from: Date; to: Date };
  dataPoints: Array<{ date: Date; score: number; level: string }>;
  trend: 'improving' | 'stable' | 'declining';
  insights: string[];
}
```

#### 1.4.4 计算器实现示例

```typescript
// backend/user-service/src/health-score/calculators/activity-calculator.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';

@Injectable()
export class ActivityCalculator {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * 计算活跃度得分 (满分 35 分)
   */
  async calculate(userId: string): Promise<number> {
    let score = 0;

    // 1. 登录频率 (10 分)
    const loginScore = await this.calculateLoginScore(userId);
    score += loginScore;

    // 2. 设备使用时长 (15 分)
    const usageScore = await this.calculateUsageScore(userId);
    score += usageScore;

    // 3. API 调用频率 (10 分)
    const apiScore = await this.calculateApiScore(userId);
    score += apiScore;

    return Math.min(score, 35); // 上限 35 分
  }

  private async calculateLoginScore(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 统计最近30天的登录天数
    const loginDays = await this.auditLogRepo
      .createQueryBuilder('log')
      .select('DATE(log.createdAt)', 'date')
      .where('log.userId = :userId', { userId })
      .andWhere('log.action = :action', { action: 'user.login' })
      .andWhere('log.createdAt >= :since', { since: thirtyDaysAgo })
      .groupBy('DATE(log.createdAt)')
      .getRawMany();

    const loginDayCount = loginDays.length;

    // 评分规则
    if (loginDayCount >= 25) return 10; // 几乎每天登录
    if (loginDayCount >= 20) return 8;  // 2/3 时间在线
    if (loginDayCount >= 15) return 6;  // 一半时间在线
    if (loginDayCount >= 10) return 4;  // 1/3 时间在线
    if (loginDayCount >= 5) return 2;   // 偶尔登录
    return 0; // 极少登录
  }

  private async calculateUsageScore(userId: string): Promise<number> {
    // 调用 device-service API 获取设备使用数据
    // 这里需要通过 HttpClientService 或直接查询设备数据库

    // 示例：假设已获取到平均每日使用时长
    const avgDailyUsageHours = await this.getAvgDailyDeviceUsage(userId);

    if (avgDailyUsageHours >= 8) return 15;  // 全天使用
    if (avgDailyUsageHours >= 6) return 12;  // 大部分时间
    if (avgDailyUsageHours >= 4) return 9;   // 半天使用
    if (avgDailyUsageHours >= 2) return 6;   // 少量使用
    if (avgDailyUsageHours >= 1) return 3;   // 极少使用
    return 0; // 几乎不用
  }

  private async calculateApiScore(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 统计 API 调用次数（从 audit_logs 或专门的 API 日志表）
    const apiCallCount = await this.auditLogRepo.count({
      where: {
        userId,
        action: Like('api.%'),
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    if (apiCallCount >= 1000) return 10; // 高频使用
    if (apiCallCount >= 500) return 8;
    if (apiCallCount >= 200) return 6;
    if (apiCallCount >= 50) return 4;
    if (apiCallCount >= 10) return 2;
    return 0; // 极少调用
  }

  private async getAvgDailyDeviceUsage(userId: string): Promise<number> {
    // 此处需要从 device-service 获取数据
    // 或者直接查询 cloudphone_device 数据库的 device_usage_logs 表

    // 伪代码示例
    // const usageLogs = await deviceUsageRepo.find({ userId, since: 30daysAgo });
    // return calculateAverage(usageLogs);

    return 0; // 占位符
  }
}
```

### 1.5 前端展示

#### 1.5.1 管理后台健康度看板

在 `frontend/admin` 中添加健康度监控页面：

```tsx
// frontend/admin/src/pages/HealthScore/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Tag, Progress, Statistic, Badge } from 'antd';
import { AlertOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/plots';

const HealthScoreDashboard: React.FC = () => {
  const [highRiskUsers, setHighRiskUsers] = useState([]);
  const [statistics, setStatistics] = useState({});

  // 健康度等级标签
  const renderHealthTag = (level: string) => {
    const config = {
      excellent: { color: 'green', text: '优秀' },
      good: { color: 'blue', text: '健康' },
      fair: { color: 'orange', text: '观察' },
      poor: { color: 'red', text: '预警' },
      critical: { color: 'red', text: '高危', icon: <AlertOutlined /> },
    };

    const { color, text, icon } = config[level] || {};
    return <Tag color={color} icon={icon}>{text}</Tag>;
  };

  // 高危用户表格列
  const columns = [
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
    },
    {
      title: '健康度评分',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          status={score < 60 ? 'exception' : 'normal'}
        />
      ),
      sorter: (a, b) => a.score - b.score,
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: renderHealthTag,
      filters: [
        { text: '高危', value: 'critical' },
        { text: '预警', value: 'poor' },
        { text: '观察', value: 'fair' },
      ],
      onFilter: (value, record) => record.level === value,
    },
    {
      title: '风险因素',
      dataIndex: 'riskFactors',
      key: 'riskFactors',
      render: (factors: string[]) => (
        <>
          {factors.map((factor, idx) => (
            <Tag key={idx} color="red">
              {factor.split('：')[0]}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: '最后评估时间',
      dataIndex: 'calculatedAt',
      key: 'calculatedAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '干预状态',
      dataIndex: 'interventionStatus',
      key: 'interventionStatus',
      render: (status: string) => {
        const statusMap = {
          pending: <Badge status="default" text="待处理" />,
          in_progress: <Badge status="processing" text="进行中" />,
          completed: <Badge status="success" text="已完成" />,
        };
        return statusMap[status] || '-';
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => viewDetails(record.userId)}>
            详情
          </Button>
          <Button size="small" type="primary" onClick={() => intervene(record.userId)}>
            立即干预
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="health-score-dashboard">
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="高危用户"
              value={statistics.criticalCount}
              suffix="人"
              valueStyle={{ color: '#cf1322' }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="预警用户"
              value={statistics.poorCount}
              suffix="人"
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="健康用户"
              value={statistics.healthyCount}
              suffix="人"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均健康度"
              value={statistics.avgScore}
              precision={1}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="高风险用户列表" style={{ marginBottom: 24 }}>
        <Table
          columns={columns}
          dataSource={highRiskUsers}
          rowKey="userId"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Card title="健康度趋势">
        <Line
          data={statistics.trendData || []}
          xField="date"
          yField="avgScore"
          seriesField="level"
          smooth={true}
          animation={{
            appear: {
              animation: 'path-in',
              duration: 1000,
            },
          }}
        />
      </Card>
    </div>
  );
};

export default HealthScoreDashboard;
```

#### 1.5.2 用户端健康度展示

在用户控制台展示个人健康度报告：

```tsx
// frontend/user/src/pages/HealthReport.tsx

import React from 'react';
import { Card, Progress, List, Alert, Timeline } from 'antd';
import { CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';

const HealthReport: React.FC = () => {
  const healthData = {
    score: 78,
    level: 'good',
    dimensions: {
      activity: 28,
      utilization: 20,
      stability: 16,
      growth: 10,
      engagement: 4,
    },
    insights: [
      '✅ 活跃度良好，保持当前使用频率',
      '💡 资源利用率可以进一步提升',
      '⚠️ 建议参与社区互动，了解更多使用技巧',
    ],
  };

  return (
    <Card title="我的健康度报告" extra={<Tag color="blue">健康用户</Tag>}>
      <Row gutter={24}>
        <Col span={8}>
          <Card>
            <Statistic
              title="健康度评分"
              value={healthData.score}
              suffix="/ 100"
              valueStyle={{ color: '#3f8600' }}
            />
            <Progress percent={healthData.score} strokeColor="#52c41a" />
          </Card>
        </Col>

        <Col span={16}>
          <Card title="维度评分">
            <List
              dataSource={[
                { name: '活跃度', score: healthData.dimensions.activity, max: 35 },
                { name: '资源利用率', score: healthData.dimensions.utilization, max: 25 },
                { name: '稳定性', score: healthData.dimensions.stability, max: 20 },
                { name: '增长性', score: healthData.dimensions.growth, max: 15 },
                { name: '互动性', score: healthData.dimensions.engagement, max: 5 },
              ]}
              renderItem={(item) => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ marginBottom: 8 }}>
                      {item.name}: {item.score} / {item.max} 分
                    </div>
                    <Progress
                      percent={(item.score / item.max) * 100}
                      size="small"
                    />
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card title="改进建议" style={{ marginTop: 24 }}>
        <List
          dataSource={healthData.insights}
          renderItem={(item) => <List.Item>{item}</List.Item>}
        />
      </Card>
    </Card>
  );
};
```

### 1.6 实施步骤

#### 阶段 1：基础设施（1-2 周）

1. **数据库设计与迁移**
   - 创建健康度评分表和历史记录表
   - 添加必要的索引

2. **核心服务开发**
   - 实现 HealthScoreService 和各个 Calculator
   - 单元测试覆盖率 > 80%

3. **事件集成**
   - 集成 EventBusService 发布健康度事件
   - notification-service 订阅干预事件

#### 阶段 2：计算逻辑（2-3 周）

4. **实现各维度计算器**
   - ActivityCalculator
   - UtilizationCalculator
   - StabilityCalculator
   - GrowthCalculator
   - EngagementCalculator

5. **数据采集优化**
   - 确保各服务正确上报所需指标
   - device-service 提供使用时长 API
   - billing-service 提供消费趋势 API

#### 阶段 3：干预系统（2 周）

6. **干预策略实现**
   - 定义干预策略规则
   - 实现自动触发逻辑
   - 对接通知系统

7. **效果追踪**
   - 记录干预历史
   - 统计干预效果

#### 阶段 4：前端展示（1-2 周）

8. **管理后台页面**
   - 健康度看板
   - 高危用户列表
   - 干预管理界面

9. **用户端页面**
   - 个人健康度报告
   - 改进建议展示

#### 阶段 5：上线与优化（持续）

10. **灰度发布**
    - 先对部分用户计算健康度
    - 观察系统性能影响

11. **模型优化**
    - 根据实际流失数据调整评分权重
    - 优化干预策略

---

## 2. 智能运维自动化增强

### 2.1 系统目标

**核心目标**：减少人工运维成本，提高故障响应速度，实现智能化的资源管理和问题预防。

**预期效果**：
- 人工运维工作量减少 60%
- 故障响应时间缩短至 < 5 分钟
- 自动修复率 > 70%

### 2.2 增强方案

基于现有的 `device-service/lifecycle` 模块，增强以下能力：

#### 2.2.1 智能告警系统

**扩展 Prometheus 告警规则：**

```yaml
# infrastructure/monitoring/prometheus/intelligent-alert.rules.yml

groups:
  - name: intelligent_alerts
    interval: 30s
    rules:
      # 智能设备异常检测
      - alert: DeviceAnomalyDetected
        expr: |
          (
            rate(device_errors_total[5m]) > 0.1
            or
            device_cpu_usage > 90
            or
            device_memory_usage > 90
          )
          and
          device_uptime_seconds > 300
        for: 3m
        labels:
          severity: warning
          component: device
          auto_heal: "true"
        annotations:
          summary: "设备 {{ $labels.device_id }} 出现异常"
          description: "错误率: {{ $value | humanize }}，需要自动干预"
          auto_action: "restart_device"

      # 资源利用率异常低
      - alert: LowResourceUtilization
        expr: |
          (
            avg(device_cpu_usage) by (user_id) < 20
            and
            avg(device_memory_usage) by (user_id) < 30
          )
          and
          count(device_status == "running") by (user_id) > 1
        for: 24h
        labels:
          severity: info
          component: optimization
          auto_action: "true"
        annotations:
          summary: "用户 {{ $labels.user_id }} 资源利用率过低"
          description: "建议优化设备配置或缩减实例数量"
          auto_action: "send_optimization_suggestion"

      # 预测性告警：即将耗尽资源
      - alert: ResourceExhaustionPredicted
        expr: |
          predict_linear(user_resource_usage[1h], 3600 * 24) > user_quota_limit
        for: 5m
        labels:
          severity: warning
          component: capacity
          auto_action: "true"
        annotations:
          summary: "预测用户 {{ $labels.user_id }} 将在24小时内耗尽配额"
          description: "当前使用趋势: {{ $value | humanize }}"
          auto_action: "send_upgrade_notification"

      # 成本异常增长
      - alert: CostSpikeDetected
        expr: |
          rate(billing_cost_total[1h]) > (
            avg_over_time(billing_cost_total[24h:1h]) * 1.5
          )
        for: 15m
        labels:
          severity: critical
          component: billing
          auto_action: "true"
        annotations:
          summary: "用户 {{ $labels.user_id }} 成本异常增长"
          description: "当前增长率: {{ $value | humanizePercentage }}"
          auto_action: "send_cost_alert_and_freeze_if_needed"
```

#### 2.2.2 自动修复引擎

在 `device-service` 中新增自动修复模块：

```typescript
// backend/device-service/src/auto-heal/auto-heal.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { DevicesService } from '../devices/devices.service';
import { DockerService } from '../docker/docker.service';
import { EventBusService } from '@cloudphone/shared';

@Injectable()
export class AutoHealService {
  private readonly logger = new Logger(AutoHealService.name);

  constructor(
    private devicesService: DevicesService,
    private dockerService: DockerService,
    private eventBus: EventBusService,
  ) {}

  /**
   * 处理 Prometheus 告警
   */
  async handleAlert(alert: PrometheusAlert): Promise<void> {
    this.logger.log(
      `收到告警: ${alert.labels.alertname}, 设备: ${alert.labels.device_id}`
    );

    // 检查是否支持自动修复
    if (alert.labels.auto_heal !== 'true') {
      this.logger.log('告警不支持自动修复，跳过');
      return;
    }

    const autoAction = alert.annotations.auto_action;
    const deviceId = alert.labels.device_id;

    try {
      switch (autoAction) {
        case 'restart_device':
          await this.autoRestartDevice(deviceId, alert);
          break;

        case 'recreate_device':
          await this.autoRecreateDevice(deviceId, alert);
          break;

        case 'scale_down':
          await this.autoScaleDown(alert.labels.user_id, alert);
          break;

        case 'send_optimization_suggestion':
          await this.sendOptimizationSuggestion(alert.labels.user_id, alert);
          break;

        case 'send_upgrade_notification':
          await this.sendUpgradeNotification(alert.labels.user_id, alert);
          break;

        case 'send_cost_alert_and_freeze_if_needed':
          await this.handleCostSpike(alert.labels.user_id, alert);
          break;

        default:
          this.logger.warn(`未知的自动修复动作: ${autoAction}`);
      }

      // 记录修复历史
      await this.recordHealingAction(deviceId, autoAction, 'success');
    } catch (error) {
      this.logger.error(
        `自动修复失败: ${autoAction}, 设备: ${deviceId}`,
        error.stack
      );
      await this.recordHealingAction(deviceId, autoAction, 'failed', error.message);

      // 修复失败，升级告警
      await this.escalateAlert(alert, error);
    }
  }

  /**
   * 自动重启设备
   */
  private async autoRestartDevice(
    deviceId: string,
    alert: PrometheusAlert
  ): Promise<void> {
    this.logger.log(`自动重启设备: ${deviceId}`);

    const device = await this.devicesService.findOne(deviceId);
    if (!device) {
      throw new Error(`设备不存在: ${deviceId}`);
    }

    // 检查重启频率，避免过度重启
    const recentRestarts = await this.getRecentRestartCount(deviceId, 3600); // 1小时内
    if (recentRestarts >= 3) {
      this.logger.warn(`设备 ${deviceId} 重启过于频繁，改为重建`);
      return this.autoRecreateDevice(deviceId, alert);
    }

    // 执行重启
    await this.dockerService.restartContainer(device.containerId);

    // 等待设备恢复
    await this.waitForDeviceHealthy(deviceId, 60000); // 最多等待60秒

    // 发布事件
    await this.eventBus.publishDeviceEvent('auto_healed', {
      deviceId,
      action: 'restart',
      reason: alert.annotations.summary,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`设备 ${deviceId} 自动重启成功`);
  }

  /**
   * 自动重建设备
   */
  private async autoRecreateDevice(
    deviceId: string,
    alert: PrometheusAlert
  ): Promise<void> {
    this.logger.log(`自动重建设备: ${deviceId}`);

    const device = await this.devicesService.findOne(deviceId);
    if (!device) {
      throw new Error(`设备不存在: ${deviceId}`);
    }

    // 创建备份（如果启用）
    if (device.backupEnabled) {
      await this.devicesService.createBackup(deviceId);
    }

    // 删除旧设备
    await this.devicesService.remove(deviceId);

    // 创建新设备（使用相同配置）
    const newDevice = await this.devicesService.create({
      userId: device.userId,
      name: device.name,
      spec: device.spec,
      androidVersion: device.androidVersion,
      restoreFromBackup: device.backupEnabled,
    });

    // 发布事件
    await this.eventBus.publishDeviceEvent('auto_healed', {
      deviceId,
      newDeviceId: newDevice.id,
      action: 'recreate',
      reason: alert.annotations.summary,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`设备 ${deviceId} 自动重建成功，新设备: ${newDevice.id}`);
  }

  /**
   * 自动缩容
   */
  private async autoScaleDown(
    userId: string,
    alert: PrometheusAlert
  ): Promise<void> {
    this.logger.log(`为用户 ${userId} 执行自动缩容建议`);

    // 获取用户的闲置设备
    const idleDevices = await this.devicesService.findIdleDevices(userId, 24); // 24小时未使用

    if (idleDevices.length === 0) {
      this.logger.log('没有闲置设备，跳过缩容');
      return;
    }

    // 发送通知，建议用户删除闲置设备
    await this.eventBus.publish('cloudphone.events', 'user.scale_down_suggested', {
      userId,
      idleDeviceCount: idleDevices.length,
      idleDeviceIds: idleDevices.map(d => d.id),
      potentialSavings: this.calculatePotentialSavings(idleDevices),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`已向用户 ${userId} 发送缩容建议，闲置设备数: ${idleDevices.length}`);
  }

  /**
   * 发送优化建议
   */
  private async sendOptimizationSuggestion(
    userId: string,
    alert: PrometheusAlert
  ): Promise<void> {
    this.logger.log(`为用户 ${userId} 发送资源优化建议`);

    // 分析用户的资源使用模式
    const usagePattern = await this.analyzeUsagePattern(userId);

    // 生成优化建议
    const suggestions = this.generateOptimizationSuggestions(usagePattern);

    // 发送通知
    await this.eventBus.publish('cloudphone.events', 'user.optimization_suggested', {
      userId,
      usagePattern,
      suggestions,
      potentialSavings: suggestions.reduce((sum, s) => sum + s.savingsPerMonth, 0),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`已向用户 ${userId} 发送优化建议`);
  }

  /**
   * 发送升级通知
   */
  private async sendUpgradeNotification(
    userId: string,
    alert: PrometheusAlert
  ): Promise<void> {
    this.logger.log(`为用户 ${userId} 发送配额即将耗尽通知`);

    // 获取用户当前配额和使用情况
    const quotaInfo = await this.getUserQuotaInfo(userId);

    // 计算预计耗尽时间
    const exhaustionEta = this.calculateExhaustionEta(quotaInfo);

    // 发送通知
    await this.eventBus.publish('cloudphone.events', 'user.quota_exhaustion_warning', {
      userId,
      currentUsage: quotaInfo.currentUsage,
      quotaLimit: quotaInfo.limit,
      exhaustionEta,
      recommendedPlan: this.recommendUpgradePlan(quotaInfo),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`已向用户 ${userId} 发送配额预警通知，预计 ${exhaustionEta} 耗尽`);
  }

  /**
   * 处理成本激增
   */
  private async handleCostSpike(
    userId: string,
    alert: PrometheusAlert
  ): Promise<void> {
    this.logger.warn(`用户 ${userId} 成本异常增长`);

    // 分析成本激增原因
    const costAnalysis = await this.analyzeCostSpike(userId);

    // 发送告警通知
    await this.eventBus.publish('cloudphone.events', 'billing.cost_spike_alert', {
      userId,
      costAnalysis,
      currentRate: costAnalysis.currentHourlyRate,
      normalRate: costAnalysis.normalHourlyRate,
      increasePercentage: costAnalysis.increasePercentage,
      timestamp: new Date().toISOString(),
    });

    // 如果超过阈值，考虑自动暂停部分资源
    if (costAnalysis.increasePercentage > 200) {
      this.logger.warn(`成本增长超过200%，考虑自动冻结新资源创建`);

      // 发布事件，由 user-service 处理配额限制
      await this.eventBus.publishUserEvent('emergency_quota_freeze', {
        userId,
        reason: 'cost_spike',
        costAnalysis,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`已处理用户 ${userId} 的成本激增告警`);
  }

  /**
   * 升级告警（当自动修复失败时）
   */
  private async escalateAlert(
    alert: PrometheusAlert,
    error: Error
  ): Promise<void> {
    this.logger.error(`告警升级: ${alert.labels.alertname}`);

    // 发送给运维团队
    await this.eventBus.publish('cloudphone.events', 'ops.alert_escalated', {
      originalAlert: alert,
      autoHealError: error.message,
      severity: 'critical',
      requiresManualIntervention: true,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### 2.2.3 容量规划与预测

```typescript
// backend/device-service/src/capacity/capacity-planning.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CapacityPlanningService {
  private readonly logger = new Logger(CapacityPlanningService.name);

  /**
   * 每日容量规划报告
   */
  @Cron('0 8 * * *') // 每天早上8点
  async generateDailyCapacityReport(): Promise<void> {
    this.logger.log('生成每日容量规划报告');

    // 1. 统计当前资源使用情况
    const currentUsage = await this.getCurrentResourceUsage();

    // 2. 预测未来7天的资源需求
    const forecast = await this.forecastResourceDemand(7);

    // 3. 识别容量瓶颈
    const bottlenecks = await this.identifyBottlenecks(currentUsage, forecast);

    // 4. 生成扩容建议
    const scalingRecommendations = await this.generateScalingRecommendations(
      currentUsage,
      forecast,
      bottlenecks
    );

    // 5. 生成报告
    const report = {
      date: new Date(),
      currentUsage,
      forecast,
      bottlenecks,
      scalingRecommendations,
      estimatedCosts: this.estimateScalingCosts(scalingRecommendations),
    };

    // 6. 发送报告给运营团队
    await this.sendCapacityReport(report);

    this.logger.log('容量规划报告已生成并发送');
  }

  /**
   * 预测资源需求（使用线性回归或 ARIMA 模型）
   */
  private async forecastResourceDemand(days: number): Promise<ResourceForecast> {
    // 获取历史数据
    const historicalData = await this.getHistoricalResourceUsage(30); // 过去30天

    // 简单线性回归预测
    const trend = this.calculateTrend(historicalData);

    // 预测未来N天
    const forecast = [];
    for (let i = 1; i <= days; i++) {
      forecast.push({
        date: new Date(Date.now() + i * 24 * 3600 * 1000),
        predictedCpuCores: trend.cpu.slope * i + trend.cpu.intercept,
        predictedMemoryGB: trend.memory.slope * i + trend.memory.intercept,
        predictedDeviceCount: Math.round(trend.devices.slope * i + trend.devices.intercept),
        confidence: this.calculateConfidence(historicalData, i),
      });
    }

    return {
      forecastPeriodDays: days,
      predictions: forecast,
      accuracy: this.calculateAccuracy(historicalData),
    };
  }

  /**
   * 识别容量瓶颈
   */
  private async identifyBottlenecks(
    currentUsage: ResourceUsage,
    forecast: ResourceForecast
  ): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // 检查各项资源的容量
    const capacityLimits = await this.getCapacityLimits();

    // CPU 瓶颈
    if (forecast.predictions[6].predictedCpuCores > capacityLimits.cpuCores * 0.8) {
      bottlenecks.push({
        resource: 'CPU',
        currentUsage: currentUsage.cpuCores,
        predictedUsage: forecast.predictions[6].predictedCpuCores,
        capacity: capacityLimits.cpuCores,
        utilizationPercentage: (forecast.predictions[6].predictedCpuCores / capacityLimits.cpuCores) * 100,
        severity: 'high',
        eta: this.calculateEta(currentUsage.cpuCores, forecast.predictions, capacityLimits.cpuCores * 0.8),
      });
    }

    // 内存瓶颈
    if (forecast.predictions[6].predictedMemoryGB > capacityLimits.memoryGB * 0.8) {
      bottlenecks.push({
        resource: 'Memory',
        currentUsage: currentUsage.memoryGB,
        predictedUsage: forecast.predictions[6].predictedMemoryGB,
        capacity: capacityLimits.memoryGB,
        utilizationPercentage: (forecast.predictions[6].predictedMemoryGB / capacityLimits.memoryGB) * 100,
        severity: 'high',
        eta: this.calculateEta(currentUsage.memoryGB, forecast.predictions, capacityLimits.memoryGB * 0.8),
      });
    }

    // 设备数量瓶颈
    if (forecast.predictions[6].predictedDeviceCount > capacityLimits.maxDevices * 0.8) {
      bottlenecks.push({
        resource: 'Device Count',
        currentUsage: currentUsage.deviceCount,
        predictedUsage: forecast.predictions[6].predictedDeviceCount,
        capacity: capacityLimits.maxDevices,
        utilizationPercentage: (forecast.predictions[6].predictedDeviceCount / capacityLimits.maxDevices) * 100,
        severity: 'critical',
        eta: this.calculateEta(currentUsage.deviceCount, forecast.predictions, capacityLimits.maxDevices * 0.8),
      });
    }

    return bottlenecks;
  }

  /**
   * 生成扩容建议
   */
  private async generateScalingRecommendations(
    currentUsage: ResourceUsage,
    forecast: ResourceForecast,
    bottlenecks: Bottleneck[]
  ): Promise<ScalingRecommendation[]> {
    const recommendations: ScalingRecommendation[] = [];

    for (const bottleneck of bottlenecks) {
      const recommendation = {
        resource: bottleneck.resource,
        action: 'scale_up',
        currentCapacity: bottleneck.capacity,
        recommendedCapacity: this.calculateRecommendedCapacity(bottleneck),
        estimatedCost: this.estimateResourceCost(bottleneck.resource, this.calculateRecommendedCapacity(bottleneck)),
        urgency: bottleneck.severity,
        timeline: bottleneck.eta,
        reasoning: this.generateReasoningText(bottleneck),
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * 发送容量报告
   */
  private async sendCapacityReport(report: CapacityReport): Promise<void> {
    // 生成可视化报告
    const reportHtml = this.generateReportHtml(report);

    // 发送邮件给运营团队
    await this.eventBus.publish('cloudphone.events', 'ops.capacity_report_generated', {
      report,
      reportHtml,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 3. 成本与容量优化系统

### 3.1 系统目标

**核心目标**：实时监控成本，识别浪费，提供优化建议，帮助用户和平台降低运营成本。

**预期效果**：
- 平台成本降低 15-25%
- 用户成本优化建议采纳率 > 40%
- 闲置资源回收率 > 80%

### 3.2 架构设计

在 `billing-service` 中新增成本优化模块：

```
backend/billing-service/src/cost-optimization/
├── cost-optimization.module.ts
├── cost-optimization.service.ts
├── cost-optimization.controller.ts
├── cost-analysis.service.ts
├── savings-calculator.service.ts
├── recommendation-engine.service.ts
└── entities/
    ├── cost-optimization-report.entity.ts
    └── cost-saving-opportunity.entity.ts
```

### 3.3 核心功能

#### 3.3.1 实时成本监控

```typescript
// backend/billing-service/src/cost-optimization/cost-analysis.service.ts

@Injectable()
export class CostAnalysisService {
  /**
   * 分析用户成本结构
   */
  async analyzeUserCosts(userId: string): Promise<CostAnalysisReport> {
    // 1. 获取用户的所有资源
    const devices = await this.getUser Devices(userId);
    const proxies = await this.getUserProxies(userId);
    const storage = await this.getUserStorage(userId);

    // 2. 计算各项成本
    const deviceCosts = await this.calculateDeviceCosts(devices);
    const proxyCosts = await this.calculateProxyCosts(proxies);
    const storageCosts = await this.calculateStorageCosts(storage);

    // 3. 成本分解
    const costBreakdown = {
      total: deviceCosts + proxyCosts + storageCosts,
      byCategory: {
        compute: deviceCosts,
        network: proxyCosts,
        storage: storageCosts,
      },
      byDevice: devices.map(d => ({
        deviceId: d.id,
        cost: this.calculateSingleDeviceCost(d),
        utilizationRate: d.utilizationRate,
        costEfficiency: d.utilizationRate > 0 ? this.calculateSingleDeviceCost(d) / d.utilizationRate : 0,
      })),
    };

    // 4. 识别异常
    const anomalies = this.detectCostAnomalies(costBreakdown);

    // 5. 趋势分析
    const trend = await this.analyzeCostTrend(userId, 30);

    return {
      userId,
      period: { start: moment().startOf('month'), end: moment().endOf('month') },
      costBreakdown,
      anomalies,
      trend,
      insights: this.generateCostInsights(costBreakdown, anomalies, trend),
    };
  }

  /**
   * 检测成本异常
   */
  private detectCostAnomalies(costBreakdown: CostBreakdown): CostAnomaly[] {
    const anomalies: CostAnomaly[] = [];

    // 1. 高成本低利用率设备
    const inefficientDevices = costBreakdown.byDevice.filter(
      d => d.cost > 100 && d.utilizationRate < 0.3 // 成本>100且利用率<30%
    );

    if (inefficientDevices.length > 0) {
      anomalies.push({
        type: 'low_utilization_high_cost',
        severity: 'medium',
        affectedResources: inefficientDevices.map(d => d.deviceId),
        estimatedWaste: inefficientDevices.reduce((sum, d) => sum + d.cost * (1 - d.utilizationRate), 0),
        recommendation: '建议降低配置或删除闲置设备',
      });
    }

    // 2. 僵尸资源（长时间未使用）
    const zombieDevices = cost Breakdown.byDevice.filter(
      d => d.lastUsedAt && moment().diff(d.lastUsedAt, 'days') > 7
    );

    if (zombieDevices.length > 0) {
      anomalies.push({
        type: 'zombie_resources',
        severity: 'high',
        affectedResources: zombieDevices.map(d => d.deviceId),
        estimatedWaste: zombieDevices.reduce((sum, d) => sum + d.cost, 0),
        recommendation: '建议删除7天以上未使用的设备',
      });
    }

    // 3. 配置过度
    const overProvisionedDevices = costBreakdown.byDevice.filter(
      d => d.avgCpuUsage < 20 && d.avgMemoryUsage < 30
    );

    if (overProvisionedDevices.length > 0) {
      anomalies.push({
        type: 'over_provisioned',
        severity: 'low',
        affectedResources: overProvisionedDevices.map(d => d.deviceId),
        estimatedWaste: overProvisionedDevices.reduce(
          (sum, d) => sum + (d.cost * 0.5), // 假设可节省50%
          0
        ),
        recommendation: '建议降低设备配置规格',
      });
    }

    return anomalies;
  }

  /**
   * 生成成本洞察
   */
  private generateCostInsights(
    costBreakdown: CostBreakdown,
    anomalies: CostAnomaly[],
    trend: CostTrend
  ): string[] {
    const insights: string[] = [];

    // 总体成本评估
    if (trend.monthOverMonth > 20) {
      insights.push(`⚠️ 本月成本较上月增长 ${trend.monthOverMonth.toFixed(1)}%，请关注`);
    } else if (trend.monthOverMonth < -10) {
      insights.push(`✅ 本月成本较上月下降 ${Math.abs(trend.monthOverMonth).toFixed(1)}%，优化有效`);
    }

    // 成本分布
    const computePercentage = (costBreakdown.byCategory.compute / costBreakdown.total) * 100;
    if (computePercentage > 70) {
      insights.push(`💡 计算成本占比 ${computePercentage.toFixed(1)}%，建议优化设备配置`);
    }

    // 浪费识别
    const totalWaste = anomalies.reduce((sum, a) => sum + a.estimatedWaste, 0);
    if (totalWaste > 0) {
      insights.push(
        `💰 识别到 ${anomalies.length} 项优化机会，预计可节省 ¥${totalWaste.toFixed(2)}/月`
      );
    }

    // 利用率评估
    const avgUtilization = costBreakdown.byDevice.reduce((sum, d) => sum + d.utilizationRate, 0) / costBreakdown.byDevice.length;
    if (avgUtilization < 0.5) {
      insights.push(`📊 平均资源利用率 ${(avgUtilization * 100).toFixed(1)}%，有较大优化空间`);
    }

    return insights;
  }
}
```

#### 3.3.2 优化建议引擎

```typescript
// backend/billing-service/src/cost-optimization/recommendation-engine.service.ts

@Injectable()
export class RecommendationEngineService {
  /**
   * 生成优化建议
   */
  async generateRecommendations(userId: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // 1. 设备配置优化
    const deviceRecommendations = await this.analyzeDeviceOptimization(userId);
    recommendations.push(...deviceRecommendations);

    // 2. 定时启停
    const schedulingRecommendations = await this.analyzeSchedulingOpportunities(userId);
    recommendations.push(...schedulingRecommendations);

    // 3. 预留实例
    const reservationRecommendations = await this.analyzeReservationOpportunities(userId);
    recommendations.push(...reservationRecommendations);

    // 4. Spot 实例
    const spotRecommendations = await this.analyzeSpotOpportunities(userId);
    recommendations.push(...spotRecommendations);

    // 按节省金额排序
    recommendations.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

    return recommendations;
  }

  /**
   * 分析设备配置优化机会
   */
  private async analyzeDeviceOptimization(userId: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    const devices = await this.getUserDevices(userId);

    for (const device of devices) {
      const usageStats = await this.getDeviceUsageStats(device.id, 7); // 过去7天

      // 资源利用率低，建议降配
      if (usageStats.avgCpuUsage < 30 && usageStats.avgMemoryUsage < 40) {
        const currentSpec = device.spec;
        const recommendedSpec = this.downsizeSpec(currentSpec);

        const currentCost = this.calculateSpecCost(currentSpec);
        const recommendedCost = this.calculateSpecCost(recommendedSpec);
        const monthlySavings = (currentCost - recommendedCost) * 720; // 30天 * 24小时

        recommendations.push({
          type: 'downsize_device',
          resourceId: device.id,
          resourceName: device.name,
          description: `设备 ${device.name} 平均 CPU 利用率 ${usageStats.avgCpuUsage.toFixed(1)}%，内存利用率 ${usageStats.avgMemoryUsage.toFixed(1)}%，建议降低配置`,
          currentState: {
            spec: currentSpec,
            monthlyCost: currentCost * 720,
          },
          recommendedState: {
            spec: recommendedSpec,
            monthlyCost: recommendedCost * 720,
          },
          estimatedSavings: monthlySavings,
          savingsPercentage: ((monthlySavings / (currentCost * 720)) * 100).toFixed(1),
          effort: 'low', // 实施难度
          riskLevel: 'low',
          priority: monthlySavings > 100 ? 'high' : 'medium',
          actionSteps: [
            '1. 创建设备快照备份',
            `2. 将设备规格从 ${currentSpec} 调整为 ${recommendedSpec}`,
            '3. 重启设备并验证应用正常运行',
          ],
        });
      }
    }

    return recommendations;
  }

  /**
   * 分析定时启停机会
   */
  private async analyzeSchedulingOpportunities(userId: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    const devices = await this.getUserDevices(userId);

    for (const device of devices) {
      const usagePattern = await this.analyzeUsagePattern(device.id, 30); // 过去30天

      // 检测明显的空闲时段
      if (usagePattern.hasIdlePeriods) {
        const idleHours = usagePattern.idleHoursPerDay;
        const deviceCost = this.calculateDeviceCost(device);
        const hourlyCost = deviceCost / 720;
        const monthlySavings = idleHours * 30 * hourlyCost;

        recommendations.push({
          type: 'scheduled_start_stop',
          resourceId: device.id,
          resourceName: device.name,
          description: `设备 ${device.name} 每天有约 ${idleHours.toFixed(1)} 小时处于空闲状态，建议设置定时启停`,
          currentState: {
            runningMode: '24/7',
            monthlyCost: deviceCost,
          },
          recommendedState: {
            runningMode: `定时运行（工作日 ${usagePattern.activeHoursStart}-${usagePattern.activeHoursEnd}）`,
            monthlyCost: deviceCost - monthlySavings,
          },
          estimatedSavings: monthlySavings,
          savingsPercentage: ((monthlySavings / deviceCost) * 100).toFixed(1),
          effort: 'medium',
          riskLevel: 'medium',
          priority: monthlySavings > 50 ? 'high' : 'medium',
          actionSteps: [
            '1. 确认设备的实际使用时间段',
            '2. 在控制台设置设备定时启停规则',
            `3. 设置定时启动时间: ${usagePattern.activeHoursStart}`,
            `4. 设置定时停止时间: ${usagePattern.activeHoursEnd}`,
            '5. 监控1周确保业务不受影响',
          ],
          usagePattern: {
            idleHoursPerDay: idleHours,
            activeHoursStart: usagePattern.activeHoursStart,
            activeHoursEnd: usagePattern.activeHoursEnd,
            weekdayPattern: usagePattern.weekdayPattern,
          },
        });
      }
    }

    return recommendations;
  }

  /**
   * 分析预留实例机会
   */
  private async analyzeReservationOpportunities(userId: string): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // 获取用户的长期稳定运行设备
    const stableDevices = await this.getStableDevices(userId, 90); // 90天内稳定运行

    if (stableDevices.length > 0) {
      const totalOnDemandCost = stableDevices.reduce(
        (sum, d) => sum + this.calculateDeviceCost(d),
        0
      );

      // 预留实例通常有30-70%的折扣
      const reservedCost = totalOnDemandCost * 0.5; // 假设50%折扣
      const annualSavings = (totalOnDemandCost - reservedCost) * 12;

      recommendations.push({
        type: 'reserved_instances',
        resourceIds: stableDevices.map(d => d.id),
        description: `您有 ${stableDevices.length} 台设备已持续运行超过 90 天，建议购买预留实例以获得折扣`,
        currentState: {
          pricingModel: '按需计费（Pay-as-you-go）',
          monthlyCost: totalOnDemandCost,
          annualCost: totalOnDemandCost * 12,
        },
        recommendedState: {
          pricingModel: '预留实例（1年期，50%折扣）',
          monthlyCost: reservedCost,
          annualCost: reservedCost * 12,
        },
        estimatedSavings: annualSavings / 12, // 月均节省
        savingsPercentage: '50',
        effort: 'low',
        riskLevel: 'low',
        priority: annualSavings > 1000 ? 'high' : 'medium',
        actionSteps: [
          '1. 确认这些设备将长期使用（至少1年）',
          '2. 选择合适的预留实例套餐（1年或3年）',
          '3. 完成预留实例购买',
          '4. 设备将自动应用预留实例折扣',
        ],
        additionalInfo: {
          commitmentPeriod: '1年',
          paymentOption: '全预付/部分预付/无预付',
          flexibility: '可在同规格设备间灵活分配',
        },
      });
    }

    return recommendations;
  }
}
```

#### 3.3.3 成本可视化仪表板

前端展示：

```tsx
// frontend/admin/src/pages/CostOptimization/Dashboard.tsx

const CostOptimizationDashboard: React.FC = () => {
  return (
    <div>
      {/* 成本概览 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月总成本"
              value={statistics.totalCost}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="可节省金额"
              value={statistics.potentialSavings}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均利用率"
              value={statistics.avgUtilization}
              suffix="%"
              precision={1}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="优化建议"
              value={recommendations.length}
              suffix="条"
            />
          </Card>
        </Col>
      </Row>

      {/* 成本趋势 */}
      <Card title="成本趋势" style={{ marginTop: 24 }}>
        <Line
          data={costTrendData}
          xField="date"
          yField="cost"
          seriesField="category"
        />
      </Card>

      {/* 成本分解 */}
      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="成本分类">
            <Pie
              data={costBreakdownData}
              angleField="value"
              colorField="type"
              radius={0.8}
              label={{
                type: 'outer',
                content: '{name} {percentage}',
              }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="资源利用率分布">
            <Column
              data={utilizationData}
              xField="device"
              yField="utilization"
              meta={{
                utilization: {
                  alias: '利用率',
                  max: 100,
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 优化建议列表 */}
      <Card title="优化建议" style={{ marginTop: 24 }}>
        <List
          dataSource={recommendations}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button type="primary" onClick={() => implementRecommendation(item)}>
                  采纳建议
                </Button>,
                <Button onClick={() => viewDetails(item)}>查看详情</Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={getRecommendationIcon(item.type)} />}
                title={
                  <Space>
                    <span>{item.description}</span>
                    <Tag color="green">可节省 ¥{item.estimatedSavings.toFixed(2)}/月</Tag>
                    <Tag color={getPriorityColor(item.priority)}>{item.priority}</Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical">
                    <div>
                      当前配置: {JSON.stringify(item.currentState)}
                    </div>
                    <div>
                      建议配置: {JSON.stringify(item.recommendedState)}
                    </div>
                    <div>
                      节省比例: {item.savingsPercentage}%
                    </div>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};
```

---

## 4. 工单与支持系统优化

### 4.1 系统目标

**核心目标**：提升工单处理效率，减少响应时间，通过智能化降低人工介入需求。

**预期效果**：
- 工单响应时间缩短 50%
- 自动回复率 > 40%
- 用户满意度提升至 > 4.5/5.0

### 4.2 增强方案

基于 `user-service` 现有的 tickets 模块，增强以下能力：

#### 4.2.1 智能分类与路由

```typescript
// backend/user-service/src/tickets/intelligent-routing.service.ts

import { Injectable } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class IntelligentRoutingService {
  /**
   * 智能分类工单
   */
  async classifyTicket(ticket: CreateTicketDto): Promise<TicketClassification> {
    // 使用关键词匹配 + NLP（如果集成了AI服务）
    const classification = {
      category: this.detectCategory(ticket.title, ticket.description),
      priority: this.detectPriority(ticket.title, ticket.description),
      suggestedTags: this.extractTags(ticket.description),
      relatedFaq: await this.findRelatedFaq(ticket.description),
      autoResolvable: false,
      autoResponse: null,
    };

    // 检查是否可以自动回复
    if (classification.relatedFaq.length > 0 && classification.relatedFaq[0].relevanceScore > 0.8) {
      classification.autoResolvable = true;
      classification.autoResponse = this.generateAutoResponse(classification.relatedFaq[0]);
    }

    return classification;
  }

  /**
   * 检测工单类别
   */
  private detectCategory(title: string, description: string): TicketCategory {
    const text = `${title} ${description}`.toLowerCase();

    // 关键词匹配规则
    const rules = [
      {
        category: TicketCategory.DEVICE_ISSUE,
        keywords: ['设备', '启动失败', '黑屏', '卡顿', 'adb', '连接不上'],
      },
      {
        category: TicketCategory.BILLING_ISSUE,
        keywords: ['账单', '扣费', '充值', '发票', '退款', '价格'],
      },
      {
        category: TicketCategory.ACCOUNT_ISSUE,
        keywords: ['账号', '登录', '密码', '忘记', '无法访问', '权限'],
      },
      {
        category: TicketCategory.FEATURE_REQUEST,
        keywords: ['建议', '功能', '希望', '能否', '支持', '新增'],
      },
      {
        category: TicketCategory.TECHNICAL_SUPPORT,
        keywords: ['如何', '怎么', '教程', '文档', '使用', 'api'],
      },
    ];

    for (const rule of rules) {
      if (rule.keywords.some(keyword => text.includes(keyword))) {
        return rule.category;
      }
    }

    return TicketCategory.GENERAL;
  }

  /**
   * 检测优先级
   */
  private detectPriority(title: string, description: string): TicketPriority {
    const text = `${title} ${description}`.toLowerCase();

    // 紧急关键词
    const urgentKeywords = ['紧急', '严重', '无法使用', '生产环境', '崩溃', '宕机'];
    if (urgentKeywords.some(k => text.includes(k))) {
      return TicketPriority.URGENT;
    }

    // 高优先级关键词
    const highKeywords = ['影响', '重要', '尽快', '频繁', '多次'];
    if (highKeywords.some(k => text.includes(k))) {
      return TicketPriority.HIGH;
    }

    return TicketPriority.NORMAL;
  }

  /**
   * 查找相关 FAQ
   */
  private async findRelatedFaq(description: string): Promise<RelatedFaq[]> {
    // 这里可以集成向量相似度搜索或全文搜索
    // 示例：使用 PostgreSQL 的全文搜索
    const faqs = await this.faqRepo
      .createQueryBuilder('faq')
      .select()
      .addSelect(
        `ts_rank(to_tsvector('chinese', question || ' ' || answer), plainto_tsquery('chinese', :query))`,
        'relevance'
      )
      .where(
        `to_tsvector('chinese', question || ' ' || answer) @@ plainto_tsquery('chinese', :query)`,
        { query: description }
      )
      .orderBy('relevance', 'DESC')
      .limit(3)
      .getRawMany();

    return faqs.map(faq => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      relevanceScore: faq.relevance,
    }));
  }

  /**
   * 生成自动回复
   */
  private generateAutoResponse(faq: RelatedFaq): string {
    return `
感谢您的咨询！我们检测到您的问题可能与以下内容相关：

**${faq.question}**

${faq.answer}

如果以上内容未能解决您的问题，我们的工程师会尽快为您处理。

此工单将自动标记为"待确认"，如已解决请回复"已解决"关闭工单。
    `.trim();
  }

  /**
   * 智能路由到合适的处理人
   */
  async routeTicket(ticket: Ticket, classification: TicketClassification): Promise<string> {
    // 根据类别分配给不同团队/人员
    const routingRules = {
      [TicketCategory.DEVICE_ISSUE]: 'device-support-team',
      [TicketCategory.BILLING_ISSUE]: 'billing-support-team',
      [TicketCategory.ACCOUNT_ISSUE]: 'account-support-team',
      [TicketCategory.FEATURE_REQUEST]: 'product-team',
      [TicketCategory.TECHNICAL_SUPPORT]: 'technical-support-team',
    };

    const team = routingRules[classification.category] || 'general-support-team';

    // 获取该团队当前工作负载最低的成员
    const assignee = await this.findAvailableAgent(team);

    return assignee;
  }

  /**
   * 查找可用的客服人员
   */
  private async findAvailableAgent(team: string): Promise<string> {
    // 查询该团队成员的当前工单数
    const agents = await this.userRepo.find({
      where: { team, role: 'support_agent' },
    });

    const agentLoads = await Promise.all(
      agents.map(async (agent) => ({
        agentId: agent.id,
        openTickets: await this.ticketRepo.count({
          where: { assigneeId: agent.id, status: In([TicketStatus.OPEN, TicketStatus.IN_PROGRESS]) },
        }),
      }))
    );

    // 返回工单数最少的人员
    agentLoads.sort((a, b) => a.openTickets - b.openTickets);
    return agentLoads[0].agentId;
  }
}
```

#### 4.2.2 知识库与 FAQ 管理

```typescript
// backend/user-service/src/knowledge-base/knowledge-base.service.ts

@Injectable()
export class KnowledgeBaseService {
  /**
   * 创建 FAQ
   */
  async createFaq(dto: CreateFaqDto): Promise<Faq> {
    return this.faqRepo.save({
      question: dto.question,
      answer: dto.answer,
      category: dto.category,
      tags: dto.tags,
      viewCount: 0,
      helpfulCount: 0,
    });
  }

  /**
   * 搜索 FAQ
   */
  async searchFaq(query: string): Promise<Faq[]> {
    // 使用 PostgreSQL 全文搜索
    return this.faqRepo
      .createQueryBuilder('faq')
      .where(
        `to_tsvector('chinese', question || ' ' || answer) @@ plainto_tsquery('chinese', :query)`,
        { query }
      )
      .orderBy(
        `ts_rank(to_tsvector('chinese', question || ' ' || answer), plainto_tsquery('chinese', :query))`,
        'DESC'
      )
      .limit(10)
      .getMany();
  }

  /**
   * 从已解决工单中学习，生成 FAQ
   */
  @Cron('0 3 * * *') // 每天凌晨3点
  async extractFaqFromTickets(): Promise<void> {
    // 查找最近解决的工单
    const resolvedTickets = await this.ticketRepo.find({
      where: {
        status: TicketStatus.RESOLVED,
        resolvedAt: MoreThan(moment().subtract(7, 'days').toDate()),
      },
      order: { resolvedAt: 'DESC' },
      take: 100,
    });

    // 分析高频问题
    const frequentIssues = this.identifyFrequentIssues(resolvedTickets);

    // 为高频问题生成 FAQ
    for (const issue of frequentIssues) {
      if (issue.count >= 5) { // 出现5次以上的问题
        const existingFaq = await this.faqRepo.findOne({
          where: { question: issue.question },
        });

        if (!existingFaq) {
          await this.createFaq({
            question: issue.question,
            answer: issue.commonSolution,
            category: issue.category,
            tags: issue.tags,
          });

          this.logger.log(`自动创建 FAQ: ${issue.question}`);
        }
      }
    }
  }

  /**
   * 识别高频问题
   */
  private identifyFrequentIssues(tickets: Ticket[]): FrequentIssue[] {
    // 简单的关键词聚类
    const issueGroups = new Map<string, Ticket[]>();

    for (const ticket of tickets) {
      const keywords = this.extractKeywords(ticket.title);
      const key = keywords.join('_');

      if (!issueGroups.has(key)) {
        issueGroups.set(key, []);
      }
      issueGroups.get(key).push(ticket);
    }

    // 转换为频率统计
    const frequentIssues: FrequentIssue[] = [];

    for (const [key, group] of issueGroups.entries()) {
      if (group.length >= 5) {
        frequentIssues.push({
          question: this.generateQuestion(group[0]),
          commonSolution: this.findCommonSolution(group),
          category: group[0].category,
          tags: this.extractKeywords(group[0].title),
          count: group.length,
        });
      }
    }

    return frequentIssues;
  }
}
```

#### 4.2.3 工单绩效分析

```typescript
// backend/user-service/src/tickets/ticket-analytics.service.ts

@Injectable()
export class TicketAnalyticsService {
  /**
   * 生成工单绩效报告
   */
  async generatePerformanceReport(period: 'day' | 'week' | 'month'): Promise<TicketPerformanceReport> {
    const startDate = this.getStartDate(period);

    // 1. 总体指标
    const totalTickets = await this.ticketRepo.count({
      where: { createdAt: MoreThanOrEqual(startDate) },
    });

    const resolvedTickets = await this.ticketRepo.count({
      where: {
        createdAt: MoreThanOrEqual(startDate),
        status: TicketStatus.RESOLVED,
      },
    });

    // 2. 平均响应时间
    const avgResponseTime = await this.calculateAvgResponseTime(startDate);

    // 3. 平均解决时间
    const avgResolutionTime = await this.calculateAvgResolutionTime(startDate);

    // 4. 自动回复率
    const autoReplyRate = await this.calculateAutoReplyRate(startDate);

    // 5. 用户满意度
    const avgSatisfaction = await this.calculateAvgSatisfaction(startDate);

    // 6. 按类别统计
    const byCategory = await this.getTicketsByCategory(startDate);

    // 7. 客服绩效
    const agentPerformance = await this.getAgentPerformance(startDate);

    return {
      period,
      startDate,
      endDate: new Date(),
      summary: {
        totalTickets,
        resolvedTickets,
        resolutionRate: (resolvedTickets / totalTickets) * 100,
        avgResponseTime, // 分钟
        avgResolutionTime, // 小时
        autoReplyRate, // 百分比
        avgSatisfaction, // 1-5分
      },
      byCategory,
      agentPerformance,
      trends: await this.calculateTrends(period),
    };
  }

  /**
   * 计算平均响应时间
   */
  private async calculateAvgResponseTime(since: Date): Promise<number> {
    const result = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)', 'avgMinutes')
      .where('ticket.createdAt >= :since', { since })
      .andWhere('ticket.firstResponseAt IS NOT NULL')
      .getRawOne();

    return Math.round(result?.avgMinutes || 0);
  }

  /**
   * 计算平均解决时间
   */
  private async calculateAvgResolutionTime(since: Date): Promise<number> {
    const result = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)', 'avgHours')
      .where('ticket.createdAt >= :since', { since })
      .andWhere('ticket.status = :status', { status: TicketStatus.RESOLVED })
      .getRawOne();

    return Math.round(result?.avgHours || 0);
  }

  /**
   * 客服绩效统计
   */
  private async getAgentPerformance(since: Date): Promise<AgentPerformance[]> {
    const agents = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('ticket.assigneeId', 'agentId')
      .addSelect('COUNT(*)', 'totalHandled')
      .addSelect(
        'COUNT(CASE WHEN ticket.status = :resolved THEN 1 END)',
        'resolvedCount'
      )
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60)',
        'avgResponseMinutes'
      )
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)',
        'avgResolutionHours'
      )
      .addSelect('AVG(ticket.satisfactionScore)', 'avgSatisfaction')
      .where('ticket.createdAt >= :since', { since })
      .andWhere('ticket.assigneeId IS NOT NULL')
      .groupBy('ticket.assigneeId')
      .setParameter('resolved', TicketStatus.RESOLVED)
      .getRawMany();

    return agents.map(a => ({
      agentId: a.agentId,
      agentName: a.agentName,
      totalHandled: parseInt(a.totalHandled),
      resolvedCount: parseInt(a.resolvedCount),
      resolutionRate: (parseInt(a.resolvedCount) / parseInt(a.totalHandled)) * 100,
      avgResponseTime: Math.round(a.avgResponseMinutes),
      avgResolutionTime: Math.round(a.avgResolutionHours),
      avgSatisfaction: parseFloat(a.avgSatisfaction).toFixed(2),
    }));
  }
}
```

#### 4.2.4 前端优化

```tsx
// frontend/admin/src/pages/Tickets/IntelligentTicketList.tsx

const IntelligentTicketList: React.FC = () => {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({});
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);

  // 工单列表列定义
  const columns = [
    {
      title: '工单ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <Space direction="vertical" size={0}>
          <a onClick={() => viewTicket(record.id)}>{title}</a>
          {record.classification?.suggestedTags.map((tag, idx) => (
            <Tag key={idx} size="small">{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '类别',
      dataIndex: ['classification', 'category'],
      key: 'category',
      render: (category) => getCategoryTag(category),
      filters: Object.values(TicketCategory).map(c => ({ text: c, value: c })),
      onFilter: (value, record) => record.classification.category === value,
    },
    {
      title: '优先级',
      dataIndex: ['classification', 'priority'],
      key: 'priority',
      render: (priority) => getPriorityBadge(priority),
      sorter: (a, b) => priorityOrder[a.classification.priority] - priorityOrder[b.classification.priority],
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '自动回复',
      dataIndex: ['classification', 'autoResolvable'],
      key: 'autoResolvable',
      render: (autoResolvable) => (
        autoResolvable ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            已自动回复
          </Tag>
        ) : (
          <Tag color="gray">需人工处理</Tag>
        )
      ),
    },
    {
      title: '处理人',
      dataIndex: 'assigneeName',
      key: 'assigneeName',
      render: (name, record) => (
        <Space>
          <Avatar size="small">{name?.[0]}</Avatar>
          <span>{name || '未分配'}</span>
        </Space>
      ),
    },
    {
      title: '响应时间',
      dataIndex: 'responseTime',
      key: 'responseTime',
      render: (time) => (
        <span style={{ color: time > 30 ? 'red' : 'green' }}>
          {time ? `${time}分钟` : '-'}
        </span>
      ),
      sorter: (a, b) => a.responseTime - b.responseTime,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => moment(date).fromNow(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => viewTicket(record.id)}>查看</Button>
          {record.status === TicketStatus.OPEN && (
            <Button size="small" type="primary" onClick={() => assignToMe(record.id)}>
              接手
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 筛选器 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="选择类别"
            style={{ width: 150 }}
            onChange={(value) => setFilters({ ...filters, category: value })}
            allowClear
          >
            {Object.values(TicketCategory).map(c => (
              <Option key={c} value={c}>{c}</Option>
            ))}
          </Select>

          <Select
            placeholder="选择优先级"
            style={{ width: 150 }}
            onChange={(value) => setFilters({ ...filters, priority: value })}
            allowClear
          >
            {Object.values(TicketPriority).map(p => (
              <Option key={p} value={p}>{p}</Option>
            ))}
          </Select>

          <Select
            placeholder="选择状态"
            style={{ width: 150 }}
            onChange={(value) => setFilters({ ...filters, status: value })}
            allowClear
          >
            {Object.values(TicketStatus).map(s => (
              <Option key={s} value={s}>{s}</Option>
            ))}
          </Select>

          <Switch
            checked={autoReplyEnabled}
            onChange={setAutoReplyEnabled}
            checkedChildren="自动回复开启"
            unCheckedChildren="自动回复关闭"
          />

          <Button onClick={() => refreshTickets()}>刷新</Button>
        </Space>
      </Card>

      {/* 工单表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 个工单`,
          }}
        />
      </Card>
    </div>
  );
};
```

---

## 5. 实施路线图

### 总体时间规划：8-10 周

| 阶段 | 时间 | 任务 | 预期成果 |
|------|------|------|---------|
| **阶段 1** | 第 1-2 周 | 健康度评分系统基础设施 | 数据库、核心服务完成 |
| **阶段 2** | 第 3-4 周 | 健康度计算逻辑 + 智能运维自动化增强 | 评分算法、自动修复引擎完成 |
| **阶段 3** | 第 5-6 周 | 成本优化系统 + 工单系统优化 | 成本分析、智能路由完成 |
| **阶段 4** | 第 7-8 周 | 前端开发 + 集成测试 | 所有前端页面完成 |
| **阶段 5** | 第 9-10 周 | 灰度发布 + 优化迭代 | 全量上线 |

### 优先级建议

**P0（必须完成）：**
1. 健康度评分与预警系统（用户留存的关键）
2. 智能运维自动化（减少运维成本）

**P1（重要）：**
3. 成本与容量优化系统（提升平台盈利能力）
4. 工单智能分类与自动回复（提升用户满意度）

**P2（增强）：**
5. 知识库学习系统
6. 容量规划与预测

### 资源需求

**开发资源：**
- 后端开发：2 人 × 10 周
- 前端开发：1 人 × 4 周
- 测试：1 人 × 2 周

**基础设施：**
- PostgreSQL 存储扩容
- Redis 缓存扩容
- Prometheus 监控增强

**第三方服务（可选）：**
- AI/NLP API（用于工单智能分类和 FAQ 匹配）
- 邮件/短信服务（已有，需确保容量）

---

## 总结

本方案提供了四个运营优化领域的详细实施计划：

1. **健康度评分与预警系统**：通过多维度评分模型，提前识别流失风险用户，主动干预提升留存率。

2. **智能运维自动化增强**：基于 Prometheus 告警的自动修复引擎，减少人工运维成本，提高故障响应速度。

3. **成本与容量优化系统**：实时成本监控、异常检测、优化建议引擎，帮助用户和平台降低运营成本。

4. **工单与支持系统优化**：智能分类路由、自动回复、知识库学习，提升工单处理效率和用户满意度。

所有方案均基于您现有的技术栈（NestJS、PostgreSQL、Redis、RabbitMQ、Prometheus），可以无缝集成到现有架构中，无需引入额外的复杂技术。

**下一步行动：**
如果您同意上述方案，我可以立即开始实施。请告诉我您希望先从哪个模块开始（建议从健康度评分系统开始，因为它对用户留存影响最大）。
