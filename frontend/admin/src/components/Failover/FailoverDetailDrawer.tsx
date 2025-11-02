import React from 'react';
import { Drawer, Descriptions, Tag } from 'antd';
import type { FailoverRecord } from './constants';

interface FailoverDetailDrawerProps {
  visible: boolean;
  record: FailoverRecord | null;
  onClose: () => void;
}

export const FailoverDetailDrawer: React.FC<FailoverDetailDrawerProps> = React.memo(
  ({ visible, record, onClose }) => {
    if (!record) return null;

    return (
      <Drawer
        title="故障转移详情"
        open={visible}
        onClose={onClose}
        width={600}
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="ID">{record.id}</Descriptions.Item>
          <Descriptions.Item label="设备ID">{record.deviceId}</Descriptions.Item>
          <Descriptions.Item label="设备名称">
            {record.deviceName}
          </Descriptions.Item>
          <Descriptions.Item label="源节点">{record.sourceNode}</Descriptions.Item>
          <Descriptions.Item label="目标节点">
            {record.targetNode}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag
              color={
                record.status === 'completed'
                  ? 'success'
                  : record.status === 'failed'
                    ? 'error'
                    : 'processing'
              }
            >
              {record.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="触发方式">
            {record.triggerType}
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            {record.startedAt}
          </Descriptions.Item>
          <Descriptions.Item label="完成时间">
            {record.completedAt || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="耗时">
            {record.duration ? `${record.duration}s` : '-'}
          </Descriptions.Item>
          {record.failureReason && (
            <Descriptions.Item label="故障原因">
              {record.failureReason}
            </Descriptions.Item>
          )}
          {record.errorMessage && (
            <Descriptions.Item label="错误信息">
              <span style={{ color: 'red' }}>{record.errorMessage}</span>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Drawer>
    );
  }
);

FailoverDetailDrawer.displayName = 'FailoverDetailDrawer';
