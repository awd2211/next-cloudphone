import { memo } from 'react';
import { Modal, Descriptions, Tag } from 'antd';
import type { DataScope, ScopeType } from '@/types';
import { getScopeTypeColor } from './dataScopeUtils';
import dayjs from 'dayjs';

interface DataScopeDetailModalProps {
  visible: boolean;
  selectedScope: DataScope | null;
  scopeTypes: Array<{ value: ScopeType; label: string }>;
  onClose: () => void;
}

export const DataScopeDetailModal = memo<DataScopeDetailModalProps>(
  ({ visible, selectedScope, scopeTypes, onClose }) => {
    return (
      <Modal
        title="数据范围配置详情"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        {selectedScope && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="ID">{selectedScope.id}</Descriptions.Item>
            <Descriptions.Item label="角色ID">{selectedScope.roleId}</Descriptions.Item>
            <Descriptions.Item label="资源类型">{selectedScope.resourceType}</Descriptions.Item>
            <Descriptions.Item label="范围类型">
              <Tag color={getScopeTypeColor(selectedScope.scopeType)}>
                {scopeTypes.find((t) => t.value === selectedScope.scopeType)?.label ||
                  selectedScope.scopeType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="包含子部门">
              {selectedScope.includeSubDepartments ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{selectedScope.priority}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={selectedScope.isActive ? 'success' : 'default'}>
                {selectedScope.isActive ? '启用' : '禁用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="描述">{selectedScope.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedScope.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {dayjs(selectedScope.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            {selectedScope.filter && (
              <Descriptions.Item label="自定义过滤条件">
                <pre
                  style={{
                    maxHeight: '200px',
                    overflow: 'auto',
                    background: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    margin: 0,
                  }}
                >
                  {JSON.stringify(selectedScope.filter, null, 2)}
                </pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    );
  }
);

DataScopeDetailModal.displayName = 'DataScopeDetailModal';
