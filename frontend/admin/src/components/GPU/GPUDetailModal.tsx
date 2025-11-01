import { memo } from 'react';
import { Modal, Descriptions } from 'antd';
import type { GPUDevice } from '@/services/gpu';
import { getStatusTag, getAllocationModeTag } from './utils';

export interface GPUDetailModalProps {
  visible: boolean;
  gpu: GPUDevice | null;
  onCancel: () => void;
}

/**
 * GPU 详情模态框组件
 */
export const GPUDetailModal = memo<GPUDetailModalProps>(({ visible, gpu, onCancel }) => {
  return (
    <Modal title="GPU 详情" open={visible} onCancel={onCancel} footer={null} width={700}>
      {gpu && (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="名称" span={2}>
            {gpu.name}
          </Descriptions.Item>
          <Descriptions.Item label="型号">{gpu.model}</Descriptions.Item>
          <Descriptions.Item label="厂商">{gpu.vendor}</Descriptions.Item>
          <Descriptions.Item label="驱动版本">{gpu.driverVersion}</Descriptions.Item>
          <Descriptions.Item label="CUDA 版本">{gpu.cudaVersion || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(gpu.status)}</Descriptions.Item>
          <Descriptions.Item label="节点">{gpu.nodeName}</Descriptions.Item>
          <Descriptions.Item label="显存容量">{gpu.totalMemoryMB} MB</Descriptions.Item>
          <Descriptions.Item label="已用显存">{gpu.memoryUsed} MB</Descriptions.Item>
          <Descriptions.Item label="使用率">{gpu.utilizationRate}%</Descriptions.Item>
          <Descriptions.Item label="温度">{gpu.temperature}°C</Descriptions.Item>
          <Descriptions.Item label="功耗">
            {gpu.powerUsage}W / {gpu.powerLimit}W
          </Descriptions.Item>
          <Descriptions.Item label="风扇转速">{gpu.fanSpeed}%</Descriptions.Item>
          <Descriptions.Item label="分配模式">
            {getAllocationModeTag(gpu.allocationMode)}
          </Descriptions.Item>
          <Descriptions.Item label="分配到">{gpu.allocatedTo || '未分配'}</Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
});

GPUDetailModal.displayName = 'GPUDetailModal';
