import { memo } from 'react';
import { Modal, Descriptions, Tag, Badge } from 'antd';
import dayjs from 'dayjs';
import type { ApiKey } from '@/types';
import { getStatusColor, getStatusLabel, getStatusIcon, getMaskedKey } from './apiKeyUtils';

interface ApiKeyDetailModalProps {
  visible: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
}

export const ApiKeyDetailModal = memo<ApiKeyDetailModalProps>(({
  visible,
  apiKey,
  onClose,
}) => {
  if (!apiKey) return null;

  return (
    <Modal
      title="API密钥详情"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="ID" span={2}>
          {apiKey.id}
        </Descriptions.Item>

        <Descriptions.Item label="名称">
          {apiKey.name}
        </Descriptions.Item>

        <Descriptions.Item label="状态">
          <Badge
            status={
              apiKey.status === 'active' ? 'success' :
              apiKey.status === 'revoked' ? 'error' : 'default'
            }
            text={
              <Tag color={getStatusColor(apiKey.status)} icon={getStatusIcon(apiKey.status)}>
                {getStatusLabel(apiKey.status)}
              </Tag>
            }
          />
        </Descriptions.Item>

        <Descriptions.Item label="前缀">
          {apiKey.prefix}
        </Descriptions.Item>

        <Descriptions.Item label="密钥（隐藏）">
          {getMaskedKey(apiKey)}
        </Descriptions.Item>

        <Descriptions.Item label="用户ID" span={2}>
          {apiKey.userId}
        </Descriptions.Item>

        <Descriptions.Item label="权限范围" span={2}>
          {apiKey.scopes.map((scope) => (
            <Tag key={scope} color="blue" style={{ marginBottom: 4 }}>
              {scope}
            </Tag>
          ))}
        </Descriptions.Item>

        <Descriptions.Item label="描述" span={2}>
          {apiKey.description || '-'}
        </Descriptions.Item>

        <Descriptions.Item label="使用次数">
          {apiKey.usageCount}
        </Descriptions.Item>

        <Descriptions.Item label="最后使用时间">
          {apiKey.lastUsedAt ? dayjs(apiKey.lastUsedAt).format('YYYY-MM-DD HH:mm:ss') : '从未使用'}
        </Descriptions.Item>

        <Descriptions.Item label="创建时间">
          {dayjs(apiKey.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>

        <Descriptions.Item label="过期时间">
          {apiKey.expiresAt ? dayjs(apiKey.expiresAt).format('YYYY-MM-DD HH:mm:ss') : '永不过期'}
        </Descriptions.Item>

        {apiKey.revokedAt && (
          <Descriptions.Item label="撤销时间" span={2}>
            {dayjs(apiKey.revokedAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        )}

        {apiKey.revokedBy && (
          <Descriptions.Item label="撤销者" span={2}>
            {apiKey.revokedBy}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Modal>
  );
});

ApiKeyDetailModal.displayName = 'ApiKeyDetailModal';
