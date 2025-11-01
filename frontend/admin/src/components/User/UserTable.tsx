import { memo, useMemo } from 'react';
import { Table } from 'antd';
import type { ColumnsType, TableRowSelection } from 'antd/es/table';
import type { User } from '@/types';
import dayjs from 'dayjs';
import {
  UserActions,
  UserStatusTag,
  UserRolesTags,
  UserEmailCell,
  BalanceDisplay,
} from './index';

interface UserTableProps {
  users: User[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  selectedRowKeys: string[];
  visibleEmails: Set<string>;
  onPageChange: (page: number, pageSize: number) => void;
  onSelectionChange: (keys: string[]) => void;
  onEdit: (user: User) => void;
  onResetPassword: (user: User) => void;
  onRecharge: (user: User) => void;
  onDeduct: (user: User) => void;
  onUpdateStatus: (id: string, status: 'active' | 'inactive' | 'banned') => void;
  onDelete: (id: string) => void;
  onToggleEmailVisibility: (userId: string) => void;
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
    onPageChange,
    onSelectionChange,
    onEdit,
    onResetPassword,
    onRecharge,
    onDeduct,
    onUpdateStatus,
    onDelete,
    onToggleEmailVisibility,
  }) => {
    // 表格行选择配置
    const rowSelection: TableRowSelection<User> = useMemo(
      () => ({
        selectedRowKeys,
        onChange: (keys) => onSelectionChange(keys as string[]),
      }),
      [selectedRowKeys, onSelectionChange]
    );

    // 表格列配置
    const columns: ColumnsType<User> = useMemo(
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
          sorter: (a, b) => a.username.localeCompare(b.username),
        },
        {
          title: '邮箱',
          dataIndex: 'email',
          key: 'email',
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
        {
          title: '创建时间',
          dataIndex: 'createdAt',
          key: 'createdAt',
          sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
        },
        {
          title: '操作',
          key: 'action',
          width: 250,
          fixed: 'right',
          render: (_, record) => (
            <UserActions
              user={record}
              onEdit={onEdit}
              onResetPassword={onResetPassword}
              onRecharge={onRecharge}
              onDeduct={onDeduct}
              onUpdateStatus={onUpdateStatus}
              onDelete={onDelete}
            />
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
      ]
    );

    return (
      <Table
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
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1200 }}
      />
    );
  }
);

UserTable.displayName = 'UserTable';
