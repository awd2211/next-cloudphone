import { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Image,
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  Tooltip,
} from 'antd';
import {
  ReloadOutlined,
  DollarOutlined,
  SearchOutlined,
  DownloadOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  usePayments,
  useSyncPaymentStatus,
  useManualRefund,
  useExportPayments,
} from '@/hooks/usePayments';
import type { PaymentDetail, PaymentListParams } from '@/services/payment-admin';
import { usePermission, PermissionGuard } from '@/hooks';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const PaymentList = () => {
  const { hasPermission } = usePermission();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [refundForm] = Form.useForm();

  // 筛选条件
  const [filters, setFilters] = useState<PaymentListParams>({});
  const [searchValue, setSearchValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // React Query hooks
  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      ...filters,
      search: searchValue || undefined,
    }),
    [page, pageSize, filters, searchValue]
  );

  const { data, isLoading } = usePayments(params);
  const syncStatusMutation = useSyncPaymentStatus();
  const refundMutation = useManualRefund();
  const exportMutation = useExportPayments();

  const payments = data?.data || [];
  const total = data?.pagination?.total || 0;

  // Event handlers
  const handleSearch = useCallback(() => {
    setPage(1);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setPage(1);
  }, []);

  const handleFilter = useCallback((values: any) => {
    const newFilters: PaymentListParams = {
      status: values.status,
      method: values.method,
      userId: values.userId,
    };

    if (values.dateRange && values.dateRange.length === 2) {
      newFilters.startDate = values.dateRange[0].format('YYYY-MM-DD');
      newFilters.endDate = values.dateRange[1].format('YYYY-MM-DD');
    }

    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    form.resetFields();
    setFilters({});
    setPage(1);
  }, [form]);

  const handleExport = useCallback(async () => {
    await exportMutation.mutateAsync({
      startDate: filters.startDate,
      endDate: filters.endDate,
      status: filters.status,
      method: filters.method,
    });
  }, [exportMutation, filters]);

  const handleSyncStatus = useCallback(
    async (paymentId: string) => {
      await syncStatusMutation.mutateAsync(paymentId);
    },
    [syncStatusMutation]
  );

  const handleRefund = useCallback(
    async (values: { amount?: number; reason: string; adminNote?: string }) => {
      if (!selectedPayment) return;
      await refundMutation.mutateAsync({
        paymentId: selectedPayment.id,
        data: values,
      });
      setRefundModalVisible(false);
      refundForm.resetFields();
    },
    [selectedPayment, refundMutation, refundForm]
  );

  // Optimized maps
  const methodMap = useMemo(
    () => ({
      wechat: { color: 'green' as const, text: '微信支付' },
      alipay: { color: 'blue' as const, text: '支付宝' },
      balance: { color: 'orange' as const, text: '余额支付' },
      stripe: { color: 'purple' as const, text: 'Stripe' },
      paypal: { color: 'blue' as const, text: 'PayPal' },
      paddle: { color: 'cyan' as const, text: 'Paddle' },
    }),
    []
  );

  const statusMap = useMemo(
    () => ({
      pending: { color: 'default' as const, text: '待支付' },
      processing: { color: 'orange' as const, text: '支付中' },
      success: { color: 'green' as const, text: '支付成功' },
      failed: { color: 'red' as const, text: '支付失败' },
      refunding: { color: 'orange' as const, text: '退款中' },
      refunded: { color: 'purple' as const, text: '已退款' },
      cancelled: { color: 'default' as const, text: '已取消' },
    }),
    []
  );

  const renderAmount = useCallback((amount: number, record: PaymentDetail) => {
    const currencySymbol =
      record.currency === 'CNY' ? '¥' : record.currency === 'USD' ? '$' : record.currency;
    return `${currencySymbol}${(amount || 0).toFixed(2)}`;
  }, []);

  const columns: ColumnsType<PaymentDetail> = useMemo(
    () => [
      {
        title: '支付单号',
        dataIndex: 'paymentNo',
        key: 'paymentNo',
        width: 180,
        fixed: 'left',
      },
      {
        title: '订单号',
        dataIndex: 'order',
        key: 'order',
        width: 180,
        render: (order: any) => order?.orderNo || '-',
      },
      {
        title: '用户ID',
        dataIndex: 'userId',
        key: 'userId',
        width: 100,
        ellipsis: true,
      },
      {
        title: '金额',
        dataIndex: 'amount',
        key: 'amount',
        render: renderAmount,
        sorter: (a, b) => a.amount - b.amount,
      },
      {
        title: '支付方式',
        dataIndex: 'method',
        key: 'method',
        render: (method: string) => {
          const config = methodMap[method as keyof typeof methodMap] || {
            color: 'default' as const,
            text: method,
          };
          return <Tag color={config.color}>{config.text}</Tag>;
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => {
          const config = statusMap[status as keyof typeof statusMap] || {
            color: 'default' as const,
            text: status,
          };
          return <Tag color={config.color}>{config.text}</Tag>;
        },
      },
      {
        title: '交易号',
        dataIndex: 'transactionId',
        key: 'transactionId',
        ellipsis: true,
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '支付时间',
        dataIndex: 'paidAt',
        key: 'paidAt',
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
      },
      {
        title: '操作',
        key: 'action',
        width: 220,
        fixed: 'right',
        render: (_, record) => (
          <Space size="small">
            {(record.status === 'pending' || record.status === 'processing') && (
              <>
                <Button
                  type="link"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => handleSyncStatus(record.id)}
                >
                  同步状态
                </Button>
                {record.paymentUrl && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setSelectedPayment(record);
                      setQrCodeModalVisible(true);
                    }}
                  >
                    查看二维码
                  </Button>
                )}
              </>
            )}
            {record.status === 'success' && hasPermission('payment:refund:create') && (
              <Button
                type="link"
                size="small"
                danger
                icon={<DollarOutlined />}
                onClick={() => {
                  setSelectedPayment(record);
                  refundForm.setFieldsValue({ amount: record.amount });
                  setRefundModalVisible(true);
                }}
              >
                退款
              </Button>
            )}
            {record.status === 'success' && !hasPermission('payment:refund:create') && (
              <Tooltip title="无退款权限">
                <Button type="link" size="small" danger disabled icon={<DollarOutlined />}>
                  退款
                </Button>
              </Tooltip>
            )}
          </Space>
        ),
      },
    ],
    [methodMap, statusMap, renderAmount, handleSyncStatus, hasPermission, refundForm]
  );

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题和操作按钮 */}
        <Card>
          <Row justify="space-between" align="middle">
            <Col>
              <h2 style={{ margin: 0 }}>支付管理</h2>
            </Col>
            <Col>
              <Space>
                <Button icon={<FilterOutlined />} onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? '隐藏筛选' : '显示筛选'}
                </Button>
                <PermissionGuard permission="payment:list:export">
                  <Button
                    icon={<DownloadOutlined />}
                    loading={exportMutation.isPending}
                    onClick={handleExport}
                  >
                    导出 Excel
                  </Button>
                </PermissionGuard>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 搜索框 */}
        <Card>
          <Space.Compact style={{ width: '100%', maxWidth: 600 }}>
            <Input
              placeholder="搜索支付单号、订单号、交易号..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
            {searchValue && <Button onClick={handleClearSearch}>清空</Button>}
          </Space.Compact>
        </Card>

        {/* 高级筛选 */}
        {showFilters && (
          <Card title="高级筛选">
            <Form form={form} onFinish={handleFilter} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="支付状态" name="status">
                    <Select placeholder="全部" allowClear>
                      <Option value="pending">待支付</Option>
                      <Option value="processing">支付中</Option>
                      <Option value="success">支付成功</Option>
                      <Option value="failed">支付失败</Option>
                      <Option value="refunding">退款中</Option>
                      <Option value="refunded">已退款</Option>
                      <Option value="cancelled">已取消</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="支付方式" name="method">
                    <Select placeholder="全部" allowClear>
                      <Option value="wechat">微信支付</Option>
                      <Option value="alipay">支付宝</Option>
                      <Option value="balance">余额支付</Option>
                      <Option value="stripe">Stripe</Option>
                      <Option value="paypal">PayPal</Option>
                      <Option value="paddle">Paddle</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="用户ID" name="userId">
                    <Input placeholder="输入用户ID" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item label="日期范围" name="dateRange">
                    <RangePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col>
                  <Space>
                    <Button type="primary" htmlType="submit">
                      应用筛选
                    </Button>
                    <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
                      清空筛选
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          </Card>
        )}

        {/* 数据表格 */}
        <Card>
          <Table
            columns={columns}
            dataSource={payments}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
            scroll={{ x: 1800 }}
          />
        </Card>
      </Space>

      {/* 退款对话框 */}
      <Modal
        title="手动退款"
        open={refundModalVisible}
        onCancel={() => {
          setRefundModalVisible(false);
          refundForm.resetFields();
        }}
        onOk={() => refundForm.submit()}
        confirmLoading={refundMutation.isPending}
      >
        <Form form={refundForm} onFinish={handleRefund} layout="vertical">
          <Form.Item label="支付单号">
            <Input value={selectedPayment?.paymentNo} disabled />
          </Form.Item>

          <Form.Item label="支付金额">
            <Input
              value={
                selectedPayment
                  ? `${selectedPayment.currency === 'CNY' ? '¥' : selectedPayment.currency === 'USD' ? '$' : selectedPayment.currency}${selectedPayment.amount.toFixed(2)}`
                  : ''
              }
              disabled
            />
          </Form.Item>

          <Form.Item
            label="退款金额（留空则全额退款）"
            name="amount"
            rules={[
              {
                validator: (_, value) => {
                  if (value && selectedPayment && value > selectedPayment.amount) {
                    return Promise.reject('退款金额不能大于支付金额');
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              min={0.01}
              max={selectedPayment?.amount}
              precision={2}
              style={{ width: '100%' }}
              placeholder="不填写则全额退款"
            />
          </Form.Item>

          <Form.Item
            label="退款原因"
            name="reason"
            rules={[{ required: true, message: '请输入退款原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入退款原因" />
          </Form.Item>

          <Form.Item label="管理员备注" name="adminNote">
            <Input.TextArea rows={2} placeholder="可选的管理员备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 二维码对话框 */}
      <Modal
        title="支付二维码"
        open={qrCodeModalVisible}
        onCancel={() => setQrCodeModalVisible(false)}
        footer={null}
      >
        {selectedPayment?.paymentUrl && (
          <div style={{ textAlign: 'center' }}>
            <Image
              src={selectedPayment.paymentUrl}
              alt="支付二维码"
              width={300}
              height={300}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
            <p style={{ marginTop: 16 }}>
              请使用{selectedPayment.method === 'wechat' ? '微信' : '支付宝'}扫码支付
            </p>
            <p>金额: ¥{selectedPayment.amount.toFixed(2)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentList;
