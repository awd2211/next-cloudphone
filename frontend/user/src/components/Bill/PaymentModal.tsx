import React from 'react';
import { Modal, Space, Select, Typography, theme } from 'antd';
import { formatAmount, PaymentMethod, type Bill } from '@/services/billing';
import { paymentMethodConfig } from '@/utils/billingConfig';

const { Text } = Typography;
const { Option } = Select;
const { useToken } = theme;

interface PaymentModalProps {
  visible: boolean;
  bill: Bill;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * 支付弹窗组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 使用配置数据驱动支付方式选项
 */
export const PaymentModal: React.FC<PaymentModalProps> = React.memo(
  ({ visible, bill, paymentMethod, onPaymentMethodChange, onOk, onCancel }) => {
    const { token } = useToken();

    return (
      <Modal
        title="支付账单"
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText="确认支付"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 应付金额 */}
          <div>
            <Text>应付金额：</Text>
            <Text strong style={{ fontSize: 24, color: token.colorPrimary }}>
              {formatAmount(bill.finalAmount)}
            </Text>
          </div>

          {/* 选择支付方式 */}
          <div>
            <Text>选择支付方式：</Text>
            <Select
              value={paymentMethod}
              onChange={onPaymentMethodChange}
              style={{ width: '100%', marginTop: 8 }}
              size="large"
            >
              {Object.entries(paymentMethodConfig).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>
          </div>
        </Space>
      </Modal>
    );
  }
);

PaymentModal.displayName = 'PaymentModal';
