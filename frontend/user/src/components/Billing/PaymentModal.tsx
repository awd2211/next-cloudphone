import React, { useMemo } from 'react';
import { Modal, Space, Card, Tag, Select } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { formatAmount, BillType, PaymentMethod, type Bill } from '@/services/billing';

const { Option } = Select;

interface PaymentModalProps {
  visible: boolean;
  bill: Bill | null;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 支付弹窗组件
 * 展示账单信息并选择支付方式
 */
export const PaymentModal: React.FC<PaymentModalProps> = React.memo(({
  visible,
  bill,
  paymentMethod,
  onPaymentMethodChange,
  onConfirm,
  onCancel,
}) => {
  // 账单类型配置
  const billTypeConfig: Record<BillType, { label: string; color: string }> = useMemo(() => ({
    [BillType.SUBSCRIPTION]: { label: '订阅费', color: 'blue' },
    [BillType.USAGE]: { label: '使用费', color: 'cyan' },
    [BillType.RECHARGE]: { label: '充值', color: 'green' },
    [BillType.REFUND]: { label: '退款', color: 'orange' },
    [BillType.PENALTY]: { label: '违约金', color: 'red' },
    [BillType.DISCOUNT]: { label: '折扣', color: 'purple' },
    [BillType.COUPON]: { label: '优惠券', color: 'magenta' },
    [BillType.COMMISSION]: { label: '佣金', color: 'gold' },
  }), []);

  // 支付方式配置
  const paymentMethodConfig: Record<PaymentMethod, { label: string; color: string }> = useMemo(() => ({
    [PaymentMethod.BALANCE]: { label: '余额支付', color: 'blue' },
    [PaymentMethod.ALIPAY]: { label: '支付宝', color: 'cyan' },
    [PaymentMethod.WECHAT]: { label: '微信支付', color: 'green' },
    [PaymentMethod.CREDIT_CARD]: { label: '信用卡', color: 'gold' },
    [PaymentMethod.PAYPAL]: { label: 'PayPal', color: 'geekblue' },
  }), []);

  return (
    <Modal
      title={
        <Space>
          <WalletOutlined /> 支付账单
        </Space>
      }
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="确认支付"
      cancelText="取消"
    >
      {bill && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>账单号：</span>
                <span>{bill.billNo}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>账单类型：</span>
                <Tag color={billTypeConfig[bill.type].color}>
                  {billTypeConfig[bill.type].label}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>应付金额：</span>
                <span style={{ fontSize: 20, fontWeight: 'bold', color: '#1890ff' }}>
                  {formatAmount(bill.finalAmount)}
                </span>
              </div>
            </Space>
          </Card>

          <div>
            <div style={{ marginBottom: 8 }}>选择支付方式：</div>
            <Select
              value={paymentMethod}
              onChange={onPaymentMethodChange}
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
  );
});

PaymentModal.displayName = 'PaymentModal';
