/**
 * 订单操作按钮组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 接收稳定的回调函数（useCallback）
 * 3. 只在 order 或回调函数变化时重渲染
 */
import { memo } from 'react';
import { Button, Space } from 'antd';
import { EyeOutlined, CloseCircleOutlined, DollarOutlined } from '@ant-design/icons';
import type { Order } from '@/types';

interface OrderActionsProps {
  order: Order;
  onViewDetail: (order: Order) => void;
  onCancel: (order: Order) => void;
  onRefund: (order: Order) => void;
}

export const OrderActions = memo<OrderActionsProps>(
  ({ order, onViewDetail, onCancel, onRefund }) => {
    return (
      <Space size="small">
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onViewDetail(order)}
        >
          详情
        </Button>

        {order.status === 'pending' && (
          <Button
            type="link"
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => onCancel(order)}
          >
            取消
          </Button>
        )}

        {order.status === 'paid' && (
          <Button
            type="link"
            size="small"
            icon={<DollarOutlined />}
            onClick={() => onRefund(order)}
          >
            退款
          </Button>
        )}
      </Space>
    );
  }
);

OrderActions.displayName = 'OrderActions';
