import { memo } from 'react';
import { Modal, Descriptions, Tag, Space, Button } from 'antd';
import type { FieldPermission, OperationType } from '@/types';

interface FieldPermissionDetailModalProps {
  visible: boolean;
  detailPermission: FieldPermission | null;
  operationTypes: Array<{ value: OperationType; label: string }>;
  getOperationColor: (operation: OperationType) => string;
  getOperationLabel: (operation: OperationType) => string;
  onClose: () => void;
}

export const FieldPermissionDetailModal = memo<FieldPermissionDetailModalProps>(({
  visible,
  detailPermission,
  operationTypes,
  getOperationColor,
  getOperationLabel,
  onClose,
}) => {
  if (!detailPermission) return null;

  return (
    <Modal
      title="字段权限详情"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={800}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="ID" span={2}>
          {detailPermission.id}
        </Descriptions.Item>
        <Descriptions.Item label="角色ID">{detailPermission.roleId}</Descriptions.Item>
        <Descriptions.Item label="资源类型">{detailPermission.resourceType}</Descriptions.Item>
        <Descriptions.Item label="操作类型">
          <Tag color={getOperationColor(detailPermission.operation)}>
            {getOperationLabel(detailPermission.operation)}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="优先级">{detailPermission.priority}</Descriptions.Item>
        <Descriptions.Item label="状态" span={2}>
          <Tag color={detailPermission.isActive ? 'success' : 'error'}>
            {detailPermission.isActive ? '启用' : '禁用'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="隐藏字段" span={2}>
          {detailPermission.hiddenFields?.length ? (
            <Space wrap>
              {detailPermission.hiddenFields.map((field) => (
                <Tag key={field} color="red">
                  {field}
                </Tag>
              ))}
            </Space>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="只读字段" span={2}>
          {detailPermission.readOnlyFields?.length ? (
            <Space wrap>
              {detailPermission.readOnlyFields.map((field) => (
                <Tag key={field} color="orange">
                  {field}
                </Tag>
              ))}
            </Space>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="可写字段" span={2}>
          {detailPermission.writableFields?.length ? (
            <Space wrap>
              {detailPermission.writableFields.map((field) => (
                <Tag key={field} color="blue">
                  {field}
                </Tag>
              ))}
            </Space>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="必填字段" span={2}>
          {detailPermission.requiredFields?.length ? (
            <Space wrap>
              {detailPermission.requiredFields.map((field) => (
                <Tag key={field} color="purple">
                  {field}
                </Tag>
              ))}
            </Space>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
        </Descriptions.Item>
        {detailPermission.fieldAccessMap &&
          Object.keys(detailPermission.fieldAccessMap).length > 0 && (
            <Descriptions.Item label="字段访问映射" span={2}>
              <Space wrap>
                {Object.entries(detailPermission.fieldAccessMap).map(([field, level]) => (
                  <Tag key={field} color="cyan">
                    {field}: {level}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        {detailPermission.fieldTransforms &&
          Object.keys(detailPermission.fieldTransforms).length > 0 && (
            <Descriptions.Item label="字段转换规则" span={2}>
              <Space direction="vertical">
                {Object.entries(detailPermission.fieldTransforms).map(([field, transform]) => (
                  <div key={field}>
                    <Tag color="geekblue">{field}</Tag>
                    <span>类型: {transform.type}</span>
                  </div>
                ))}
              </Space>
            </Descriptions.Item>
          )}
        <Descriptions.Item label="描述" span={2}>
          {detailPermission.description || <span style={{ color: '#999' }}>无</span>}
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {new Date(detailPermission.createdAt).toLocaleString('zh-CN')}
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">
          {new Date(detailPermission.updatedAt).toLocaleString('zh-CN')}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
});

FieldPermissionDetailModal.displayName = 'FieldPermissionDetailModal';
