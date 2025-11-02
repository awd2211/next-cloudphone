import React, { memo } from 'react';
import { Col, Card, Button, Space, Typography } from 'antd';
import {
  PlusOutlined,
  AppstoreOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

export const QuickActions = memo(() => {
  const navigate = useNavigate();

  return (
    <Col xs={24} md={8}>
      <Card
        title={
          <Space>
            <RocketOutlined />
            <Text strong>快捷操作</Text>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button
            block
            size="large"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/devices')}
          >
            创建新设备
          </Button>
          <Button block size="large" icon={<AppstoreOutlined />} onClick={() => navigate('/apps')}>
            浏览应用市场
          </Button>
          <Button
            block
            size="large"
            icon={<DollarOutlined />}
            onClick={() => navigate('/recharge')}
          >
            账户充值
          </Button>
          <Button
            block
            size="large"
            icon={<ClockCircleOutlined />}
            onClick={() => navigate('/orders')}
          >
            查看订单
          </Button>
        </Space>
      </Card>
    </Col>
  );
});

QuickActions.displayName = 'QuickActions';
