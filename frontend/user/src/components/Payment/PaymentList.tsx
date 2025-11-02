import React from 'react';
import { List, Tag, Button, Space, Typography } from 'antd';
import {
  type PaymentMethod,
  getPaymentIcon,
  formatPaymentDisplay,
  getPaymentColor,
  getDefaultTag,
} from '@/utils/paymentConfig';

const { Text } = Typography;

interface PaymentListProps {
  paymentMethods: PaymentMethod[];
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * 支付方式列表组件
 *
 * 优化点:
 * 1. ✅ 使用 React.memo 优化
 * 2. ✅ 配置驱动（图标、颜色、格式化）
 * 3. ✅ 默认标签显示
 * 4. ✅ 操作按钮（设为默认、删除）
 */
export const PaymentList: React.FC<PaymentListProps> = React.memo(
  ({ paymentMethods, onSetDefault, onDelete }) => {
    return (
      <List
        dataSource={paymentMethods}
        renderItem={(item) => {
          const defaultTag = getDefaultTag(item.isDefault);
          const color = getPaymentColor(item.type);

          return (
            <List.Item
              actions={[
                !item.isDefault && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => onSetDefault(item.id)}
                  >
                    设为默认
                  </Button>
                ),
                <Button
                  type="link"
                  danger
                  size="small"
                  onClick={() => onDelete(item.id)}
                >
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <span style={{ fontSize: 32, color }}>
                    {getPaymentIcon(item.type)}
                  </span>
                }
                title={
                  <Space>
                    <Text strong>{formatPaymentDisplay(item)}</Text>
                    {defaultTag && (
                      <Tag color={defaultTag.color}>{defaultTag.text}</Tag>
                    )}
                  </Space>
                }
                description={
                  <Text type="secondary">
                    添加时间: {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                }
              />
            </List.Item>
          );
        }}
      />
    );
  }
);

PaymentList.displayName = 'PaymentList';
