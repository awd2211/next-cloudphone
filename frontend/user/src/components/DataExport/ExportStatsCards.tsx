import React from 'react';
import { Row, Col, Card, Statistic, theme } from 'antd';
import {
  FileTextOutlined,
  SyncOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { formatFileSize, type ExportStats } from '@/services/export';

const { useToken } = theme;

interface ExportStatsCardsProps {
  stats: ExportStats | null;
}

/**
 * 导出统计卡片组件
 * 展示总任务数、处理中、已完成和总大小
 */
export const ExportStatsCards: React.FC<ExportStatsCardsProps> = React.memo(({ stats }) => {
  const { token } = useToken();

  if (!stats) return null;

  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="总任务数" value={stats.total} prefix={<FileTextOutlined />} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="处理中"
            value={stats.processing + stats.pending}
            valueStyle={{ color: token.colorPrimary }}
            prefix={<SyncOutlined spin={stats.processing > 0} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="已完成"
            value={stats.completed}
            valueStyle={{ color: token.colorSuccess }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="总大小"
            value={formatFileSize(stats.totalSize)}
            prefix={<FileTextOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
});

ExportStatsCards.displayName = 'ExportStatsCards';
