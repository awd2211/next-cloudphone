import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Input,
  DatePicker,
  Row,
  Col,
  Statistic,
  Modal,
  message,
  Tooltip,
  Empty,
  Popconfirm,
} from 'antd';
import {
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import {
  getBills,
  getBillStats,
  payBill,
  cancelBill,
  downloadBill,
  formatAmount,
  formatBillingCycle,
  BillType,
  BillStatus,
  BillingCycle,
  PaymentMethod,
  type Bill,
  type BillListQuery,
  type BillStats as BillStatsType,
} from '@/services/billing';
import { triggerDownload } from '@/services/export';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

// 账单类型配置
const billTypeConfig: Record<BillType, { label: string; color: string }> = {
  [BillType.SUBSCRIPTION]: { label: '订阅费', color: 'blue' },
  [BillType.USAGE]: { label: '使用费', color: 'cyan' },
  [BillType.RECHARGE]: { label: '充值', color: 'green' },
  [BillType.REFUND]: { label: '退款', color: 'orange' },
  [BillType.PENALTY]: { label: '违约金', color: 'red' },
  [BillType.DISCOUNT]: { label: '折扣', color: 'purple' },
  [BillType.COUPON]: { label: '优惠券', color: 'magenta' },
  [BillType.COMMISSION]: { label: '佣金', color: 'gold' },
};

// 状态配置
const statusConfig: Record<BillStatus, { label: string; color: string; icon: React.ReactNode }> = {
  [BillStatus.PENDING]: { label: '待支付', color: 'warning', icon: <ClockCircleOutlined /> },
  [BillStatus.PAID]: { label: '已支付', color: 'success', icon: <CheckCircleOutlined /> },
  [BillStatus.CANCELLED]: { label: '已取消', color: 'default', icon: <CloseCircleOutlined /> },
  [BillStatus.REFUNDED]: { label: '已退款', color: 'processing', icon: <CheckCircleOutlined /> },
  [BillStatus.OVERDUE]: { label: '已逾期', color: 'error', icon: <ExclamationCircleOutlined /> },
  [BillStatus.PARTIAL]: { label: '部分支付', color: 'warning', icon: <ClockCircleOutlined /> },
};

// 支付方式配置
const paymentMethodConfig: Record<PaymentMethod, { label: string; color: string }> = {
  [PaymentMethod.BALANCE]: { label: '余额支付', color: 'blue' },
  [PaymentMethod.ALIPAY]: { label: '支付宝', color: 'cyan' },
  [PaymentMethod.WECHAT]: { label: '微信支付', color: 'green' },
  [PaymentMethod.CREDIT_CARD]: { label: '信用卡', color: 'gold' },
  [PaymentMethod.PAYPAL]: { label: 'PayPal', color: 'geekblue' },
};

const BillList: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStatsType | null>(null);
  const [total, setTotal] = useState(0);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BALANCE);

  // 查询参数
  const [query, setQuery] = useState<BillListQuery>({
    page: 1,
    pageSize: 10,
  });

  // 加载账单列表
  const loadBills = async () => {
    setLoading(true);
    try {
      const response = await getBills(query);
      setBills(response.items);
      setTotal(response.total);
    } catch (error) {
      message.error('加载账单列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计
  const loadStats = async () => {
    try {
      const statsData = await getBillStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  useEffect(() => {
    loadBills();
    loadStats();
  }, [query]);

  // 筛选变化
  const handleFilterChange = (key: keyof BillListQuery, value: any) => {
    setQuery({ ...query, [key]: value, page: 1 });
  };

  // 日期范围变化
  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setQuery({
        ...query,
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD'),
        page: 1,
      });
    } else {
      setQuery({ ...query, startDate: undefined, endDate: undefined, page: 1 });
    }
  };

  // 支付账单
  const handlePay = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentModalVisible(true);
  };

  // 确认支付
  const handleConfirmPay = async () => {
    if (!selectedBill) return;

    try {
      const result = await payBill({
        billId: selectedBill.id,
        paymentMethod,
      });

      if (result.success) {
        if (result.redirectUrl) {
          // 跳转到第三方支付
          window.location.href = result.redirectUrl;
        } else {
          message.success('支付成功！');
          setPaymentModalVisible(false);
          loadBills();
          loadStats();
        }
      } else {
        message.error(result.message || '支付失败');
      }
    } catch (error) {
      message.error('支付失败');
    }
  };

  // 取消账单
  const handleCancel = async (id: string) => {
    try {
      await cancelBill(id);
      message.success('账单已取消');
      loadBills();
      loadStats();
    } catch (error) {
      message.error('取消失败');
    }
  };

  // 下载账单
  const handleDownload = async (bill: Bill) => {
    try {
      message.loading({ content: '正在下载...', key: 'download' });
      const blob = await downloadBill(bill.id);
      triggerDownload(blob, `账单-${bill.billNo}.pdf`);
      message.success({ content: '下载成功！', key: 'download' });
    } catch (error) {
      message.error({ content: '下载失败', key: 'download' });
    }
  };

  // 表格列
  const columns: ColumnsType<Bill> = [
    {
      title: '账单号',
      dataIndex: 'billNo',
      key: 'billNo',
      width: 180,
      render: (billNo: string, record: Bill) => (
        <Button type="link" onClick={() => navigate(`/billing/${record.id}`)}>
          {billNo}
        </Button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: BillType) => {
        const config = billTypeConfig[type];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '账期',
      dataIndex: 'cycle',
      key: 'cycle',
      width: 100,
      render: (cycle: BillingCycle) => formatBillingCycle(cycle),
    },
    {
      title: '金额',
      dataIndex: 'finalAmount',
      key: 'finalAmount',
      width: 120,
      render: (amount: number) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>
          {formatAmount(amount)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: BillStatus) => {
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method?: PaymentMethod) => {
        if (!method) return '-';
        const config = paymentMethodConfig[method];
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '账期范围',
      key: 'period',
      width: 200,
      render: (_: any, record: Bill) => {
        if (!record.periodStart || !record.periodEnd) return '-';
        return (
          <span style={{ fontSize: 12 }}>
            {dayjs(record.periodStart).format('YYYY-MM-DD')} ~ {dayjs(record.periodEnd).format('YYYY-MM-DD')}
          </span>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_: any, record: Bill) => (
        <Space size="small">
          {record.status === BillStatus.PENDING && (
            <Button
              type="primary"
              size="small"
              onClick={() => handlePay(record)}
            >
              支付
            </Button>
          )}
          {(record.status === BillStatus.PENDING || record.status === BillStatus.OVERDUE) && (
            <Popconfirm
              title="确认取消此账单？"
              onConfirm={() => handleCancel(record.id)}
            >
              <Button size="small" danger>
                取消
              </Button>
            </Popconfirm>
          )}
          {record.status === BillStatus.PAID && (
            <Tooltip title="下载账单">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record)}
              />
            </Tooltip>
          )}
          <Button
            size="small"
            onClick={() => navigate(`/billing/${record.id}`)}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总账单数"
                value={stats.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="总金额"
                value={stats.totalAmount}
                precision={2}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="已支付"
                value={stats.paidAmount}
                precision={2}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="未支付"
                value={stats.unpaidAmount}
                precision={2}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Search
              placeholder="搜索账单号"
              onSearch={(value) => handleFilterChange('keyword', value)}
              style={{ width: 200 }}
              allowClear
            />

            <Select
              placeholder="账单类型"
              style={{ width: 120 }}
              allowClear
              onChange={(value) => handleFilterChange('type', value)}
            >
              {Object.entries(billTypeConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>

            <Select
              placeholder="账单状态"
              style={{ width: 120 }}
              allowClear
              onChange={(value) => handleFilterChange('status', value)}
            >
              {Object.entries(statusConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>

            <RangePicker
              format="YYYY-MM-DD"
              placeholder={['开始日期', '结束日期']}
              onChange={handleDateRangeChange}
            />

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadBills();
                loadStats();
              }}
            >
              刷新
            </Button>
          </Space>
        </Space>
      </Card>

      {/* 账单列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={bills}
          rowKey="id"
          loading={loading}
          pagination={{
            current: query.page,
            pageSize: query.pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条账单`,
            onChange: (page, pageSize) => setQuery({ ...query, page, pageSize }),
          }}
          locale={{
            emptyText: <Empty description="暂无账单" />,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 支付 Modal */}
      <Modal
        title={<Space><WalletOutlined /> 支付账单</Space>}
        open={paymentModalVisible}
        onOk={handleConfirmPay}
        onCancel={() => setPaymentModalVisible(false)}
        okText="确认支付"
        cancelText="取消"
      >
        {selectedBill && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>账单号：</span>
                  <span>{selectedBill.billNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>账单类型：</span>
                  <Tag color={billTypeConfig[selectedBill.type].color}>
                    {billTypeConfig[selectedBill.type].label}
                  </Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>应付金额：</span>
                  <span style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                    {formatAmount(selectedBill.finalAmount)}
                  </span>
                </div>
              </Space>
            </Card>

            <div>
              <div style={{ marginBottom: 8 }}>选择支付方式：</div>
              <Select
                value={paymentMethod}
                onChange={setPaymentMethod}
                style={{ width: '100%' }}
                size="large"
              >
                {Object.entries(paymentMethodConfig).map(([key, config]) => (
                  <Option key={key} value={key}>
                    <Space>
                      <Tag color={config.color}>{config.label}</Tag>
                    </Space>
                  </Option>
                ))}
              </Select>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default BillList;
