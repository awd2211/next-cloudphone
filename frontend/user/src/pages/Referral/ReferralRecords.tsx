import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Button,
  message,
  Tabs,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  LeftOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  getReferralRecords,
  getReferralStats,
  getEarningsDetail,
  type ReferralRecord,
  ReferralStatus,
} from '@/services/referral';
import WithdrawModal from '@/components/WithdrawModal';

const { TabPane } = Tabs;

const ReferralRecords = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ReferralRecord[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [activeTab, setActiveTab] = useState('records');
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    loadStats();
    if (activeTab === 'records') {
      loadRecords();
    } else if (activeTab === 'earnings') {
      loadEarnings();
    }
    message.success('数据已刷新');
  }, [activeTab]);

  // 快捷键支持：Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'records') {
      loadRecords();
    } else if (activeTab === 'earnings') {
      loadEarnings();
    }
  }, [activeTab, pagination.current]);

  const loadStats = async () => {
    try {
      const data = await getReferralStats();
      setStats(data);
    } catch (error: any) {
      message.error(error.message || '加载统计失败');
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const result = await getReferralRecords({
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setRecords(result.data);
      setPagination({ ...pagination, total: result.total });
    } catch (error: any) {
      message.error(error.message || '加载记录失败');
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const result = await getEarningsDetail({
        page: pagination.current,
        pageSize: pagination.pageSize,
      });
      setEarnings(result.data);
      setPagination({ ...pagination, total: result.total });
    } catch (error: any) {
      message.error(error.message || '加载收益失败');
    } finally {
      setLoading(false);
    }
  };

  const recordColumns = [
    {
      title: '被邀请人',
      dataIndex: 'refereeUsername',
      key: 'refereeUsername',
    },
    {
      title: '注册时间',
      dataIndex: 'registeredAt',
      key: 'registeredAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ReferralStatus) => {
        const config = {
          [ReferralStatus.PENDING]: {
            color: 'blue',
            text: '待确认',
            icon: <ClockCircleOutlined />,
          },
          [ReferralStatus.CONFIRMED]: {
            color: 'green',
            text: '已确认',
            icon: <CheckCircleOutlined />,
          },
          [ReferralStatus.REWARDED]: { color: 'success', text: '已奖励', icon: <GiftOutlined /> },
          [ReferralStatus.EXPIRED]: {
            color: 'default',
            text: '已过期',
            icon: <CloseCircleOutlined />,
          },
        };
        const { color, text, icon } = config[status];
        return (
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: '奖励金额',
      dataIndex: 'reward',
      key: 'reward',
      render: (amount: number) => (
        <span style={{ color: '#cf1322', fontWeight: 'bold' }}>¥{amount.toFixed(2)}</span>
      ),
    },
    {
      title: '奖励时间',
      dataIndex: 'rewardedAt',
      key: 'rewardedAt',
      render: (text: string) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
    },
  ];

  const earningsColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) =>
        ({
          invite: <Tag color="blue">邀请奖励</Tag>,
          bonus: <Tag color="orange">额外奖励</Tag>,
          other: <Tag>其他</Tag>,
        })[type],
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span style={{ color: '#cf1322', fontWeight: 'bold' }}>+¥{amount.toFixed(2)}</span>
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <ErrorBoundary>
      <div>
        <Button
          icon={<LeftOutlined />}
          onClick={() => navigate('/referral')}
          style={{ marginBottom: 16 }}
        >
          返回邀请中心
        </Button>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="累计邀请"
                value={stats?.totalInvites || 0}
                suffix="人"
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="成功邀请"
                value={stats?.confirmedInvites || 0}
                suffix="人"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="累计收益"
                value={stats?.totalRewards || 0}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="可提现余额"
                value={stats?.availableBalance || 0}
                prefix="¥"
                precision={2}
                valueStyle={{ color: '#faad14' }}
              />
              <Button
                type="primary"
                size="small"
                onClick={() => setWithdrawModalVisible(true)}
                style={{ marginTop: 8 }}
                disabled={(stats?.availableBalance || 0) <= 0}
              >
                申请提现
              </Button>
            </Card>
          </Col>
        </Row>

        {/* 记录列表 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="邀请记录" key="records">
              <Table
                columns={recordColumns}
                dataSource={records}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  onChange: (page) => setPagination({ ...pagination, current: page }),
                }}
              />
            </TabPane>
            <TabPane tab="收益明细" key="earnings">
              <Table
                columns={earningsColumns}
                dataSource={earnings}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  onChange: (page) => setPagination({ ...pagination, current: page }),
                }}
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* 提现 Modal */}
        <WithdrawModal
          visible={withdrawModalVisible}
          availableBalance={stats?.availableBalance || 0}
          onCancel={() => setWithdrawModalVisible(false)}
          onSuccess={() => {
            setWithdrawModalVisible(false);
            loadStats();
          }}
        />
      </div>
    </ErrorBoundary>
  );
};

export default ReferralRecords;
