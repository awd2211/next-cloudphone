import React, { useMemo } from 'react';
import { Card, Row, Col, Statistic, theme } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { Invoice } from '@/services/billing';

const { useToken } = theme;

interface InvoiceStatsCardsProps {
  invoices: Invoice[];
}

/**
 * 发票统计卡片组件
 * 展示发票总数、待开具、已开具、已拒绝的统计信息
 */
export const InvoiceStatsCards: React.FC<InvoiceStatsCardsProps> = React.memo(({ invoices }) => {
  const { token } = useToken();

  const stats = useMemo(() => ({
    total: invoices.length,
    pending: invoices.filter((inv) => inv.status === 'pending').length,
    issued: invoices.filter((inv) => inv.status === 'issued').length,
    rejected: invoices.filter((inv) => inv.status === 'rejected').length,
  }), [invoices]);

  return (
    <Card style={{ marginBottom: '24px' }}>
      <Row gutter={16}>
        <Col span={6}>
          <Statistic title="总发票数" value={stats.total} prefix={<FileTextOutlined />} />
        </Col>
        <Col span={6}>
          <Statistic
            title="待开具"
            value={stats.pending}
            valueStyle={{ color: token.colorPrimary }}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已开具"
            value={stats.issued}
            valueStyle={{ color: token.colorSuccess }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="已拒绝"
            value={stats.rejected}
            valueStyle={{ color: token.colorError }}
            prefix={<CloseCircleOutlined />}
          />
        </Col>
      </Row>
    </Card>
  );
});

InvoiceStatsCards.displayName = 'InvoiceStatsCards';
