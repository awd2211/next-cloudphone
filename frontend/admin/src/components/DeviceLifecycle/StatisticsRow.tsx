/**
 * StatisticsRow - 生命周期统计行组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { LifecycleStats } from '@/types';
import { SEMANTIC } from '@/theme';

interface StatisticsRowProps {
  stats: LifecycleStats | null;
}

/**
 * StatisticsRow 组件
 * 显示生命周期规则的统计信息
 */
export const StatisticsRow = memo<StatisticsRowProps>(({ stats }) => {
  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="总规则数"
            value={stats?.totalRules || 0}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="活跃规则"
            value={stats?.activeRules || 0}
            valueStyle={{ color: SEMANTIC.success.main }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="总执行次数"
            value={stats?.totalExecutions || 0}
            prefix={<HistoryOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="成功率"
            value={stats?.successRate || 0}
            precision={1}
            suffix="%"
            valueStyle={{ color: (stats?.successRate || 0) > 90 ? SEMANTIC.success.main : SEMANTIC.warning.main }}
          />
        </Card>
      </Col>
    </Row>
  );
});

StatisticsRow.displayName = 'StatisticsRow';
