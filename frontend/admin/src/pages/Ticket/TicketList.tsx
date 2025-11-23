import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Button, Space, Tag, Select, Input, Row, Col, Statistic, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  ReloadOutlined,
  SearchOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useTickets } from '@/hooks/queries/useTickets';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '@/types';

const { Option } = Select;

const TicketListPage: React.FC = () => {
  const navigate = useNavigate();

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | undefined>();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | undefined>();

  // 快捷搜索状态
  const [quickSearchVisible, setQuickSearchVisible] = useState(false);
  const [quickSearchValue, setQuickSearchValue] = useState('');

  // 使用新的 React Query Hooks
  const { data, isLoading, error, refetch } = useTickets({
    page,
    limit: pageSize,
    status: statusFilter as any,
    priority: priorityFilter as any,
    // category: categoryFilter as any,  // Not supported in API
  });

  const tickets = data?.data || [];
  const total = data?.total || 0;

  // 统计计算
  const stats = useMemo(() => {
    const openCount = tickets.filter((t: any) => t.status === 'open').length;
    const inProgressCount = tickets.filter((t: any) => t.status === 'in_progress').length;
    const resolvedCount = tickets.filter(
      (t: any) => t.status === 'resolved' || t.status === 'closed'
    ).length;
    const urgentCount = tickets.filter(
      (t: any) => t.priority === 'urgent' || t.priority === 'high'
    ).length;
    return { total, openCount, inProgressCount, resolvedCount, urgentCount };
  }, [tickets, total]);

  // 导航处理函数
  const handleViewDetail = useCallback(
    (ticket: Ticket) => {
      navigate(`/tickets/${ticket.id}`);
    },
    [navigate]
  );

  // 客户端搜索过滤（仅对当前页）
  const filteredTickets = useMemo(() => {
    if (!searchText) return tickets;
    return tickets.filter(
      (ticket: any) =>
        ticket.subject?.toLowerCase().includes(searchText.toLowerCase()) ||
        ticket.ticketNumber?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [tickets, searchText]);

  // 快速搜索处理
  const handleQuickSearch = useCallback((value: string) => {
    setQuickSearchValue('');
    setQuickSearchVisible(false);
    if (value.trim()) {
      setSearchText(value.trim());
    }
  }, []);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setQuickSearchVisible(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetch();
        message.info('正在刷新...');
      }
      if (e.key === 'Escape' && quickSearchVisible) {
        setQuickSearchVisible(false);
        setQuickSearchValue('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickSearchVisible, refetch]);

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
        sorter: (a, b) => (a.ticketNo || '').localeCompare(b.ticketNo || ''),
      },
      {
        title: '主题',
        dataIndex: 'subject',
        key: 'subject',
        width: 250,
        ellipsis: true,
        sorter: (a, b) => (a.subject || '').localeCompare(b.subject || ''),
      },
      {
        title: '类别',
        dataIndex: 'category',
        key: 'category',
        width: 120,
        sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
        filters: [
          { text: '技术问题', value: 'technical' },
          { text: '账单问题', value: 'billing' },
          { text: '功能请求', value: 'feature_request' },
          { text: 'Bug反馈', value: 'bug_report' },
          { text: '其他', value: 'other' },
        ],
        onFilter: (value, record) => record.category === value,
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
        sorter: (a, b) => {
          const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
        },
        filters: [
          { text: '紧急', value: 'urgent' },
          { text: '高', value: 'high' },
          { text: '中', value: 'medium' },
          { text: '低', value: 'low' },
        ],
        onFilter: (value, record) => record.priority === value,
        render: renderPriorityTag,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
        filters: [
          { text: '待处理', value: 'open' },
          { text: '处理中', value: 'in_progress' },
          { text: '等待用户', value: 'waiting_customer' },
          { text: '已解决', value: 'resolved' },
          { text: '已关闭', value: 'closed' },
        ],
        onFilter: (value, record) => record.status === value,
        render: renderStatusTag,
      },
      {
        title: '创建人',
        dataIndex: ['user', 'username'],
        key: 'userName',
        width: 120,
        sorter: (a, b) => (a.user?.username || '').localeCompare(b.user?.username || ''),
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        defaultSortOrder: 'descend',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '更新时间',
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        width: 160,
        sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
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
    <ErrorBoundary boundaryName="TicketList">
      <div style={{ padding: '24px' }}>
        <Card>
          {/* 页面标题 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2 style={{ marginBottom: 0 }}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              工单管理
              <Tag
                icon={<ReloadOutlined spin={isLoading} />}
                color="processing"
                style={{ marginLeft: 12, cursor: 'pointer' }}
                onClick={() => refetch()}
              >
                Ctrl+R 刷新
              </Tag>
            </h2>
            <span style={{ fontSize: 12, color: '#999' }}>Ctrl+K 搜索</span>
          </div>

          {/* 统计卡片 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic title="工单总数" value={stats.total} prefix={<FileTextOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="待处理"
                  value={stats.openCount}
                  valueStyle={{ color: '#1890ff' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="紧急/高优先级"
                  value={stats.urgentCount}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="已解决"
                  value={stats.resolvedCount}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

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
          </Space>

          {/* 数据表格 */}
          <LoadingState
            loading={isLoading}
            error={error}
            empty={!isLoading && !error && filteredTickets.length === 0}
            onRetry={refetch}
            loadingType="skeleton"
            skeletonRows={5}
            emptyDescription="暂无工单数据"
          >
            <AccessibleTable<Ticket>
              ariaLabel="工单列表"
              loadingText="正在加载工单列表"
              emptyText="暂无工单数据"
              columns={columns}
              dataSource={filteredTickets as any}
              rowKey="id"
              loading={false}
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
          </LoadingState>
        </Card>

        {/* 快速搜索弹窗 */}
        <Modal
          open={quickSearchVisible}
          title="快速搜索工单"
          footer={null}
          onCancel={() => {
            setQuickSearchVisible(false);
            setQuickSearchValue('');
          }}
          destroyOnClose
        >
          <Input
            placeholder="输入工单号或主题进行搜索..."
            prefix={<SearchOutlined />}
            value={quickSearchValue}
            onChange={(e) => setQuickSearchValue(e.target.value)}
            onPressEnter={(e) => handleQuickSearch((e.target as HTMLInputElement).value)}
            autoFocus
            allowClear
          />
          <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
            按 Enter 搜索，按 Escape 关闭
          </div>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(TicketListPage);
