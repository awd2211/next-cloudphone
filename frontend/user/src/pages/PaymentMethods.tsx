import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  List,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Popconfirm,
  Alert,
  Typography,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  AlipayOutlined,
  WechatOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'alipay' | 'wechat' | 'bank_card';
  name: string;
  lastFourDigits?: string;
  isDefault: boolean;
  createdAt: string;
}

const PaymentMethods = () => {
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      // 模拟数据 - 实际应该调用API
      const mockData: PaymentMethod[] = [
        {
          id: '1',
          type: 'alipay',
          name: '支付宝',
          isDefault: true,
          createdAt: '2024-01-01',
        },
        {
          id: '2',
          type: 'wechat',
          name: '微信支付',
          isDefault: false,
          createdAt: '2024-01-02',
        },
      ];
      setPaymentMethods(mockData);
    } catch (error) {
      message.error('加载支付方式失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async (values: any) => {
    try {
      // 实际应该调用API
      message.success('支付方式添加成功');
      setAddModalVisible(false);
      form.resetFields();
      loadPaymentMethods();
    } catch (error: any) {
      message.error(error.message || '添加失败');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // 实际应该调用API
      message.success('已设置为默认支付方式');
      loadPaymentMethods();
    } catch (error: any) {
      message.error(error.message || '设置失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // 实际应该调用API
      message.success('支付方式已删除');
      loadPaymentMethods();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'alipay':
        return <AlipayOutlined style={{ fontSize: 24, color: '#1677FF' }} />;
      case 'wechat':
        return <WechatOutlined style={{ fontSize: 24, color: '#07C160' }} />;
      case 'credit_card':
      case 'bank_card':
        return <CreditCardOutlined style={{ fontSize: 24 }} />;
      default:
        return <CreditCardOutlined style={{ fontSize: 24 }} />;
    }
  };

  const getPaymentTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
      credit_card: '信用卡',
      bank_card: '银行卡',
    };
    return typeMap[type] || type;
  };

  return (
    <div>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/profile')}>
          返回个人中心
        </Button>
      </Space>

      <Title level={2}>支付方式管理</Title>
      <Alert
        message="安全提示"
        description="您的支付信息经过加密存储，我们不会保存完整的卡号和密码信息"
        type="info"
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      <Card
        title="我的支付方式"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>
            添加支付方式
          </Button>
        }
      >
        {paymentMethods.length === 0 ? (
          <Empty description="暂无支付方式" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            loading={loading}
            dataSource={paymentMethods}
            renderItem={(item) => (
              <List.Item
                actions={[
                  !item.isDefault && (
                    <Button type="link" onClick={() => handleSetDefault(item.id)} key="set-default">
                      设为默认
                    </Button>
                  ),
                  <Popconfirm
                    key="delete"
                    title="确定要删除此支付方式吗？"
                    onConfirm={() => handleDelete(item.id)}
                    okText="确定"
                    cancelText="取消"
                    disabled={item.isDefault}
                  >
                    <Button type="link" danger icon={<DeleteOutlined />} disabled={item.isDefault}>
                      删除
                    </Button>
                  </Popconfirm>,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={getPaymentIcon(item.type)}
                  title={
                    <Space>
                      <Text strong>{getPaymentTypeName(item.type)}</Text>
                      {item.isDefault && (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          默认
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <div>{item.name}</div>
                      {item.lastFourDigits && (
                        <Text type="secondary">**** {item.lastFourDigits}</Text>
                      )}
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          添加时间: {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 添加支付方式模态框 */}
      <Modal
        title="添加支付方式"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={() => form.submit()}
        okText="添加"
        cancelText="取消"
        width={600}
      >
        <Alert
          message="支持的支付方式"
          description="支付宝、微信支付、银行卡、信用卡"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical" onFinish={handleAddPaymentMethod}>
          <Form.Item
            label="支付方式类型"
            name="type"
            rules={[{ required: true, message: '请选择支付方式类型' }]}
          >
            <Select placeholder="请选择">
              <Option value="alipay">
                <Space>
                  <AlipayOutlined />
                  支付宝
                </Space>
              </Option>
              <Option value="wechat">
                <Space>
                  <WechatOutlined />
                  微信支付
                </Space>
              </Option>
              <Option value="bank_card">
                <Space>
                  <CreditCardOutlined />
                  银行卡
                </Space>
              </Option>
              <Option value="credit_card">
                <Space>
                  <CreditCardOutlined />
                  信用卡
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="账户名称"
            name="name"
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input placeholder="例如：我的支付宝账户" />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              if (type === 'alipay') {
                return (
                  <Form.Item
                    label="支付宝账号"
                    name="account"
                    rules={[{ required: true, message: '请输入支付宝账号' }]}
                  >
                    <Input placeholder="手机号或邮箱" />
                  </Form.Item>
                );
              }
              if (type === 'wechat') {
                return (
                  <Alert
                    message="微信支付绑定"
                    description="请使用微信扫码绑定您的微信账号"
                    type="warning"
                    showIcon
                  />
                );
              }
              if (type === 'bank_card' || type === 'credit_card') {
                return (
                  <>
                    <Form.Item
                      label="卡号"
                      name="cardNumber"
                      rules={[
                        { required: true, message: '请输入卡号' },
                        { pattern: /^\d{16,19}$/, message: '请输入有效的卡号' },
                      ]}
                    >
                      <Input placeholder="请输入16-19位卡号" maxLength={19} />
                    </Form.Item>
                    <Form.Item
                      label="持卡人姓名"
                      name="cardHolder"
                      rules={[{ required: true, message: '请输入持卡人姓名' }]}
                    >
                      <Input placeholder="请输入持卡人姓名" />
                    </Form.Item>
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* 使用说明 */}
      <Card title="使用说明" style={{ marginTop: 24 }} bordered={false}>
        <ul>
          <li>您可以添加多个支付方式，并设置默认支付方式</li>
          <li>默认支付方式将在充值和支付时优先使用</li>
          <li>删除支付方式前请确保没有进行中的交易</li>
          <li>我们采用业界标准加密技术保护您的支付信息</li>
          <li>如有疑问，请联系客服：400-123-4567</li>
        </ul>
      </Card>
    </div>
  );
};

export default PaymentMethods;
