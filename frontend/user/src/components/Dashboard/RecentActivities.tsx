import { memo } from 'react';
import { Col, Card, List, Avatar, Badge, Button, Space, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Activity } from '@/hooks/useDashboard';

const { Text } = Typography;

interface RecentActivitiesProps {
  activities: Activity[];
}

export const RecentActivities = memo<RecentActivitiesProps>(({ activities }) => {
  const navigate = useNavigate();

  return (
    <Col xs={24} md={16}>
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <Text strong>最近活动</Text>
          </Space>
        }
        extra={
          <Button type="link" onClick={() => navigate('/usage')}>
            查看全部
          </Button>
        }
      >
        <List
          itemLayout="horizontal"
          dataSource={activities}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar icon={item.icon} />}
                title={<Text strong>{item.title}</Text>}
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">{item.description}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.time.fromNow()}
                    </Text>
                  </Space>
                }
              />
              <Badge
                status={item.status as 'success' | 'warning' | 'error'}
                text={
                  item.status === 'success'
                    ? '成功'
                    : item.status === 'warning'
                    ? '警告'
                    : '失败'
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </Col>
  );
});

RecentActivities.displayName = 'RecentActivities';
