import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import type { Device } from '@/types';

interface DeviceStatsRowProps {
  device: Device;
}

/**
 * 设备统计数据行组件
 * 展示设备状态、CPU、内存三个统计卡片
 */
export const DeviceStatsRow: React.FC<DeviceStatsRowProps> = React.memo(({ device }) => {
  const statusText = {
    idle: '空闲',
    running: '运行中',
    stopped: '已停止',
    error: '错误',
  }[device.status] || device.status;

  const statusColor = device.status === 'running' ? '#3f8600' : '#999';

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={8}>
        <Card>
          <Statistic
            title="设备状态"
            value={statusText}
            valueStyle={{ color: statusColor }}
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title="CPU 核心数"
            value={device.cpuCores}
            suffix="核"
          />
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Statistic
            title="内存"
            value={(device.memoryMB / 1024).toFixed(1)}
            suffix="GB"
          />
        </Card>
      </Col>
    </Row>
  );
});

DeviceStatsRow.displayName = 'DeviceStatsRow';
