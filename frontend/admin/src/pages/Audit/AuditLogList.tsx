import React, { useState, useMemo } from 'react';
import { Card, Select, Input, Button, Space, Tag, Tooltip } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAuditLogs, useExportAuditLogs } from '@/hooks/queries';
import type { AuditLog } from '@/services/audit';

const { Option } = Select;

/**
 * 审计日志列表页面
 */
const AuditLogList: React.FC = () => {
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');

  // 查询数据
  const { data, isLoading, refetch } = useAuditLogs({
    page,
    pageSize,
    resourceType: resourceTypeFilter || undefined,
    status: statusFilter || undefined,
    method: methodFilter || undefined,
    search: searchText || undefined,
  });

  const logs = data?.data || [];
  const total = data?.total || 0;

  // 导出功能
  const exportMutation = useExportAuditLogs();

  /**
   * 分页变化处理
   */
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  /**
   * 重置筛选
   */
  const handleReset = () => {
    setSearchText('');
    setResourceTypeFilter('');
    setStatusFilter('');
    setMethodFilter('');
    setPage(1);
  };

  /**
   * 导出当前页面数据
   */
  const handleExport = async () => {
    try {
      await exportMutation.mutateAsync({
        resourceType: resourceTypeFilter || undefined,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
        search: searchText || undefined,
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  /**
   * 状态标签渲染
   */
  const renderStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      success: { color: 'success', text: '成功' },
      failed: { color: 'error', text: '失败' },
      warning: { color: 'warning', text: '警告' },
    };

    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  /**
   * 表格列定义
   */
  const columns: ColumnsType<AuditLog> = useMemo(
    () => [
      {
        title: '用户',
        dataIndex: 'userName',
        key: 'userName',
        width: 120,
        fixed: 'left',
        sorter: (a, b) => (a.userName || '').localeCompare(b.userName || ''),
      },
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        width: 150,
        sorter: (a, b) => (a.action || '').localeCompare(b.action || ''),
      },
      {
        title: '资源',
        dataIndex: 'resource',
        key: 'resource',
        width: 120,
        sorter: (a, b) => (a.resource || '').localeCompare(b.resource || ''),
      },
      {
        title: '资源类型',
        dataIndex: 'resourceType',
        key: 'resourceType',
        width: 110,
        sorter: (a, b) => (a.resourceType || '').localeCompare(b.resourceType || ''),
        filters: [
          { text: '用户', value: 'user' },
          { text: '设备', value: 'device' },
          { text: '套餐', value: 'plan' },
          { text: '配额', value: 'quota' },
          { text: '账单', value: 'billing' },
          { text: '工单', value: 'ticket' },
          { text: 'API密钥', value: 'apikey' },
          { text: '系统', value: 'system' },
        ],
        onFilter: (value, record) => record.resourceType === value,
        render: (type: string) => {
          const typeMap: Record<string, string> = {
            user: '用户',
            device: '设备',
            plan: '套餐',
            quota: '配额',
            billing: '账单',
            ticket: '工单',
            apikey: 'API密钥',
            system: '系统',
          };
          return typeMap[type] || type;
        },
      },
      {
        title: '方法',
        dataIndex: 'method',
        key: 'method',
        width: 80,
        sorter: (a, b) => (a.method || '').localeCompare(b.method || ''),
        filters: [
          { text: 'GET', value: 'GET' },
          { text: 'POST', value: 'POST' },
          { text: 'PUT', value: 'PUT' },
          { text: 'DELETE', value: 'DELETE' },
          { text: 'PATCH', value: 'PATCH' },
        ],
        onFilter: (value, record) => record.method === value,
        render: (method: string) => {
          const colorMap: Record<string, string> = {
            GET: 'blue',
            POST: 'green',
            PUT: 'orange',
            DELETE: 'red',
            PATCH: 'purple',
          };
          return <Tag color={colorMap[method] || 'default'}>{method}</Tag>;
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 80,
        sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
        filters: [
          { text: '成功', value: 'success' },
          { text: '失败', value: 'failed' },
          { text: '警告', value: 'warning' },
        ],
        onFilter: (value, record) => record.status === value,
        render: renderStatusTag,
      },
      {
        title: 'IP地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        width: 130,
        sorter: (a, b) => (a.ipAddress || '').localeCompare(b.ipAddress || ''),
      },
      {
        title: '详情',
        dataIndex: 'details',
        key: 'details',
        width: 200,
        ellipsis: {
          showTitle: false,
        },
        render: (details: string) =>
          details ? (
            <Tooltip placement="topLeft" title={details}>
              {details}
            </Tooltip>
          ) : (
            '-'
          ),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        defaultSortOrder: 'descend',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      },
    ],
    []
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <h2>审计日志</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          查看系统所有操作记录，支持按资源类型、状态、方法筛选
        </p>

        {/* 筛选栏 */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索用户名、操作、详情..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1); // 重置到第一页
            }}
            style={{ width: 240 }}
            allowClear
          />

          <Select
            placeholder="资源类型"
            value={resourceTypeFilter || undefined}
            onChange={(value) => {
              setResourceTypeFilter(value || '');
              setPage(1);
            }}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="user">用户</Option>
            <Option value="device">设备</Option>
            <Option value="plan">套餐</Option>
            <Option value="quota">配额</Option>
            <Option value="billing">账单</Option>
            <Option value="ticket">工单</Option>
            <Option value="apikey">API密钥</Option>
            <Option value="system">系统</Option>
          </Select>

          <Select
            placeholder="状态"
            value={statusFilter || undefined}
            onChange={(value) => {
              setStatusFilter(value || '');
              setPage(1);
            }}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="success">成功</Option>
            <Option value="failed">失败</Option>
            <Option value="warning">警告</Option>
          </Select>

          <Select
            placeholder="方法"
            value={methodFilter || undefined}
            onChange={(value) => {
              setMethodFilter(value || '');
              setPage(1);
            }}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="GET">GET</Option>
            <Option value="POST">POST</Option>
            <Option value="PUT">PUT</Option>
            <Option value="DELETE">DELETE</Option>
            <Option value="PATCH">PATCH</Option>
          </Select>

          <Button icon={<FilterOutlined />} onClick={handleReset}>
            重置
          </Button>

          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>

          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>
        </Space>

        {/* 数据表格 */}
        <AccessibleTable<AuditLog>
          ariaLabel="审计日志列表"
          loadingText="正在加载审计日志"
          emptyText="暂无审计日志数据"
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
          }}
          scroll={{ x: 1400, y: 600 }}
          virtual
        />
      </Card>
    </div>
  );
};

export default AuditLogList;
