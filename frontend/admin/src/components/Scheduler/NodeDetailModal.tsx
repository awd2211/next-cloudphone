import { memo } from 'react';
import { Modal, Button, Descriptions } from 'antd';
import type { SchedulerNode } from '@/services/scheduler';
import { NodeStatusTag } from '@/components/Scheduler';
import dayjs from 'dayjs';

interface NodeDetailModalProps {
  visible: boolean;
  selectedNode: SchedulerNode | null;
  onClose: () => void;
}

export const NodeDetailModal = memo<NodeDetailModalProps>(
  ({ visible, selectedNode, onClose }) => {
    return (
      <Modal
        title="节点详情"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedNode && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="节点名称" span={2}>
              {selectedNode.name}
            </Descriptions.Item>
            <Descriptions.Item label="地址" span={2}>
              {selectedNode.host}:{selectedNode.port}
            </Descriptions.Item>
            <Descriptions.Item label="区域">{selectedNode.region || '-'}</Descriptions.Item>
            <Descriptions.Item label="可用区">{selectedNode.zone || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态" span={2}>
              <NodeStatusTag status={selectedNode.status} />
            </Descriptions.Item>
            <Descriptions.Item label="CPU 容量">{selectedNode.capacity.cpu} 核</Descriptions.Item>
            <Descriptions.Item label="CPU 使用">
              {selectedNode.usage.cpu} 核 (
              {((selectedNode.usage.cpu / selectedNode.capacity.cpu) * 100).toFixed(1)}%)
            </Descriptions.Item>
            <Descriptions.Item label="内存容量">
              {(selectedNode.capacity.memory / 1024).toFixed(1)} GB
            </Descriptions.Item>
            <Descriptions.Item label="内存使用">
              {(selectedNode.usage.memory / 1024).toFixed(1)} GB (
              {((selectedNode.usage.memory / selectedNode.capacity.memory) * 100).toFixed(1)}%)
            </Descriptions.Item>
            <Descriptions.Item label="存储容量">
              {(selectedNode.capacity.storage / 1024).toFixed(1)} GB
            </Descriptions.Item>
            <Descriptions.Item label="存储使用">
              {(selectedNode.usage.storage / 1024).toFixed(1)} GB (
              {((selectedNode.usage.storage / selectedNode.capacity.storage) * 100).toFixed(1)}%)
            </Descriptions.Item>
            <Descriptions.Item label="设备容量">
              {selectedNode.capacity.maxDevices}
            </Descriptions.Item>
            <Descriptions.Item label="设备数量">
              {selectedNode.usage.deviceCount} (
              {((selectedNode.usage.deviceCount / selectedNode.capacity.maxDevices) * 100).toFixed(
                1
              )}
              %)
            </Descriptions.Item>
            <Descriptions.Item label="最后心跳" span={2}>
              {selectedNode.lastHeartbeat
                ? dayjs(selectedNode.lastHeartbeat).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间" span={2}>
              {dayjs(selectedNode.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    );
  }
);

NodeDetailModal.displayName = 'NodeDetailModal';
