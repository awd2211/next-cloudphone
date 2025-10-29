import React from 'react';
import { Card, Progress, Space, Statistic, Row, Col } from 'antd';
import {
  SignalFilled,
  ThunderboltOutlined,
  DatabaseOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { WebRTCStats, WebRTCQuality } from '../../hooks/useWebRTC';

interface QualityIndicatorProps {
  stats: WebRTCStats | null;
  compact?: boolean;
}

const getQualityColor = (quality: WebRTCQuality): string => {
  switch (quality) {
    case WebRTCQuality.EXCELLENT:
      return '#52c41a';
    case WebRTCQuality.GOOD:
      return '#73d13d';
    case WebRTCQuality.FAIR:
      return '#faad14';
    case WebRTCQuality.POOR:
      return '#ff7a45';
    case WebRTCQuality.BAD:
      return '#f5222d';
    default:
      return '#d9d9d9';
  }
};

const getQualityPercent = (quality: WebRTCQuality): number => {
  switch (quality) {
    case WebRTCQuality.EXCELLENT:
      return 100;
    case WebRTCQuality.GOOD:
      return 80;
    case WebRTCQuality.FAIR:
      return 60;
    case WebRTCQuality.POOR:
      return 40;
    case WebRTCQuality.BAD:
      return 20;
    default:
      return 0;
  }
};

export const QualityIndicator: React.FC<QualityIndicatorProps> = ({
  stats,
  compact = false,
}) => {
  if (!stats) {
    return (
      <Card size="small">
        <div style={{ textAlign: 'center', color: '#999' }}>暂无数据</div>
      </Card>
    );
  }

  const qualityColor = getQualityColor(stats.quality);
  const qualityPercent = getQualityPercent(stats.quality);

  if (compact) {
    return (
      <Space>
        <SignalFilled style={{ color: qualityColor, fontSize: '16px' }} />
        <span style={{ fontSize: '12px' }}>
          {Math.round(stats.rtt)}ms · {Math.round(stats.framesPerSecond)}fps
        </span>
      </Space>
    );
  }

  return (
    <Card size="small" title="网络质量" style={{ width: '100%' }}>
      <Row gutter={16}>
        <Col span={24} style={{ marginBottom: '16px' }}>
          <Progress
            percent={qualityPercent}
            strokeColor={qualityColor}
            format={() => stats.quality.toUpperCase()}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="延迟"
            value={Math.round(stats.rtt)}
            suffix="ms"
            prefix={<ThunderboltOutlined />}
            valueStyle={{ fontSize: '14px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="抖动"
            value={Math.round(stats.jitter)}
            suffix="ms"
            valueStyle={{ fontSize: '14px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="丢包率"
            value={stats.packetLoss.toFixed(1)}
            suffix="%"
            valueStyle={{ fontSize: '14px' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="帧率"
            value={Math.round(stats.framesPerSecond)}
            suffix="fps"
            prefix={<FundOutlined />}
            valueStyle={{ fontSize: '14px' }}
          />
        </Col>
        <Col span={12} style={{ marginTop: '8px' }}>
          <Statistic
            title="码率"
            value={(stats.bitrate / 1000).toFixed(1)}
            suffix="Mbps"
            prefix={<DatabaseOutlined />}
            valueStyle={{ fontSize: '14px' }}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default QualityIndicator;
