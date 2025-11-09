import React, { useState, useMemo } from 'react';
import { Card, Button, Space, Tag, Select, Input } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTickets, useTicketList } from '@/hooks/useTicketList';
import type { Ticket } from '@/types';

const { Option } = Select;

const TicketListPage: React.FC = () => {
  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // 导航hooks
  const { handleViewDetail, handleCreateTicket } = useTicketList();

  // 查询数据
  const { data, isLoading, refetch } = useTickets({
    page,
    pageSize,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    category: categoryFilter || undefined,
  });

  const tickets = data?.tickets || [];
  const total = data?.total || 0;

  // 客户端搜索过滤（仅对当前页）
  const filteredTickets = useMemo(() => {
    if (!searchText) return tickets;
    return tickets.filter(
      (ticket) =>
        ticket.subject?.toLowerCase().includes(searchText.toLowerCase()) ||
        ticket.ticketNo?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [tickets, searchText]);

  /**
   * 分页变化处理
   */
  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  /**
   * 状态标签渲染
   */
  const renderStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      open: { color: 'blue', text: '待处理' },
      in_progress: { color: 'processing', text: '处理中' },
      waiting_customer: { color: 'warning', text: '等待用户' },
      resolved: { color: 'success', text: '已解决' },
      closed: { color: 'default', text: '已关闭' },
    };

    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  /**
   * 优先级标签渲染
   */
  const renderPriorityTag = (priority: string) => {
    const priorityMap: Record<string, { color: string; text: string }> = {
      urgent: { color: 'red', text: '紧急' },
      high: { color: 'orange', text: '高' },
      medium: { color: 'blue', text: '中' },
      low: { color: 'default', text: '低' },
    };

    const config = priorityMap[priority] || { color: 'default', text: priority };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  /**
   * 表格列定义
   */
  const columns: ColumnsType<Ticket> = useMemo(
    () => [
      {
        title: '工单号',
        dataIndex: 'ticketNo',
        key: 'ticketNo',
        width: 140,
        fixed: 'left',
      },
      {
        title: '主题',
        dataIndex: 'subject',
        key: 'subject',
        width: 250,
        ellipsis: true,
      },
      {
        title: '类别',
        dataIndex: 'category',
        key: 'category',
        width: 120,
        render: (category: string) => {
          const categoryMap: Record<string, string> = {
            technical: '技术问题',
            billing: '账单问题',
            feature_request: '功能请求',
            bug_report: 'Bug反馈',
            other: '其他',
          };
          return categoryMap[category] || category;
        },
      },
      {
        title: '优先级',
        dataIndex: 'priority',
        key: 'priority',
        width: 100,
        render: renderPriorityTag,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: renderStatusTag,
      },
      {
        title: '创建人',
        dataIndex: ['user', 'username'],
        key: 'userName',
        width: 120,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'action',
        fixed: 'right',
        width: 100,
        render: (_, record) => (
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            查看
          </Button>
        ),
      },
    ],
    [handleViewDetail]
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <h2>工单管理</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          管理和跟踪所有用户工单
        </p>

        {/* 筛选栏 */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索工单号、主题..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />

          <Select
            placeholder="类别筛选"
            value={categoryFilter || undefined}
            onChange={(value) => {
              setCategoryFilter(value || '');
              setPage(1);
            }}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="technical">技术问题</Option>
            <Option value="billing">账单问题</Option>
            <Option value="feature_request">功能请求</Option>
            <Option value="bug_report">Bug反馈</Option>
            <Option value="other">其他</Option>
          </Select>

          <Select
            placeholder="状态筛选"
            value={statusFilter || undefined}
            onChange={(value) => {
              setStatusFilter(value || '');
              setPage(1);
            }}
            style={{ width: 140 }}
            allowClear
          >
            <Option value="open">待处理</Option>
            <Option value="in_progress">处理中</Option>
            <Option value="waiting_customer">等待用户</Option>
            <Option value="resolved">已解决</Option>
            <Option value="closed">已关闭</Option>
          </Select>

          <Select
            placeholder="优先级筛选"
            value={priorityFilter || undefined}
            onChange={(value) => {
              setPriorityFilter(value || '');
              setPage(1);
            }}
            style={{ width: 120 }}
            allowClear
          >
            <Option value="urgent">紧急</Option>
            <Option value="high">高</Option>
            <Option value="medium">中</Option>
            <Option value="low">低</Option>
          </Select>

          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>

          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTicket}>
            创建工单
          </Button>
        </Space>

        {/* 数据表格 */}
        <AccessibleTable<Ticket>
          ariaLabel="工单列表"
          loadingText="正在加载工单列表"
          emptyText="暂无工单数据，点击右上角创建工单"
          columns={columns}
          dataSource={filteredTickets}
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

export default React.memo(TicketListPage);
