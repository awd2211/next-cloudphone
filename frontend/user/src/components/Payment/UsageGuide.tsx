import React from 'react';
import { Card, List, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { usageGuideItems } from '@/utils/paymentConfig';

const { Text } = Typography;

/**
 * 使用指南组件
 *
 * 优化点:
 * - 使用 React.memo 优化（静态内容）
 * - 配置驱动显示
 * - 卡片 + 列表布局
 */
export const UsageGuide: React.FC = React.memo(() => {
  return (
    <Card
      title={
        <span>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          使用指南
        </span>
      }
      style={{ marginTop: 24 }}
    >
      <List
        dataSource={usageGuideItems}
        renderItem={(item) => (
          <List.Item>
            <Text>{item}</Text>
          </List.Item>
        )}
      />
    </Card>
  );
});

UsageGuide.displayName = 'UsageGuide';
