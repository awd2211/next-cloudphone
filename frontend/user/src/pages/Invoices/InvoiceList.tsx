import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Descriptions,
  Row,
  Col,
  Statistic,
  Empty,
  Typography,
  Divider,
} from 'antd';
import {
  FileTextOutlined,
  DownloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getInvoices,
  downloadInvoice,
  applyInvoice,
  getBills,
  type Invoice,
  type InvoiceRequest,
  type Bill,
  BillStatus,
} from '@/services/billing';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const InvoiceList = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [form] = Form.useForm();

  // 加载发票列表
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await getInvoices({ page, pageSize });
      setInvoices(res.items);
      setTotal(res.total);
    } catch (error) {
      message.error('加载发票列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载已支付的账单（用于申请发票）
  const loadPaidBills = async () => {
    try {
      const res = await getBills({ status: BillStatus.PAID, pageSize: 100 });
      // 过滤掉已经申请过发票的账单
      const billsWithoutInvoice = res.items.filter(
        (bill) => !invoices.some((invoice) => invoice.billId === bill.id)
      );
      setBills(billsWithoutInvoice);
    } catch (error) {
      console.error('加载账单失败', error);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [page, pageSize]);

  useEffect(() => {
    if (applyModalVisible) {
      loadPaidBills();
    }
  }, [applyModalVisible, invoices]);

  // 申请发票
  const handleApplyInvoice = async (values: InvoiceRequest) => {
    try {
      await applyInvoice(values);
      message.success('发票申请已提交，请等待审核');
      setApplyModalVisible(false);
      form.resetFields();
      loadInvoices();
    } catch (error: any) {
      message.error(error.message || '申请发票失败');
    }
  };

  // 下载发票
  const handleDownload = async (id: string, invoiceNo: string) => {
    setDownloading(true);
    try {
      const blob = await downloadInvoice(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `发票_${invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      message.success('发票下载成功');
    } catch (error: any) {
      message.error(error.message || '下载发票失败');
    } finally {
      setDownloading(false);
    }
  };

  // 查看发票详情
  const handleViewDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDetailModalVisible(true);
  };

  // 状态渲染
  const renderStatus = (status: string) => {
    const statusConfig = {
      pending: {
        color: 'processing',
        icon: <ClockCircleOutlined />,
        text: '待开具',
      },
      issued: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '已开具',
      },
      rejected: {
        color: 'error',
        icon: <CloseCircleOutlined />,
        text: '已拒绝',
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  const columns: ColumnsType<Invoice> = [
    {
      title: '发票号',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      width: 180,
      render: (text) => (
        <Text strong style={{ fontFamily: 'monospace' }}>
          {text}
        </Text>
      ),
    },
    {
      title: '发票抬头',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => (
        <Tag color={type === 'company' ? 'blue' : 'green'}>
          {type === 'company' ? '企业' : '个人'}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
          ¥{amount.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: renderStatus,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '开具时间',
      dataIndex: 'issuedAt',
      key: 'issuedAt',
      width: 180,
      render: (text) => (text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.status === 'issued' && record.downloadUrl && (
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={() => handleDownload(record.id, record.invoiceNo)}
            >
              下载
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: invoices.length,
    pending: invoices.filter((inv) => inv.status === 'pending').length,
    issued: invoices.filter((inv) => inv.status === 'issued').length,
    rejected: invoices.filter((inv) => inv.status === 'rejected').length,
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card
        style={{ marginBottom: '24px' }}
        title={
          <Space>
            <FileTextOutlined style={{ fontSize: '20px' }} />
            <Title level={4} style={{ margin: 0 }}>
              发票管理
            </Title>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setApplyModalVisible(true)}>
            申请发票
          </Button>
        }
      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总发票数" value={stats.total} prefix={<FileTextOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic
              title="待开具"
              value={stats.pending}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已开具"
              value={stats.issued}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已拒绝"
              value={stats.rejected}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" size="small">
                    <Text type="secondary">暂无发票记录</Text>
                    <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setApplyModalVisible(true)}>
                      立即申请发票
                    </Button>
                  </Space>
                }
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPage(page);
              setPageSize(pageSize);
            },
          }}
        />
      </Card>

      {/* 申请发票模态框 */}
      <Modal
        title="申请发票"
        open={applyModalVisible}
        onCancel={() => {
          setApplyModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={handleApplyInvoice} layout="vertical">
          <Form.Item
            label="选择账单"
            name="billId"
            rules={[{ required: true, message: '请选择要开具发票的账单' }]}
          >
            <Select
              placeholder="请选择已支付的账单"
              showSearch
              optionFilterProp="children"
              notFoundContent={
                bills.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无可开具发票的账单"
                  />
                ) : undefined
              }
            >
              {bills.map((bill) => (
                <Option key={bill.id} value={bill.id}>
                  {bill.billNo} - ¥{bill.finalAmount.toFixed(2)} ({dayjs(bill.paidAt).format('YYYY-MM-DD')})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="发票类型"
            name="type"
            rules={[{ required: true, message: '请选择发票类型' }]}
            initialValue="personal"
          >
            <Select>
              <Option value="personal">个人</Option>
              <Option value="company">企业</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="发票抬头"
            name="title"
            rules={[{ required: true, message: '请输入发票抬头' }]}
          >
            <Input placeholder="个人姓名或企业名称" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) =>
              getFieldValue('type') === 'company' ? (
                <Form.Item
                  label="纳税人识别号"
                  name="taxId"
                  rules={[{ required: true, message: '请输入纳税人识别号' }]}
                >
                  <Input placeholder="请输入统一社会信用代码" />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            label="接收邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="用于接收电子发票" />
          </Form.Item>

          <Form.Item label="联系电话" name="phone">
            <Input placeholder="可选，用于联系" />
          </Form.Item>

          <Form.Item label="邮寄地址" name="address">
            <TextArea rows={2} placeholder="可选，仅纸质发票需要填写" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 发票详情模态框 */}
      <Modal
        title="发票详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedInvoice(null);
        }}
        footer={
          selectedInvoice?.status === 'issued' && selectedInvoice?.downloadUrl
            ? [
                <Button key="close" onClick={() => setDetailModalVisible(false)}>
                  关闭
                </Button>,
                <Button
                  key="download"
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={downloading}
                  onClick={() => selectedInvoice && handleDownload(selectedInvoice.id, selectedInvoice.invoiceNo)}
                >
                  下载发票
                </Button>,
              ]
            : [
                <Button key="close" type="primary" onClick={() => setDetailModalVisible(false)}>
                  关闭
                </Button>,
              ]
        }
        width={700}
      >
        {selectedInvoice && (
          <>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="发票号" span={2}>
                <Text strong copyable>
                  {selectedInvoice.invoiceNo}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="发票类型">
                <Tag color={selectedInvoice.type === 'company' ? 'blue' : 'green'}>
                  {selectedInvoice.type === 'company' ? '企业' : '个人'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">{renderStatus(selectedInvoice.status)}</Descriptions.Item>
              <Descriptions.Item label="发票抬头" span={2}>
                {selectedInvoice.title}
              </Descriptions.Item>
              {selectedInvoice.taxId && (
                <Descriptions.Item label="纳税人识别号" span={2}>
                  <Text code>{selectedInvoice.taxId}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="发票金额" span={2}>
                <Text strong style={{ color: '#1890ff', fontSize: '18px' }}>
                  ¥{selectedInvoice.amount.toFixed(2)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="申请时间">
                {dayjs(selectedInvoice.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="开具时间">
                {selectedInvoice.issuedAt
                  ? dayjs(selectedInvoice.issuedAt).format('YYYY-MM-DD HH:mm:ss')
                  : '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedInvoice.status === 'issued' && selectedInvoice.downloadUrl && (
              <>
                <Divider />
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
                  <div>
                    <Title level={5}>发票已开具</Title>
                    <Text type="secondary">您可以下载电子发票进行查看和打印</Text>
                  </div>
                </div>
              </>
            )}

            {selectedInvoice.status === 'pending' && (
              <>
                <Divider />
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <ClockCircleOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                  <div>
                    <Title level={5}>审核中</Title>
                    <Text type="secondary">您的发票申请正在审核中，通常在 1-3 个工作日内完成</Text>
                  </div>
                </div>
              </>
            )}

            {selectedInvoice.status === 'rejected' && (
              <>
                <Divider />
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
                  <div>
                    <Title level={5}>申请被拒绝</Title>
                    <Text type="secondary">请检查发票信息是否正确，或联系客服咨询</Text>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default InvoiceList;
