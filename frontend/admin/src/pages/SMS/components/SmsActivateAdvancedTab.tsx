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
  Row,
  Col,
  Statistic,
  Descriptions,
  Empty,
  Spin,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  GlobalOutlined,
  HistoryOutlined,
  CopyOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { SEMANTIC, PRIMARY } from '@/theme';
import * as smsActivateAPI from '@/services/smsactivate';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * SMS-Activate 高级功能组件
 *
 * 功能模块：
 * 1. 当前激活 - 查看正在进行的激活
 * 2. 租赁管理 - 长期租赁号码管理
 * 3. 国家查询 - 查看支持的国家列表
 * 4. 价格查询 - 查询各国家/服务价格
 * 5. 热门国家 - 按服务查看热门国家
 * 6. 服务映射 - 查看服务代码对照表
 */
const SmsActivateAdvancedTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activations, setActivations] = useState<smsActivateAPI.SmsActivateCurrentActivation[]>([]);
  const [rentList, setRentList] = useState<smsActivateAPI.SmsActivateRentItem[]>([]);
  const [countries, setCountries] = useState<smsActivateAPI.SmsActivateCountry[]>([]);
  const [prices, setPrices] = useState<smsActivateAPI.SmsActivatePriceInfo>({});
  const [topCountries, setTopCountries] = useState<smsActivateAPI.SmsActivateTopCountry[]>([]);
  const [serviceMapping, setServiceMapping] = useState<Record<string, string>>({});
  const [balanceInfo, setBalanceInfo] = useState<smsActivateAPI.SmsActivateBalanceAndCashBack | null>(null);
  const [rentStatus, setRentStatus] = useState<smsActivateAPI.SmsActivateRentStatus | null>(null);

  const [rentModalVisible, setRentModalVisible] = useState(false);
  const [rentStatusModalVisible, setRentStatusModalVisible] = useState(false);
  const [selectedRentId, setSelectedRentId] = useState<string>('');
  const [priceCountry, setPriceCountry] = useState<number | undefined>();
  const [priceService, setPriceService] = useState<string>('');
  const [topCountryService, setTopCountryService] = useState<string>('telegram');

  const [rentForm] = Form.useForm();
  const [numberForm] = Form.useForm();
  const [getNumberModalVisible, setGetNumberModalVisible] = useState(false);

  /**
   * 加载余额信息
   */
  const loadBalance = async () => {
    try {
      const data = await smsActivateAPI.getBalanceAndCashBack();
      setBalanceInfo(data);
    } catch (error: any) {
      message.error(`加载余额失败: ${error.message}`);
    }
  };

  /**
   * 加载当前激活列表
   */
  const loadActivations = async () => {
    try {
      setLoading(true);
      const data = await smsActivateAPI.getCurrentActivations();
      setActivations(data);
      message.success(`加载了 ${data.length} 个当前激活`);
    } catch (error: any) {
      message.error(`加载激活列表失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载租赁列表
   */
  const loadRentList = async () => {
    try {
      setLoading(true);
      const data = await smsActivateAPI.getRentList();
      setRentList(data);
      message.success(`加载了 ${data.length} 个租赁号码`);
    } catch (error: any) {
      message.error(`加载租赁列表失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载国家列表
   */
  const loadCountries = async () => {
    try {
      setLoading(true);
      const data = await smsActivateAPI.getCountries();
      setCountries(data);
      message.success(`加载了 ${data.length} 个国家`);
    } catch (error: any) {
      message.error(`加载国家列表失败: ${error.message}`);
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
      const params: { service?: string; country?: number } = {};
      if (priceService) params.service = priceService;
      if (priceCountry !== undefined) params.country = priceCountry;
      const data = await smsActivateAPI.getPrices(params);
      setPrices(data);
      message.success('价格信息加载成功');
    } catch (error: any) {
      message.error(`加载价格失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载热门国家
   */
  const loadTopCountries = async () => {
    try {
      setLoading(true);
      const data = await smsActivateAPI.getTopCountriesByService({
        service: topCountryService,
      });
      setTopCountries(data);
      message.success(`加载了 ${data.length} 个热门国家`);
    } catch (error: any) {
      message.error(`加载热门国家失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载服务映射
   */
  const loadServiceMapping = async () => {
    try {
      const data = await smsActivateAPI.getServiceMapping();
      setServiceMapping(data.mapping);
    } catch (error: any) {
      message.error(`加载服务映射失败: ${error.message}`);
    }
  };

  /**
   * 查看租赁状态和短信
   */
  const viewRentStatus = async (rentId: string) => {
    try {
      setLoading(true);
      const data = await smsActivateAPI.getRentStatus(rentId);
      setRentStatus(data);
      setSelectedRentId(rentId);
      setRentStatusModalVisible(true);
    } catch (error: any) {
      message.error(`获取租赁状态失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 完成激活
   */
  const handleFinishActivation = async (activationId: string) => {
    try {
      await smsActivateAPI.finishActivation(activationId);
      message.success('激活已完成');
      loadActivations();
    } catch (error: any) {
      message.error(`完成激活失败: ${error.message}`);
    }
  };

  /**
   * 取消激活
   */
  const handleCancelActivation = async (activationId: string) => {
    try {
      await smsActivateAPI.cancelActivation(activationId);
      message.success('激活已取消');
      loadActivations();
    } catch (error: any) {
      message.error(`取消激活失败: ${error.message}`);
    }
  };

  /**
   * 请求重发短信
   */
  const handleResend = async (activationId: string) => {
    try {
      await smsActivateAPI.requestResend(activationId);
      message.success('已请求重发短信');
      loadActivations();
    } catch (error: any) {
      message.error(`请求重发失败: ${error.message}`);
    }
  };

  /**
   * 租用号码
   */
  const handleRentNumber = async () => {
    try {
      const values = await rentForm.validateFields();
      setLoading(true);
      const result = await smsActivateAPI.rentNumber(values);
      message.success(
        `成功租用号码: ${result.phoneNumber} (ID: ${result.activationId})`,
      );
      setRentModalVisible(false);
      rentForm.resetFields();
      loadRentList();
    } catch (error: any) {
      message.error(`租用号码失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取虚拟号码
   */
  const handleGetNumber = async () => {
    try {
      const values = await numberForm.validateFields();
      setLoading(true);
      const result = await smsActivateAPI.getNumber(values);
      message.success(
        `成功获取号码: ${result.phoneNumber} (ID: ${result.activationId}, 费用: ₽${result.cost})`,
      );
      setGetNumberModalVisible(false);
      numberForm.resetFields();
      loadActivations();
    } catch (error: any) {
      message.error(`获取号码失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 完成租赁
   */
  const handleFinishRent = async (rentId: string) => {
    try {
      await smsActivateAPI.finishRent(rentId);
      message.success('租赁已完成');
      loadRentList();
    } catch (error: any) {
      message.error(`完成租赁失败: ${error.message}`);
    }
  };

  /**
   * 取消租赁
   */
  const handleCancelRent = async (rentId: string) => {
    try {
      await smsActivateAPI.cancelRent(rentId);
      message.success('租赁已取消');
      loadRentList();
    } catch (error: any) {
      message.error(`取消租赁失败: ${error.message}`);
    }
  };

  /**
   * 复制到剪贴板
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  useEffect(() => {
    loadBalance();
    loadServiceMapping();
  }, []);

  /**
   * 当前激活表格列定义
   */
  const activationColumns = [
    {
      title: '激活ID',
      dataIndex: 'activationId',
      key: 'activationId',
      width: 120,
    },
    {
      title: '号码',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 150,
      render: (phone: string) => (
        <Space>
          <Text copyable={{ text: phone }}>{phone}</Text>
        </Space>
      ),
    },
    {
      title: '服务',
      dataIndex: 'serviceCode',
      key: 'serviceCode',
      width: 100,
    },
    {
      title: '国家',
      dataIndex: 'countryCode',
      key: 'countryCode',
      width: 80,
    },
    {
      title: '费用',
      dataIndex: 'activationCost',
      key: 'activationCost',
      width: 80,
      render: (cost: string) => `₽${cost}`,
    },
    {
      title: '状态',
      dataIndex: 'activationStatus',
      key: 'activationStatus',
      width: 140,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          STATUS_WAIT_CODE: 'blue',
          STATUS_WAIT_RETRY: 'orange',
          STATUS_OK: 'green',
          STATUS_CANCEL: 'default',
        };
        const labelMap: Record<string, string> = {
          STATUS_WAIT_CODE: '等待验证码',
          STATUS_WAIT_RETRY: '等待重发',
          STATUS_OK: '已收到验证码',
          STATUS_CANCEL: '已取消',
        };
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>;
      },
    },
    {
      title: '验证码',
      dataIndex: 'smsCode',
      key: 'smsCode',
      width: 120,
      render: (code: string | null) =>
        code ? (
          <Tag color="green" style={{ fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => copyToClipboard(code)}>
            {code} <CopyOutlined />
          </Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '激活时间',
      dataIndex: 'activationTime',
      key: 'activationTime',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_: any, record: smsActivateAPI.SmsActivateCurrentActivation) => (
        <Space>
          {record.canGetAnotherSms && (
            <Tooltip title="请求重发">
              <Button
                type="link"
                size="small"
                icon={<SendOutlined />}
                onClick={() => handleResend(record.activationId)}
              >
                重发
              </Button>
            </Tooltip>
          )}
          <Popconfirm
            title="确定完成此激活？"
            onConfirm={() => handleFinishActivation(record.activationId)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<CheckCircleOutlined />}>
              完成
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定取消此激活？将会退款"
            onConfirm={() => handleCancelActivation(record.activationId)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<CloseCircleOutlined />} danger>
              取消
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /**
   * 租赁列表表格列定义
   */
  const rentColumns = [
    {
      title: '租赁ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '号码',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
      render: (phone: string) => (
        <Text copyable={{ text: `+${phone}` }}>+{phone}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          finish: 'default',
          cancel: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '到期时间',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 180,
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: smsActivateAPI.SmsActivateRentItem) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => viewRentStatus(record.id.toString())}
          >
            查看短信
          </Button>
          <Popconfirm
            title="确定完成此租赁？"
            onConfirm={() => handleFinishRent(record.id.toString())}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<CheckCircleOutlined />}>
              完成
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定取消此租赁？"
            onConfirm={() => handleCancelRent(record.id.toString())}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<CloseCircleOutlined />} danger>
              取消
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  /**
   * 国家表格列定义
   */
  const countryColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '英文名',
      dataIndex: 'eng',
      key: 'eng',
      width: 150,
    },
    {
      title: '中文名',
      dataIndex: 'chn',
      key: 'chn',
      width: 120,
    },
    {
      title: '俄文名',
      dataIndex: 'rus',
      key: 'rus',
      width: 150,
    },
    {
      title: '功能支持',
      key: 'features',
      width: 200,
      render: (_: any, record: smsActivateAPI.SmsActivateCountry) => (
        <Space wrap>
          {record.visible && <Tag color="blue">可见</Tag>}
          {record.retry && <Tag color="green">重发</Tag>}
          {record.rent && <Tag color="purple">租赁</Tag>}
          {record.multiService && <Tag color="orange">多服务</Tag>}
        </Space>
      ),
    },
  ];

  /**
   * 热门国家表格列定义
   */
  const topCountryColumns = [
    {
      title: '国家ID',
      dataIndex: 'country',
      key: 'country',
      width: 100,
    },
    {
      title: '可用数量',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price: number) => `₽${price.toFixed(2)}`,
    },
    {
      title: '零售价',
      dataIndex: 'retail_price',
      key: 'retail_price',
      width: 100,
      render: (price: number) => `₽${price.toFixed(2)}`,
    },
  ];

  return (
    <div>
      {/* 账户概览 */}
      {balanceInfo && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="账户余额"
                value={balanceInfo.balance}
                prefix="₽"
                precision={2}
                valueStyle={{ color: SEMANTIC.success.main }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="返现余额"
                value={balanceInfo.cashBack}
                prefix="₽"
                precision={2}
                valueStyle={{ color: PRIMARY.main }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="货币"
                value={balanceInfo.currency}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Tabs defaultActiveKey="activations">
        <TabPane tab="📱 当前激活" key="activations">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  当前激活列表
                </Title>
                <Text type="secondary">（共 {activations.length} 个）</Text>
              </Space>
            }
            extra={
              <Space>
                <Button onClick={loadActivations} loading={loading}>
                  <ReloadOutlined /> 刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setGetNumberModalVisible(true)}
                >
                  获取号码
                </Button>
              </Space>
            }
          >
            <Table
              columns={activationColumns}
              dataSource={activations}
              rowKey="activationId"
              loading={loading}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `共 ${total} 个`,
              }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="🏠 租赁管理" key="rent">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  租赁号码列表
                </Title>
                <Text type="secondary">（共 {rentList.length} 个）</Text>
              </Space>
            }
            extra={
              <Space>
                <Button onClick={loadRentList} loading={loading}>
                  <ReloadOutlined /> 刷新
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setRentModalVisible(true)}
                >
                  租用号码
                </Button>
              </Space>
            }
          >
            <Table
              columns={rentColumns}
              dataSource={rentList}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `共 ${total} 个`,
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="🌍 国家列表" key="countries">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  <GlobalOutlined /> 支持的国家
                </Title>
                <Text type="secondary">（共 {countries.length} 个）</Text>
              </Space>
            }
            extra={
              <Button onClick={loadCountries} loading={loading}>
                <ReloadOutlined /> 加载国家
              </Button>
            }
          >
            <Table
              columns={countryColumns}
              dataSource={countries}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `共 ${total} 个`,
              }}
            />
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
                  value={priceCountry}
                  onChange={(v) => setPriceCountry(v)}
                >
                  {countries.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.chn || c.eng} ({c.id})
                    </Option>
                  ))}
                </Select>
                <Input
                  style={{ width: 150 }}
                  placeholder="服务代码"
                  value={priceService}
                  onChange={(e) => setPriceService(e.target.value)}
                />
                <Button type="primary" onClick={loadPrices} loading={loading}>
                  <ReloadOutlined /> 查询价格
                </Button>
              </Space>
            }
          >
            {Object.keys(prices).length === 0 ? (
              <Empty description="选择国家和服务后点击查询价格" />
            ) : (
              <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                {Object.entries(prices).map(([countryId, services]) => (
                  <Card
                    key={countryId}
                    size="small"
                    title={<Tag color="blue">国家 ID: {countryId}</Tag>}
                    style={{ marginBottom: 16 }}
                  >
                    <Row gutter={[8, 8]}>
                      {Object.entries(services as Record<string, any>).map(([service, info]: [string, any]) => (
                        <Col key={service} span={6}>
                          <Card size="small">
                            <Statistic
                              title={service}
                              value={info.cost}
                              prefix="₽"
                              suffix={<Text type="secondary" style={{ fontSize: 12 }}>/ {info.count}个</Text>}
                            />
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

        <TabPane tab="🔥 热门国家" key="topCountries">
          <Card
            title={
              <Space>
                <Title level={5} style={{ margin: 0 }}>
                  <HistoryOutlined /> 热门国家（按服务）
                </Title>
              </Space>
            }
            extra={
              <Space>
                <Select
                  style={{ width: 150 }}
                  value={topCountryService}
                  onChange={(v) => setTopCountryService(v)}
                >
                  {Object.entries(serviceMapping).map(([name, code]) => (
                    <Option key={code} value={name}>
                      {name} ({code})
                    </Option>
                  ))}
                </Select>
                <Button type="primary" onClick={loadTopCountries} loading={loading}>
                  <ReloadOutlined /> 查询
                </Button>
              </Space>
            }
          >
            <Table
              columns={topCountryColumns}
              dataSource={topCountries}
              rowKey="country"
              loading={loading}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `共 ${total} 个`,
              }}
            />
          </Card>
        </TabPane>

        <TabPane tab="📋 服务映射" key="serviceMapping">
          <Card
            title={
              <Title level={5} style={{ margin: 0 }}>
                服务代码对照表
              </Title>
            }
          >
            <Row gutter={[16, 16]}>
              {Object.entries(serviceMapping).map(([name, code]) => (
                <Col key={name} span={6}>
                  <Card size="small">
                    <Space>
                      <Text strong>{name}</Text>
                      <Text type="secondary">→</Text>
                      <Tag color="blue">{code}</Tag>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </TabPane>
      </Tabs>

      {/* 获取号码模态框 */}
      <Modal
        title="获取虚拟号码"
        open={getNumberModalVisible}
        onOk={handleGetNumber}
        onCancel={() => {
          setGetNumberModalVisible(false);
          numberForm.resetFields();
        }}
        confirmLoading={loading}
        width={600}
      >
        <Form form={numberForm} layout="vertical">
          <Form.Item
            label="服务"
            name="service"
            rules={[{ required: true, message: '请选择或输入服务' }]}
          >
            <Select
              showSearch
              placeholder="选择服务"
              optionFilterProp="children"
              allowClear
            >
              {Object.entries(serviceMapping).map(([name, code]) => (
                <Option key={code} value={name}>
                  {name} ({code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="国家"
            name="country"
            initialValue={0}
          >
            <Select
              showSearch
              placeholder="选择国家"
              optionFilterProp="children"
            >
              <Option value={0}>俄罗斯 (0)</Option>
              {countries.map((country) => (
                <Option key={country.id} value={country.id}>
                  {country.chn || country.eng} ({country.id})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="运营商"
            name="operator"
          >
            <Input placeholder="可选，留空自动选择" />
          </Form.Item>
        </Form>
      </Modal>

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
            rules={[{ required: true, message: '请选择服务' }]}
          >
            <Select
              showSearch
              placeholder="选择服务"
              optionFilterProp="children"
            >
              {Object.entries(serviceMapping).map(([name, code]) => (
                <Option key={code} value={name}>
                  {name} ({code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="国家"
            name="country"
            initialValue={0}
          >
            <Select
              showSearch
              placeholder="选择国家"
              optionFilterProp="children"
            >
              <Option value={0}>俄罗斯 (0)</Option>
              {countries.filter(c => c.rent).map((country) => (
                <Option key={country.id} value={country.id}>
                  {country.chn || country.eng} ({country.id})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="租用时长（小时）"
            name="hours"
            initialValue={4}
            rules={[{ required: true, message: '请输入租用时长' }]}
          >
            <InputNumber
              min={1}
              max={168}
              style={{ width: '100%' }}
              placeholder="1-168 小时"
            />
          </Form.Item>

          <Text type="secondary">
            SMS-Activate 支持的租用时长通常为 4, 12, 24 小时等固定时段。
          </Text>
        </Form>
      </Modal>

      {/* 租赁状态/短信模态框 */}
      <Modal
        title={`租赁详情 - ID: ${selectedRentId}`}
        open={rentStatusModalVisible}
        onCancel={() => setRentStatusModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setRentStatusModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {rentStatus ? (
          <div>
            <Descriptions bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="状态">{rentStatus.status}</Descriptions.Item>
              <Descriptions.Item label="短信数量">{rentStatus.quantity}</Descriptions.Item>
            </Descriptions>

            <Title level={5}>收到的短信</Title>
            {rentStatus.values.length === 0 ? (
              <Empty description="暂无短信" />
            ) : (
              <Table
                dataSource={rentStatus.values}
                rowKey={(record, index) => `${record.date}-${index}`}
                columns={[
                  {
                    title: '发送方',
                    dataIndex: 'phoneFrom',
                    key: 'phoneFrom',
                    width: 150,
                  },
                  {
                    title: '内容',
                    dataIndex: 'text',
                    key: 'text',
                    render: (text: string) => (
                      <Text copyable={{ text }}>{text}</Text>
                    ),
                  },
                  {
                    title: '时间',
                    dataIndex: 'date',
                    key: 'date',
                    width: 180,
                    render: (date: string) => new Date(date).toLocaleString('zh-CN'),
                  },
                ]}
                pagination={false}
              />
            )}
          </div>
        ) : (
          <Spin />
        )}
      </Modal>
    </div>
  );
};

export default SmsActivateAdvancedTab;
