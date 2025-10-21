import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Empty,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import CreateTicketModal from '@/components/CreateTicketModal';
import {
  getTickets,
  getTicketStats,
  TicketType,
  TicketPriority,
  TicketStatus,
  type Ticket,
  type TicketListQuery,
  type TicketStats,
} from '@/services/ticket';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Option } = Select;
const { Search } = Input;

// 工单类型配置
const ticketTypeConfig = {
  [TicketType.TECHNICAL]: { label: '技术问题', color: 'blue' },
  [TicketType.BILLING]: { label: '账单问题', color: 'orange' },
  [TicketType.DEVICE]: { label: '设备问题', color: 'purple' },
  [TicketType.APP]: { label: '应用问题', color: 'cyan' },
  [TicketType.FEATURE]: { label: '功能建议', color: 'green' },
  [TicketType.OTHER]: { label: '其他', color: 'default' },
};

// 优先级配置
const priorityConfig = {
  [TicketPriority.LOW]: { label: '低', color: 'default' },
  [TicketPriority.MEDIUM]: { label: '中', color: 'blue' },
  [TicketPriority.HIGH]: { label: '高', color: 'orange' },
  [TicketPriority.URGENT]: { label: '紧急', color: 'red' },
};

// 状态配置
const statusConfig = {
  [TicketStatus.OPEN]: { label: '待处理', color: 'warning', icon: <ClockCircleOutlined /> },
  [TicketStatus.IN_PROGRESS]: { label: '处理中', color: 'processing', icon: <SyncOutlined spin /> },
  [TicketStatus.WAITING]: { label: '等待回复', color: 'default', icon: <ClockCircleOutlined /> },
  [TicketStatus.RESOLVED]: { label: '已解决', color: 'success', icon: <CheckCircleOutlined /> },
  [TicketStatus.CLOSED]: { label: '已关闭', color: 'default', icon: <CloseCircleOutlined /> },
};

const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // 查询参数
  const [query, setQuery] = useState<TicketListQuery>({
    page: 1,
    pageSize: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // 加载工单列表
  const loadTickets = async () => {
    setLoading(true);
    try {
      const response = await getTickets(query);
      setTickets(response.items);
      setTotal(response.total);
    } catch (error: any) {
      message.error(error.message || '加载工单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const statsData = await getTicketStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    loadTickets();
    loadStats();
  }, [query]);

  // 处理搜索
  const handleSearch = (keyword: string) => {
    setQuery({ ...query, keyword, page: 1 });
  };

  // 处理筛选
  const handleFilterChange = (key: keyof TicketListQuery, value: any) => {
    setQuery({ ...query, [key]: value, page: 1 });
  };

  // 处理分页
  const handlePageChange = (page: number, pageSize?: number) => {
    setQuery({ ...query, page, pageSize: pageSize || query.pageSize });
  };

  // 处理刷新
  const handleRefresh = () => {
    loadTickets();
    loadStats();
  };

  // 处理创建成功
  const handleCreateSuccess = () => {
    setCreateModalVisible(false);
    handleRefresh();
  };

  // 跳转到详情页
  const goToDetail = (ticketId: string) => {
    navigate(`/tickets/${ticketId}`);
  };

  // 表格列定义
  const columns: ColumnsType<Ticket> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id: string) => (
        <Button
          type="link"
          onClick={() => goToDetail(id)}
          style={{ padding: 0, fontFamily: 'monospace' }}
        >
          #{id.slice(0, 8)}
        </Button>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: Ticket) => (
        <Tooltip title={title}>
          <a onClick={() => goToDetail(record.id)}>{title}</a>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: TicketType) => (
        <Tag color={ticketTypeConfig[type]?.color}>
          {ticketTypeConfig[type]?.label}
        </Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: TicketPriority) => (
        <Tag color={priorityConfig[priority]?.color}>
          {priorityConfig[priority]?.label}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TicketStatus) => (
        <Tag
          icon={statusConfig[status]?.icon}
          color={statusConfig[status]?.color}
        >
          {statusConfig[status]?.label}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (createdAt: string) => (
        <Tooltip title={dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss')}>
          {dayjs(createdAt).fromNow()}
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record: Ticket) => (
        <Button
          type="link"
          onClick={() => goToDetail(record.id)}
        >
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="全部工单"
                value={stats.total}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="待处理"
                value={stats.open}
                valueStyle={{ color: '#faad14' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="处理中"
                value={stats.inProgress}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SyncOutlined spin />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主卡片 */}
      <Card
        title="我的工单"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新建工单
            </Button>
          </Space>
        }
      >
        {/* 筛选器 */}
        <Space style={{ marginBottom: '16px' }} wrap>
          <Search
            placeholder="搜索工单标题或ID"
            allowClear
            style={{ width: 250 }}
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
          />

          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={query.status}
            onChange={(value) => handleFilterChange('status', value)}
          >
            {Object.entries(statusConfig).map(([key, config]) => (
              <Option key={key} value={key}>
                {config.label}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="类型"
            allowClear
            style={{ width: 120 }}
            value={query.type}
            onChange={(value) => handleFilterChange('type', value)}
          >
            {Object.entries(ticketTypeConfig).map(([key, config]) => (
              <Option key={key} value={key}>
                {config.label}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="优先级"
            allowClear
            style={{ width: 100 }}
            value={query.priority}
            onChange={(value) => handleFilterChange('priority', value)}
          >
            {Object.entries(priorityConfig).map(([key, config]) => (
              <Option key={key} value={key}>
                {config.label}
              </Option>
            ))}
          </Select>
        </Space>

        {/* 工单列表 */}
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
          }}
          locale={{
            emptyText: (
              <Empty
                description="暂无工单"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                >
                  创建第一个工单
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      {/* 创建工单 Modal */}
      <CreateTicketModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default TicketList;
