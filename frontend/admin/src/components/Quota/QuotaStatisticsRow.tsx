/**
 * QuotaStatisticsRow - 配额统计卡片行组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Row, Col, Card, Statistic, Space, Badge } from 'antd';
import { LineChartOutlined, BellOutlined } from '@ant-design/icons';
import type { Quota, QuotaAlert } from '@/types';
import { SEMANTIC } from '@/theme';

interface QuotaStatisticsRowProps {
  quotas: Quota[];
  alerts: QuotaAlert[];
}

/**
 * QuotaStatisticsRow 组件
 * 显示配额统计信息（总数、正常、超限、告警）
 */
export const QuotaStatisticsRow = memo<QuotaStatisticsRowProps>(({ quotas, alerts }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={6}>
        <Card>
          <Statistic title="总配额数" value={quotas.length} prefix={<LineChartOutlined />} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="正常状态"
            value={quotas.filter((q) => q.status === 'active').length}
            valueStyle={{ color: SEMANTIC.success.dark }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="超限配额"
            value={quotas.filter((q) => q.status === 'exceeded').length}
            valueStyle={{ color: SEMANTIC.error.dark }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title={
              <Space>
                <span>配额告警</span>
                <Badge count={alerts.length} />
              </Space>
            }
            value={alerts.length}
            prefix={<BellOutlined />}
            valueStyle={{ color: alerts.length > 0 ? SEMANTIC.warning.main : undefined }}
          />
        </Card>
      </Col>
    </Row>
  );
});

QuotaStatisticsRow.displayName = 'QuotaStatisticsRow';
