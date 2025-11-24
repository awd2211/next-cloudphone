import { useState } from 'react';
import { Modal, Form, Input, InputNumber, message, Radio, Alert, Space, theme } from 'antd';
import { DollarOutlined, AlipayOutlined, WechatOutlined, BankOutlined } from '@ant-design/icons';
import { applyWithdraw } from '@/services/referral';

const { useToken } = theme;

interface WithdrawModalProps {
  visible: boolean;
  availableBalance: number;
  onCancel: () => void;
  onSuccess: () => void;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({
  visible,
  availableBalance,
  onCancel,
  onSuccess,
}) => {
  const { token } = useToken();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'alipay' | 'wechat' | 'bank'>('alipay');

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const result = await applyWithdraw({
        amount: values.amount,
        method: values.method,
        account: values.account,
        accountName: values.accountName,
        remark: values.remark,
      });

      message.success(`提现申请已提交! ${result.message}`);
      form.resetFields();
      onSuccess();
    } catch (error: any) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(error.message || '提现申请失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const calculateFee = (amount: number) => {
    const feeRate = 0.01; // 1% 手续费
    return amount * feeRate;
  };

  const amount = Form.useWatch('amount', form) || 0;
  const fee = calculateFee(amount);
  const actualAmount = amount - fee;

  return (
    <Modal
      title={
        <Space>
          <DollarOutlined style={{ color: token.colorPrimary }} />
          <span>申请提现</span>
        </Space>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      okText="提交申请"
      cancelText="取消"
    >
      <Alert
        message={`可提现余额: ¥${availableBalance.toFixed(2)}`}
        description="提现申请提交后，将在 1-3 个工作日内到账"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          method: 'alipay',
        }}
      >
        {/* 提现金额 */}
        <Form.Item
          label="提现金额"
          name="amount"
          rules={[
            { required: true, message: '请输入提现金额' },
            {
              type: 'number',
              min: 10,
              message: '最低提现金额为 ¥10',
            },
            {
              validator: (_, value) => {
                if (value > availableBalance) {
                  return Promise.reject(new Error('提现金额不能超过可用余额'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            prefix="¥"
            style={{ width: '100%' }}
            min={10}
            max={availableBalance}
            precision={2}
            placeholder="请输入提现金额"
          />
        </Form.Item>

        {/* 提现方式 */}
        <Form.Item
          label="提现方式"
          name="method"
          rules={[{ required: true, message: '请选择提现方式' }]}
        >
          <Radio.Group onChange={(e) => setMethod(e.target.value)}>
            <Radio.Button value="alipay">
              <AlipayOutlined /> 支付宝
            </Radio.Button>
            <Radio.Button value="wechat">
              <WechatOutlined /> 微信
            </Radio.Button>
            <Radio.Button value="bank">
              <BankOutlined /> 银行卡
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* 账户信息 */}
        {method === 'alipay' && (
          <>
            <Form.Item
              label="支付宝账号"
              name="account"
              rules={[
                { required: true, message: '请输入支付宝账号' },
                {
                  pattern:
                    /^[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z0-9]{2,6}$|^1[3-9]\d{9}$/,
                  message: '请输入正确的支付宝账号',
                },
              ]}
            >
              <Input placeholder="手机号或邮箱" />
            </Form.Item>
            <Form.Item
              label="真实姓名"
              name="accountName"
              rules={[{ required: true, message: '请输入真实姓名' }]}
            >
              <Input placeholder="请输入与支付宝账号绑定的真实姓名" />
            </Form.Item>
          </>
        )}

        {method === 'wechat' && (
          <>
            <Form.Item
              label="微信号"
              name="account"
              rules={[{ required: true, message: '请输入微信号' }]}
            >
              <Input placeholder="请输入微信号" />
            </Form.Item>
            <Form.Item
              label="真实姓名"
              name="accountName"
              rules={[{ required: true, message: '请输入真实姓名' }]}
            >
              <Input placeholder="请输入与微信绑定的真实姓名" />
            </Form.Item>
          </>
        )}

        {method === 'bank' && (
          <>
            <Form.Item
              label="银行卡号"
              name="account"
              rules={[
                { required: true, message: '请输入银行卡号' },
                { pattern: /^\d{16,19}$/, message: '请输入正确的银行卡号' },
              ]}
            >
              <Input placeholder="请输入银行卡号" maxLength={19} />
            </Form.Item>
            <Form.Item
              label="开户人姓名"
              name="accountName"
              rules={[{ required: true, message: '请输入开户人姓名' }]}
            >
              <Input placeholder="请输入开户人姓名" />
            </Form.Item>
          </>
        )}

        {/* 备注 */}
        <Form.Item label="备注 (可选)" name="remark">
          <Input.TextArea rows={3} placeholder="如有特殊说明，请在此填写" />
        </Form.Item>
      </Form>

      {/* 费用明细 */}
      {amount > 0 && (
        <div
          style={{
            background: token.colorBgLayout,
            padding: 16,
            borderRadius: 4,
            marginTop: 16,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <span>提现金额:</span>
            <span style={{ float: 'right', fontWeight: 'bold' }}>¥{amount.toFixed(2)}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span>手续费 (1%):</span>
            <span style={{ float: 'right', color: token.colorError }}>-¥{fee.toFixed(2)}</span>
          </div>
          <div style={{ borderTop: '1px solid #d9d9d9', paddingTop: 8, marginTop: 8 }}>
            <span style={{ fontWeight: 'bold' }}>实际到账:</span>
            <span style={{ float: 'right', fontWeight: 'bold', color: token.colorSuccess, fontSize: 18 }}>
              ¥{actualAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default WithdrawModal;
