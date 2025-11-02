import React from 'react';
import { Modal, Descriptions, Button, Tag, Space } from 'antd';
import { ThunderboltOutlined, StarFilled } from '@ant-design/icons';
import {
  type DeviceTemplate,
  formatMemoryMB,
  formatDateTime,
} from '@/utils/templateConfig';

interface TemplateDetailModalProps {
  visible: boolean;
  template: DeviceTemplate | null;
  onUseTemplate: () => void;
  onClose: () => void;
}

/**
 * 模板详情弹窗组件
 *
 * 优化点:
 * - 使用 React.memo 优化
 * - 配置驱动（格式化函数）
 * - Descriptions 布局展示详细信息
 */
export const TemplateDetailModal: React.FC<TemplateDetailModalProps> = React.memo(
  ({ visible, template, onUseTemplate, onClose }) => {
    return (
      <Modal
        title="模板详情"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
          <Button
            key="use"
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => {
              onClose();
              onUseTemplate();
            }}
          >
            使用此模板
          </Button>,
        ]}
        width={700}
      >
        {template && (
          <Descriptions column={2} bordered>
            {/* 模板名称 */}
            <Descriptions.Item label="模板名称" span={2}>
              <Space>
                {template.name}
                {template.isSystem && <Tag color="blue">系统模板</Tag>}
                {template.isFavorite && <StarFilled style={{ color: '#faad14' }} />}
              </Space>
            </Descriptions.Item>

            {/* 描述 */}
            <Descriptions.Item label="描述" span={2}>
              {template.description || '-'}
            </Descriptions.Item>

            {/* Android版本 */}
            <Descriptions.Item label="Android版本">
              <Tag color="green">Android {template.androidVersion}</Tag>
            </Descriptions.Item>

            {/* CPU核心数 */}
            <Descriptions.Item label="CPU核心数">
              {template.cpuCores}核
            </Descriptions.Item>

            {/* 内存大小 */}
            <Descriptions.Item label="内存大小">
              {formatMemoryMB(template.memoryMB)}
            </Descriptions.Item>

            {/* 存储空间 */}
            <Descriptions.Item label="存储空间">
              {template.diskGB}GB
            </Descriptions.Item>

            {/* 屏幕分辨率 */}
            <Descriptions.Item label="屏幕分辨率">
              {template.resolution}
            </Descriptions.Item>

            {/* 屏幕DPI */}
            <Descriptions.Item label="屏幕DPI">
              {template.dpi}
            </Descriptions.Item>

            {/* 使用次数 */}
            <Descriptions.Item label="使用次数">
              {template.usageCount}次
            </Descriptions.Item>

            {/* 创建时间 */}
            <Descriptions.Item label="创建时间">
              {formatDateTime(template.createdAt)}
            </Descriptions.Item>

            {/* 创建者 */}
            {template.createdBy && (
              <Descriptions.Item label="创建者" span={2}>
                {template.createdBy}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    );
  }
);

TemplateDetailModal.displayName = 'TemplateDetailModal';
