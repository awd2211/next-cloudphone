/**
 * BalanceModal - 余额操作对话框组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, Input, InputNumber } from 'antd';
import type { FormInstance } from 'antd';
import type { User } from '@/types';
import { ErrorAlert, type ErrorInfo } from '@/components/ErrorAlert';

interface BalanceModalProps {
  visible: boolean;
  form: FormInstance;
  balanceType: 'recharge' | 'deduct';
  selectedUser: User | null;
  error: ErrorInfo | null;
  onCancel: () => void;
  onFinish: (values: { amount: number; reason?: string }) => void;
  onClearError: () => void;
  onRetry: () => void;
}

/**
 * BalanceModal 组件
 * 余额充值/扣减的对话框
 */
export const BalanceModal = memo<BalanceModalProps>(
  ({ visible, form, balanceType, selectedUser, error, onCancel, onFinish, onClearError, onRetry }) => {
    return (
      <Modal
        title={balanceType === 'recharge' ? '充值余额' : '扣减余额'}
        open={visible}
        onCancel={onCancel}
        onOk={() => form.submit()}
      >
        {/* 余额操作错误提示 */}
        {error && (
          <ErrorAlert
            error={error}
            onClose={onClearError}
            onRetry={onRetry}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item label="当前余额">
            <Input value={`¥${(selectedUser?.balance || 0).toFixed(2)}`} disabled />
          </Form.Item>

          <Form.Item label="金额" name="amount" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber
              min={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="请输入金额"
              prefix="¥"
            />
          </Form.Item>

          {balanceType === 'deduct' && (
            <Form.Item label="原因" name="reason">
              <Input.TextArea placeholder="请输入扣减原因" rows={3} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    );
  }
);

BalanceModal.displayName = 'BalanceModal';
