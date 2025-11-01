/**
 * 订单状态标签组件（Memo 优化）
 *
 * 优化原理：
 * 1. 使用 React.memo 避免不必要的重渲染
 * 2. 状态映射对象在模块级别定义（只创建一次）
 * 3. 只在 status 变化时重渲染
 */
import { memo } from 'react';
import { Tag } from 'antd';

type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired';

interface OrderStatusTagProps {
  status: OrderStatus;
}

// ✅ 状态映射在模块级别定义（避免每次渲染都创建）
// 导出供其他组件使用（如导出数据时需要状态文本）
export const STATUS_CONFIG = {
  pending: {
    color: 'orange',
    text: '待支付',
  },
  paid: {
    color: 'green',
    text: '已支付',
  },
  cancelled: {
    color: 'default',
    text: '已取消',
  },
  refunded: {
    color: 'red',
    text: '已退款',
  },
  expired: {
    color: 'default',
    text: '已过期',
  },
} as const;

export const OrderStatusTag = memo<OrderStatusTagProps>(({ status }) => {
  const config = STATUS_CONFIG[status] || { color: 'default', text: status };
  return <Tag color={config.color}>{config.text}</Tag>;
});

OrderStatusTag.displayName = 'OrderStatusTag';
