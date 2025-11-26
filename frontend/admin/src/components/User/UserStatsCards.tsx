import { memo } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
  UserOutlined,
  CheckCircleOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PRIMARY, SEMANTIC } from '@/theme';

interface UserStatsCardsProps {
  total: number;
  active: number;
  inactive: number;
  banned: number;
}

export const UserStatsCards = memo<UserStatsCardsProps>(
  ({ total, active, inactive, banned }) => {
    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={total}
              prefix={<UserOutlined />}
              valueStyle={{ color: PRIMARY.main }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="禁用用户"
              value={inactive}
              prefix={<StopOutlined />}
              valueStyle={{ color: SEMANTIC.warning.main }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="封禁用户"
              value={banned}
              prefix={<WarningOutlined />}
              valueStyle={{ color: SEMANTIC.error.main }}
            />
          </Card>
        </Col>
      </Row>
    );
  }
);

UserStatsCards.displayName = 'UserStatsCards';
