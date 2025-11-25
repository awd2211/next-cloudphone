import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Tag,
  Space,
  Tabs,
  Typography,
  Tooltip,
  Popconfirm,
  Alert,
  Row,
  Col,
  Statistic,
  Descriptions,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  StopOutlined,
  DollarOutlined,
  BellOutlined,
  SettingOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import * as fiveSimAPI from '@/services/fivesim';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * 5sim 高级功能组件
 *
 * 功能模块：
 * 1. 订单历史 - 查看所有订单记录
 * 2. 支付记录 - 查看账户支付历史
 * 3. 号码租用 - 长期租用号码（1-8760小时）
 * 4. 价格查询 - 查询各国家/产品价格
 * 5. 价格上限 - 管理购买价格上限
 * 6. 系统通知 - 查看5sim平台公告
 */
const FiveSimAdvancedTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<fiveSimAPI.FiveSimOrder[]>([]);
  const [payments, setPayments] = useState<fiveSimAPI.FiveSimPayment[]>([]);
  const [countries, setCountries] = useState<fiveSimAPI.FiveSimCountry[]>([]);
  const [smsInbox, setSmsInbox] = useState<fiveSimAPI.FiveSimSmsMessage[]>([]);
  const [prices, setPrices] = useState<fiveSimAPI.FiveSimPriceInfo>({});
  const [maxPrices, setMaxPrices] = useState<Record<string, any>>({});
  const [notifications, setNotifications] = useState<fiveSimAPI.FiveSimNotification[]>([]);

  const [rentModalVisible, setRentModalVisible] = useState(false);
  const [smsModalVisible, setSmsModalVisible] = useState(false);
  const [maxPriceModalVisible, setMaxPriceModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [priceCountry, setPriceCountry] = useState<string>('');
  const [priceProduct, setPriceProduct] = useState<string>('');

  const [rentForm] = Form.useForm();
  const [maxPriceForm] = Form.useForm();

  /**
   * 加载订单列表
   */
  const loadOrders = async (category?: 'activation' | 'hosting') => {
    try {
      setLoading(true);
      const data = await fiveSimAPI.getOrders({ category, limit: 50 });
      setOrders(data);
      message.success(`加载了 ${data.length} 条订单记录`);
    } catch (error: any) {
      message.error(`加载订单失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载支付记录
   */
  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await fiveSimAPI.getPayments();
      setPayments(data);
      message.success(`加载了 ${data.length} 条支付记录`);
    } catch (error: any) {
      message.error(`加载支付记录失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载国家列表
   */
  const loadCountries = async () => {
    try {
      const data = await fiveSimAPI.getCountries();
      setCountries(data);
    } catch (error: any) {
      message.error(`加载国家列表失败: ${error.message}`);
    }
  };

  /**
   * 查看短信收件箱
   */
  const viewSmsInbox = async (orderId: string) => {
    try {
      setLoading(true);
      const data = await fiveSimAPI.getSmsInbox(orderId);
      setSmsInbox(data);
      setSelectedOrderId(orderId);
      setSmsModalVisible(true);
      message.success(`加载了 ${data.length} 条短信`);
    } catch (error: any) {
      message.error(`加载短信失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 标记号码
   */
  const handleBanNumber = async (orderId: string) => {
    try {
      await fiveSimAPI.banNumber(orderId);
      message.success('号码已标记为不可用');
      loadOrders();
    } catch (error: any) {
      message.error(`标记号码失败: ${error.message}`);
    }
  };

  /**
   * 租用号码
   */
  const handleRentNumber = async () => {
    try {
      const values = await rentForm.validateFields();
      setLoading(true);
      const result = await fiveSimAPI.rentNumber(values);
      message.success(
        `成功租用号码: ${result.phoneNumber} (激活ID: ${result.activationId})`,
      );
      setRentModalVisible(false);
      rentForm.resetFields();
      loadOrders('hosting'); // 刷新 hosting 订单列表
    } catch (error: any) {
      message.error(`租用号码失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载价格信息
   */
  const loadPrices = async () => {
    try {
      setLoading(true);
      const params: fiveSimAPI.FiveSimPriceQueryParams = {};
      if (priceCountry) params.country = priceCountry;
      if (priceProduct) params.product = priceProduct;
      const data = await fiveSimAPI.getPrices(params);
      setPrices(data);
      message.success('价格信息加载成功');
    } catch (error: any) {
      message.error(`加载价格失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载价格上限
   */
  const loadMaxPrices = async () => {
    try {
      setLoading(true);
      const data = await fiveSimAPI.getMaxPrices();
      setMaxPrices(data);
      message.success('价格上限加载成功');
    } catch (error: any) {
      message.error(`加载价格上限失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载系统通知
   */
  const loadNotifications = async (language: string = 'en') => {
    try {
      setLoading(true);
      const data = await fiveSimAPI.getNotifications(language);
      setNotifications(data);
      message.success(`加载了 ${data.length} 条系统通知`);
    } catch (error: any) {
      message.error(`加载通知失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 设置价格上限
   */
  const handleSetMaxPrice = async () => {
    try {
      const values = await maxPriceForm.validateFields();
      setLoading(true);
      await fiveSimAPI.setMaxPrice(values);
      message.success(`成功设置 ${values.country}/${values.product} 价格上限为 ₽${values.price}`);
      setMaxPriceModalVisible(false);
      maxPriceForm.resetFields();
      loadMaxPrices();
    } catch (error: any) {
      message.error(`设置价格上限失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除价格上限
   */
  const handleDeleteMaxPrice = async (country: string, product: string) => {
    try {
      setLoading(true);
      await fiveSimAPI.deleteMaxPrice({ country, product });
      message.success(`已删除 ${country}/${product} 的价格上限`);
      loadMaxPrices();
    } catch (error: any) {
      message.error(`删除价格上限失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    loadCountries();
  }, []);

  /**
   * 订单表格列定义
   */
  const orderColumns = [
    {
      title: '订单ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '号码',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '服务',
      dataIndex: 'product',
      key: 'product',
      width: 120,
    },
    {
      title: '运营商',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 80,
      render: (price: number) => `₽${price.toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          PENDING: 'blue',
          RECEIVED: 'green',
          TIMEOUT: 'red',
          CANCELED: 'default',
          FINISHED: 'success',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: fiveSimAPI.FiveSimOrder) => (
        <Space>
          <Tooltip title="查看短信">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => viewSmsInbox(record.id.toString())}
            >
              短信
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要标记这个号码吗？"
            onConfirm={() => handleBanNumber(record.id.toString())}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<StopOutlined />} danger>
              标记
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /**
   * 支付表格列定义
   */
  const paymentColumns = [
    {
      title: '支付ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '供应商',
      dataIndex: 'provider',
      key: 'provider',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `₽${amount.toFixed(2)}`,
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: number) => `₽${balance.toFixed(2)}`,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
  ];

  /**
   * 短信表格列定义
   */
  const smsColumns = [
    {
      title: '发送者',
      dataIndex: 'sender',
      key: 'sender',
      width: 150,
    },
    {
      title: '验证码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code: string) => (
        <Tag color="blue" style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {code}
        </Tag>
      ),
    },
    {
      title: '短信内容',
      dataIndex: 'text',
      key: 'text',
    },
    {
      title: '接收时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
  ];

  return (
    <div>
      <Tabs defaultActiveKey="orders">
        <TabPane tab="📦 订单历史" key="orders">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  订单记录
                </Title>
                <Text type="secondary">（共 {orders.length} 条）</Text>
              </Space>
            }
            extra={
              <Space>
                <Button onClick={() => loadOrders()}>
                  <ReloadOutlined /> 刷新
                </Button>
                <Button onClick={() => loadOrders('activation')} type="default">
                  激活订单
                </Button>
                <Button onClick={() => loadOrders('hosting')} type="default">
                  租用订单
                </Button>
              </Space>
            }
          >
            <Table
              columns={orderColumns}
              dataSource={orders}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="💳 支付记录" key="payments">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  支付历史
                </Title>
                <Text type="secondary">（共 {payments.length} 条）</Text>
              </Space>
            }
            extra={
              <Button onClick={loadPayments}>
                <ReloadOutlined /> 刷新
              </Button>
            }
          >
            <Table
              columns={paymentColumns}
              dataSource={payments}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `共 ${total} 条`,
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="🏠 号码租用" key="rent">
          <Card
            title={
              <Title level={5} style={{ margin: 0 }}>
                长期租用号码
              </Title>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setRentModalVisible(true)}
              >
                租用新号码
              </Button>
            }
          >
            <div style={{ padding: '20px' }}>
              <Text type="secondary">
                长期租用功能适用于需要持续接收短信的场景，支持租用 1-8760 小时（最长 1 年）。
              </Text>
              <br />
              <br />
              <Text type="secondary">
                • 激活订单：短期使用（约 20 分钟）
                <br />
                • 租用订单：长期使用（1-8760 小时）
              </Text>
            </div>
          </Card>
        </TabPane>

        <TabPane tab="💰 价格查询" key="prices">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  <DollarOutlined /> 价格信息
                </Title>
              </Space>
            }
            extra={
              <Space>
                <Select
                  style={{ width: 150 }}
                  placeholder="选择国家"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  value={priceCountry || undefined}
                  onChange={(v) => setPriceCountry(v || '')}
                >
                  {countries.map((c) => (
                    <Option key={c.iso} value={c.name.toLowerCase()}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
                <Input
                  style={{ width: 150 }}
                  placeholder="服务名称"
                  value={priceProduct}
                  onChange={(e) => setPriceProduct(e.target.value)}
                />
                <Button type="primary" onClick={loadPrices} loading={loading}>
                  <ReloadOutlined /> 查询价格
                </Button>
              </Space>
            }
          >
            {Object.keys(prices).length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Text type="secondary">选择国家和服务后点击"查询价格"查看价格信息</Text>
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                {Object.entries(prices).map(([country, products]) => (
                  <Card
                    key={country}
                    size="small"
                    title={<Tag color="blue">{country}</Tag>}
                    style={{ marginBottom: 16 }}
                  >
                    {Object.entries(products as Record<string, any>).map(([product, operators]) => (
                      <div key={product} style={{ marginBottom: 12 }}>
                        <Text strong>{product}</Text>
                        <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                          {Object.entries(operators as Record<string, any>).map(([operator, info]: [string, any]) => (
                            <Col key={operator} span={6}>
                              <Card size="small">
                                <Statistic
                                  title={operator}
                                  value={info.cost}
                                  prefix="₽"
                                  suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {info.count}个</Text>}
                                />
                                {info.rate && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    成功率: {(info.rate * 100).toFixed(0)}%
                                  </Text>
                                )}
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane tab="⚙️ 价格上限" key="maxPrices">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  <SettingOutlined /> 价格上限设置
                </Title>
                <Text type="secondary">（超过此价格的号码将不会被购买）</Text>
              </Space>
            }
            extra={
              <Space>
                <Button onClick={loadMaxPrices} loading={loading}>
                  <ReloadOutlined /> 刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setMaxPriceModalVisible(true)}
                >
                  添加上限
                </Button>
              </Space>
            }
          >
            {Object.keys(maxPrices).length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Text type="secondary">点击"刷新"加载价格上限设置，或点击"添加上限"设置新的价格限制</Text>
              </div>
            ) : (
              <div>
                {Object.entries(maxPrices).map(([country, products]) => (
                  <Card
                    key={country}
                    size="small"
                    title={<Tag color="green">{country}</Tag>}
                    style={{ marginBottom: 16 }}
                  >
                    <Row gutter={[8, 8]}>
                      {Object.entries(products as Record<string, number>).map(([product, price]) => (
                        <Col key={product} span={8}>
                          <Card size="small">
                            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                              <div>
                                <Text strong>{product}</Text>
                                <br />
                                <Text type="success" style={{ fontSize: 18 }}>₽{price}</Text>
                              </div>
                              <Popconfirm
                                title="确定删除此价格上限？"
                                onConfirm={() => handleDeleteMaxPrice(country, product)}
                                okText="确定"
                                cancelText="取消"
                              >
                                <Button type="text" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane tab="🔔 系统通知" key="notifications">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  <BellOutlined /> 5sim 系统通知
                </Title>
              </Space>
            }
            extra={
              <Space>
                <Select
                  style={{ width: 120 }}
                  defaultValue="en"
                  onChange={(lang) => loadNotifications(lang)}
                >
                  <Option value="en">English</Option>
                  <Option value="ru">Русский</Option>
                  <Option value="cn">中文</Option>
                </Select>
                <Button onClick={() => loadNotifications()} loading={loading}>
                  <ReloadOutlined /> 刷新
                </Button>
              </Space>
            }
          >
            {notifications.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Text type="secondary">点击"刷新"加载5sim平台的系统通知</Text>
              </div>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {notifications.map((notification) => (
                  <Alert
                    key={notification.id}
                    message={
                      <Text strong>
                        {new Date(notification.created_at).toLocaleString('zh-CN')}
                      </Text>
                    }
                    description={notification.text}
                    type={notification.type === 'error' ? 'error' : notification.type === 'warning' ? 'warning' : 'info'}
                    showIcon
                  />
                ))}
              </Space>
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* 租用号码模态框 */}
      <Modal
        title="租用号码"
        open={rentModalVisible}
        onOk={handleRentNumber}
        onCancel={() => {
          setRentModalVisible(false);
          rentForm.resetFields();
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form form={rentForm} layout="vertical">
          <Form.Item
            label="服务"
            name="service"
            rules={[{ required: true, message: '请输入服务名称' }]}
          >
            <Input placeholder="例如: telegram, whatsapp, google" />
          </Form.Item>

          <Form.Item
            label="国家"
            name="country"
            rules={[{ required: true, message: '请选择国家' }]}
          >
            <Select
              showSearch
              placeholder="选择国家"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {countries.map((country) => (
                <Option key={country.iso} value={country.name.toLowerCase()}>
                  {country.name} ({country.iso.toUpperCase()}) +{country.prefix}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="租用时长（小时）"
            name="hours"
            initialValue={24}
            rules={[{ required: true, message: '请输入租用时长' }]}
          >
            <InputNumber
              min={1}
              max={8760}
              style={{ width: '100%' }}
              placeholder="1-8760 小时"
            />
          </Form.Item>

          <Text type="secondary">
            注意：租用时长越长，费用越高。建议根据实际需求选择合适的时长。
          </Text>
        </Form>
      </Modal>

      {/* 短信收件箱模态框 */}
      <Modal
        title={`短信收件箱 - 订单 ${selectedOrderId}`}
        open={smsModalVisible}
        onCancel={() => setSmsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSmsModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <Table
          columns={smsColumns}
          dataSource={smsInbox}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条短信`,
          }}
        />
      </Modal>

      {/* 设置价格上限模态框 */}
      <Modal
        title="设置价格上限"
        open={maxPriceModalVisible}
        onOk={handleSetMaxPrice}
        onCancel={() => {
          setMaxPriceModalVisible(false);
          maxPriceForm.resetFields();
        }}
        confirmLoading={loading}
        width={500}
      >
        <Form form={maxPriceForm} layout="vertical">
          <Form.Item
            label="国家"
            name="country"
            rules={[{ required: true, message: '请选择或输入国家' }]}
          >
            <Select
              showSearch
              placeholder="选择国家"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as string).toLowerCase().includes(input.toLowerCase())
              }
            >
              {countries.map((country) => (
                <Option key={country.iso} value={country.name.toLowerCase()}>
                  {country.name} ({country.iso.toUpperCase()})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="服务"
            name="product"
            rules={[{ required: true, message: '请输入服务名称' }]}
          >
            <Input placeholder="例如: telegram, whatsapp, google" />
          </Form.Item>

          <Form.Item
            label="价格上限（卢布）"
            name="price"
            rules={[{ required: true, message: '请输入价格上限' }]}
          >
            <InputNumber
              min={0.01}
              step={0.1}
              precision={2}
              style={{ width: '100%' }}
              prefix="₽"
              placeholder="最高购买价格"
            />
          </Form.Item>

          <Text type="secondary">
            设置后，购买号码时如果价格超过此上限将自动跳过，避免意外高价消费。
          </Text>
        </Form>
      </Modal>
    </div>
  );
};

export default FiveSimAdvancedTab;
