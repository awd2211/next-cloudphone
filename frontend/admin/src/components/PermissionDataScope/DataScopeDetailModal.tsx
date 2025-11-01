import { memo } from 'react';
import { Modal, Button, Descriptions, Tag } from 'antd';
import type { Role } from '@/types';
import type { DataScope, ScopeType } from '@/hooks/useDataScope';
import { resourceTypes } from './constants';
import dayjs from 'dayjs';

interface DataScopeDetailModalProps {
  visible: boolean;
  viewingScope: DataScope | null;
  roles: Role[];
  scopeTypes: Array<{ value: ScopeType; label: string }>;
  getScopeDescription: (scope: DataScope) => string;
  onClose: () => void;
}

export const DataScopeDetailModal = memo<DataScopeDetailModalProps>(
  ({ visible, viewingScope, roles, scopeTypes, getScopeDescription, onClose }) => {
    return (
      <Modal
        title="数据范围配置详情"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {viewingScope && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="角色">
              {roles.find((r) => r.id === viewingScope.roleId)?.name || viewingScope.roleId}
            </Descriptions.Item>
            <Descriptions.Item label="资源类型">
              {resourceTypes.find((r) => r.value === viewingScope.resourceType)?.label ||
                viewingScope.resourceType}
            </Descriptions.Item>
            <Descriptions.Item label="范围类型">
              <Tag color="green">
                {scopeTypes.find((s) => s.value === viewingScope.scopeType)?.label ||
                  viewingScope.scopeType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="范围描述">
              {getScopeDescription(viewingScope)}
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{viewingScope.priority}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={viewingScope.isActive ? 'green' : 'red'}>
                {viewingScope.isActive ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            {viewingScope.departmentIds && viewingScope.departmentIds.length > 0 && (
              <Descriptions.Item label="部门ID列表">
                {viewingScope.departmentIds.join(', ')}
              </Descriptions.Item>
            )}
            {viewingScope.filter && (
              <Descriptions.Item label="自定义过滤器">
                <pre style={{ margin: 0, fontSize: 12 }}>
                  {JSON.stringify(viewingScope.filter, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="描述">{viewingScope.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {viewingScope.createdAt
                ? dayjs(viewingScope.createdAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {viewingScope.updatedAt
                ? dayjs(viewingScope.updatedAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    );
  }
);

DataScopeDetailModal.displayName = 'DataScopeDetailModal';
