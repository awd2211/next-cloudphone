import React, { useMemo, useState } from 'react';
import { Table, Space, Button, Popconfirm, Tag, Switch } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { FieldPermission, OperationType } from '@/types';
import { getOperationColor, getOperationLabel } from './fieldPermissionUtils';
import { ColumnVisibilityControl, type ColumnConfig } from './ColumnVisibilityControl';

interface FieldPermissionTableProps {
  permissions: FieldPermission[];
  loading: boolean;
  total: number; // ✅ 添加总数
  page: number; // ✅ 添加当前页
  pageSize: number; // ✅ 添加每页大小
  onPageChange: (page: number, pageSize: number) => void; // ✅ 添加分页回调
  operationTypes?: Array<{ value: OperationType; label: string }>;
  onEdit: (record: FieldPermission) => void;
  onDelete: (id: string) => void;
  onToggle: (record: FieldPermission) => void;
  onViewDetail: (record: FieldPermission) => void;
}

export const FieldPermissionTable: React.FC<FieldPermissionTableProps> = React.memo(
  ({ permissions, loading, total, page, pageSize, onPageChange, operationTypes, onEdit, onDelete, onToggle, onViewDetail }) => {
    // ✅ 列可见性状态（默认隐藏部分非关键列）
    const [columnVisibility, setColumnVisibility] = useState<ColumnConfig[]>([
      { key: 'id', label: 'ID', visible: false },
      { key: 'roleId', label: '角色ID', visible: true },
      { key: 'resourceType', label: '资源类型', visible: true },
      { key: 'operation', label: '操作类型', visible: true },
      { key: 'hiddenFields', label: '隐藏字段', visible: true },
      { key: 'readOnlyFields', label: '只读字段', visible: false },
      { key: 'writableFields', label: '可写字段', visible: false },
      { key: 'requiredFields', label: '必填字段', visible: false },
      { key: 'priority', label: '优先级', visible: true },
      { key: 'isActive', label: '状态', visible: true },
      { key: 'action', label: '操作', visible: true, required: true },
    ]);

    const allColumns: ColumnsType<FieldPermission> = useMemo(
      () => [
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 100,
          ellipsis: true,
        },
        {
          title: '角色ID',
          dataIndex: 'roleId',
          key: 'roleId',
          width: 120,
          ellipsis: true,
          sorter: (a: FieldPermission, b: FieldPermission) => a.roleId.localeCompare(b.roleId),
        },
        {
          title: '资源类型',
          dataIndex: 'resourceType',
          key: 'resourceType',
          width: 120,
          sorter: (a: FieldPermission, b: FieldPermission) =>
            a.resourceType.localeCompare(b.resourceType),
        },
        {
          title: '操作类型',
          dataIndex: 'operation',
          key: 'operation',
          width: 100,
          sorter: (a: FieldPermission, b: FieldPermission) => a.operation.localeCompare(b.operation),
          render: (operation: OperationType) => (
            <Tag color={getOperationColor(operation)}>
              {getOperationLabel(operation, operationTypes)}
            </Tag>
          ),
        },
        {
          title: '隐藏字段',
          dataIndex: 'hiddenFields',
          key: 'hiddenFields',
          width: 150,
          sorter: (a: FieldPermission, b: FieldPermission) =>
            (a.hiddenFields?.length || 0) - (b.hiddenFields?.length || 0),
          render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
        },
        {
          title: '只读字段',
          dataIndex: 'readOnlyFields',
          key: 'readOnlyFields',
          width: 150,
          sorter: (a: FieldPermission, b: FieldPermission) =>
            (a.readOnlyFields?.length || 0) - (b.readOnlyFields?.length || 0),
          render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
        },
        {
          title: '可写字段',
          dataIndex: 'writableFields',
          key: 'writableFields',
          width: 150,
          sorter: (a: FieldPermission, b: FieldPermission) =>
            (a.writableFields?.length || 0) - (b.writableFields?.length || 0),
          render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
        },
        {
          title: '必填字段',
          dataIndex: 'requiredFields',
          key: 'requiredFields',
          width: 150,
          sorter: (a: FieldPermission, b: FieldPermission) =>
            (a.requiredFields?.length || 0) - (b.requiredFields?.length || 0),
          render: (fields?: string[]) => <span>{fields?.length || 0} 个</span>,
        },
        {
          title: '优先级',
          dataIndex: 'priority',
          key: 'priority',
          width: 80,
          sorter: (a: FieldPermission, b: FieldPermission) => a.priority - b.priority,
        },
        {
          title: '状态',
          dataIndex: 'isActive',
          key: 'isActive',
          width: 80,
          render: (isActive: boolean, record: FieldPermission) => (
            <Switch
              checked={isActive}
              onChange={() => onToggle(record)}
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          ),
        },
        {
          title: '操作',
          key: 'action',
          width: 200,
          fixed: 'right' as const,
          render: (_: any, record: FieldPermission) => (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<EyeOutlined />}
                onClick={() => onViewDetail(record)}
              >
                详情
              </Button>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除此配置吗?"
                onConfirm={() => onDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          ),
        },
      ],
      [operationTypes, onEdit, onDelete, onToggle, onViewDetail]
    );

    // ✅ 创建列key到列定义的映射
    const columnMap = useMemo(() => {
      const map: Record<string, any> = {};
      allColumns.forEach((col: any) => {
        if (col.key) {
          map[col.key] = col;
        }
      });
      return map;
    }, [allColumns]);

    // ✅ 根据可见性筛选列
    const visibleColumns = useMemo(() => {
      return columnVisibility
        .filter((config) => config.visible)
        .map((config) => columnMap[config.key])
        .filter(Boolean);
    }, [columnVisibility, columnMap]);

    return (
      <div>
        {/* ✅ 列可见性控制 */}
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <ColumnVisibilityControl
            columns={columnVisibility}
            onChange={setColumnVisibility}
          />
        </div>

        {/* ✅ 表格 */}
        <Table
          columns={visibleColumns}
          dataSource={permissions}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: onPageChange,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </div>
    );
  }
);

FieldPermissionTable.displayName = 'FieldPermissionTable';
