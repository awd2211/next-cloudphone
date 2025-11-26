import { memo, useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { TableRowSelection } from 'antd/es/table/interface';
import type { User } from '@/types';
import { UserStatus } from '@/types';
import {
  UserActions,
  UserStatusTag,
  UserRolesTags,
  UserEmailCell,
  BalanceDisplay,
} from './index';
import { createTimeColumn } from '@/utils/tableColumns';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { Avatar, Space, Tooltip, Button } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

// 根据用户名生成头像颜色
const getAvatarColor = (username: string): string => {
  const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068', '#1890ff', '#722ed1', '#eb2f96'];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// 获取用户名首字母
const getInitials = (username: string): string => {
  return username.charAt(0).toUpperCase();
};

interface UserTableProps {
  users: User[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  selectedRowKeys: string[];
  visibleEmails: Set<string>;
  visibleColumns?: string[];
  onPageChange: (page: number, pageSize: number) => void;
  onSelectionChange: (keys: string[]) => void;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onRecharge: (user: User) => void;
  onDeduct: (user: User) => void;
  onUpdateStatus: (id: string, status: UserStatus) => void;
  onDelete: (id: string) => void;
  onToggleEmailVisibility: (userId: string) => void;
  onViewActivity?: (user: User) => void;
}

export const UserTable = memo<UserTableProps>(
  ({
    users,
    loading,
    page,
    pageSize,
    total,
    selectedRowKeys,
    visibleEmails,
    visibleColumns = ['id', 'username', 'email', 'phone', 'balance', 'roles', 'status', 'createdAt', 'action'],
    onPageChange,
    onSelectionChange,
    onEdit,
    onResetPassword,
    onRecharge,
    onDeduct,
    onUpdateStatus,
    onDelete,
    onToggleEmailVisibility,
    onViewActivity,
  }) => {
    // 表格行选择配置
    const rowSelection: TableRowSelection<User> = useMemo(
      () => ({
        selectedRowKeys,
        onChange: (keys) => onSelectionChange(keys as string[]),
      }),
      [selectedRowKeys, onSelectionChange]
    );

    // 所有可用列配置
    const allColumns: ColumnsType<User> = useMemo(
      () => [
        {
          title: '用户 ID',
          dataIndex: 'id',
          key: 'id',
          width: 100,
          ellipsis: true,
        },
        {
          title: '用户名',
          dataIndex: 'username',
          key: 'username',
          width: 140,
          sorter: (a, b) => a.username.localeCompare(b.username),
          render: (username: string) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Avatar
                size="small"
                style={{ backgroundColor: getAvatarColor(username), flexShrink: 0 }}
              >
                {getInitials(username)}
              </Avatar>
              <Tooltip title={username}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {username}
                </span>
              </Tooltip>
            </div>
          ),
        },
        {
          title: '邮箱',
          dataIndex: 'email',
          key: 'email',
          width: 200,
          ellipsis: true,
          sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
          render: (email: string, record: User) => (
            <UserEmailCell
              email={email}
              isVisible={visibleEmails.has(record.id)}
              onToggleVisibility={() => onToggleEmailVisibility(record.id)}
            />
          ),
        },
        {
          title: '手机号',
          dataIndex: 'phone',
          key: 'phone',
          width: 130,
          sorter: (a, b) => (a.phone || '').localeCompare(b.phone || ''),
        },
        {
          title: '余额',
          dataIndex: 'balance',
          key: 'balance',
          sorter: (a, b) => (a.balance || 0) - (b.balance || 0),
          render: (balance: number) => <BalanceDisplay balance={balance} />,
        },
        {
          title: '角色',
          dataIndex: 'roles',
          key: 'roles',
          render: (roles: any[]) => <UserRolesTags roles={roles} />,
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          sorter: (a, b) => a.status.localeCompare(b.status),
          render: (status: string) => <UserStatusTag status={status as any} />,
        },
        createTimeColumn('创建时间', 'createdAt'),
        {
          title: '操作',
          key: 'action',
          width: 280,
          fixed: 'right',
          render: (_, record) => (
            <Space size={0}>
              <UserActions
                user={record}
                onEdit={onEdit}
                onResetPassword={onResetPassword}
                onRecharge={onRecharge}
                onDeduct={onDeduct}
                onUpdateStatus={onUpdateStatus}
                onDelete={onDelete}
              />
              {onViewActivity && (
                <Tooltip title="查看活动">
                  <Button
                    type="text"
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={() => onViewActivity(record)}
                  />
                </Tooltip>
              )}
            </Space>
          ),
        },
      ],
      [
        visibleEmails,
        onEdit,
        onResetPassword,
        onRecharge,
        onDeduct,
        onUpdateStatus,
        onDelete,
        onToggleEmailVisibility,
        onViewActivity,
      ]
    );

    // 根据 visibleColumns 过滤显示的列
    const columns = useMemo(
      () => allColumns.filter(col => visibleColumns.includes(col.key as string)),
      [allColumns, visibleColumns]
    );

    return (
      <AccessibleTable<User>
        ariaLabel="用户列表"
        loadingText="正在加载用户列表"
        emptyText="暂无用户数据，点击右上角创建用户"
        columnWidthsKey="user-table-column-widths"
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        rowSelection={rowSelection}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'], // 支持更大的页面大小
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1200, y: 600 }} // 固定高度启用虚拟滚动
        virtual // 启用虚拟滚动，大幅提升大数据集渲染性能
      />
    );
  }
);

UserTable.displayName = 'UserTable';
