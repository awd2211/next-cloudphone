import React from 'react';
import { Card, Descriptions, Tag } from 'antd';
import dayjs from 'dayjs';
import { formatBillingCycle, type Bill } from '@/services/billing';
import { billTypeConfig, statusConfig, paymentMethodConfig } from '@/utils/billingConfig';

interface BillInfoCardProps {
  bill: Bill;
}

/**
 * 账单信息卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 使用配置数据驱动 Tag 显示
 */
export const BillInfoCard: React.FC<BillInfoCardProps> = React.memo(({ bill }) => {
  return (
    <Card title="账单信息" style={{ marginBottom: 16 }}>
      <Descriptions column={2} bordered>
        {/* 账单号 */}
        <Descriptions.Item label="账单号">{bill.billNo}</Descriptions.Item>

        {/* 账单类型 */}
        <Descriptions.Item label="账单类型">
          <Tag color={billTypeConfig[bill.type].color}>{billTypeConfig[bill.type].label}</Tag>
        </Descriptions.Item>

        {/* 账单状态 */}
        <Descriptions.Item label="账单状态">
          <Tag color={statusConfig[bill.status].color}>{statusConfig[bill.status].label}</Tag>
        </Descriptions.Item>

        {/* 计费周期 */}
        <Descriptions.Item label="计费周期">{formatBillingCycle(bill.cycle)}</Descriptions.Item>

        {/* 账期范围（可选） */}
        {bill.periodStart && bill.periodEnd && (
          <Descriptions.Item label="账期范围" span={2}>
            {dayjs(bill.periodStart).format('YYYY-MM-DD')} ~{' '}
            {dayjs(bill.periodEnd).format('YYYY-MM-DD')}
          </Descriptions.Item>
        )}

        {/* 创建时间 */}
        <Descriptions.Item label="创建时间">
          {dayjs(bill.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>

        {/* 支付时间（可选） */}
        {bill.paidAt && (
          <Descriptions.Item label="支付时间">
            {dayjs(bill.paidAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        )}

        {/* 支付方式（可选） */}
        {bill.paymentMethod && (
          <Descriptions.Item label="支付方式">
            <Tag color={paymentMethodConfig[bill.paymentMethod].color}>
              {paymentMethodConfig[bill.paymentMethod].label}
            </Tag>
          </Descriptions.Item>
        )}

        {/* 说明（可选） */}
        {bill.description && (
          <Descriptions.Item label="说明" span={2}>
            {bill.description}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
});

BillInfoCard.displayName = 'BillInfoCard';
