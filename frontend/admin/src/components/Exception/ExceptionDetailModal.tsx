import React from 'react';
import { Modal, Space, Alert, Descriptions, Card } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PaymentDetail } from '@/services/payment-admin';
import { PaymentMethodTag, PaymentStatusTag } from '@/components/Refund';
import { getExceptionType } from './ExceptionTypeTag';
import { NEUTRAL_LIGHT } from '@/theme';

interface ExceptionDetailModalProps {
  visible: boolean;
  payment: PaymentDetail | null;
  onCancel: () => void;
}

export const ExceptionDetailModal: React.FC<ExceptionDetailModalProps> = React.memo(
  ({ visible, payment, onCancel }) => {
    if (!payment) return null;

    const currencySymbol =
      payment.currency === 'CNY' ? '¥' : payment.currency === 'USD' ? '$' : payment.currency;

    const hoursSinceCreated = dayjs().diff(dayjs(payment.createdAt), 'hour');

    return (
      <Modal title="异常支付详情" open={visible} onCancel={onCancel} footer={null} width={700}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 异常提示 */}
          <Alert
            message={`异常类型：${getExceptionType(payment)}`}
            type="warning"
            showIcon
            icon={<WarningOutlined />}
          />

          {/* 支付详情 */}
          <Descriptions column={2} bordered>
            <Descriptions.Item label="支付单号" span={2}>
              {payment.paymentNo}
            </Descriptions.Item>
            <Descriptions.Item label="订单号" span={2}>
              {payment.order?.orderNo || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="用户ID">{payment.userId}</Descriptions.Item>
            <Descriptions.Item label="交易号">{payment.transactionId || '-'}</Descriptions.Item>
            <Descriptions.Item label="支付金额">
              {currencySymbol}
              {payment.amount.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="支付方式">
              <PaymentMethodTag method={payment.method} />
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <PaymentStatusTag status={payment.status} />
            </Descriptions.Item>
            <Descriptions.Item label="客户ID">{payment.customerId || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(payment.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              <span style={{ marginLeft: 8, color: NEUTRAL_LIGHT.text.secondary }}>({hoursSinceCreated} 小时前)</span>
            </Descriptions.Item>
            <Descriptions.Item label="更新时间" span={2}>
              {dayjs(payment.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {payment.paidAt && (
              <Descriptions.Item label="支付时间" span={2}>
                {dayjs(payment.paidAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            )}
            {payment.paymentUrl && (
              <Descriptions.Item label="支付链接" span={2}>
                <a href={payment.paymentUrl} target="_blank" rel="noopener noreferrer">
                  {payment.paymentUrl}
                </a>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* 元数据 */}
          {payment.metadata && (
            <Card title="元数据" size="small">
              <pre style={{ margin: 0, fontSize: '12px', maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(payment.metadata, null, 2)}
              </pre>
            </Card>
          )}

          {/* 操作建议 */}
          <Alert
            message="处理建议"
            description={
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>点击"同步"按钮从支付平台获取最新状态</li>
                <li>如果长时间未更新，可能需要人工介入处理</li>
                <li>联系支付平台技术支持进行排查</li>
              </ul>
            }
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    );
  }
);

ExceptionDetailModal.displayName = 'ExceptionDetailModal';
