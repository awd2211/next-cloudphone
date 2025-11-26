import { Modal, Input } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';
import { NEUTRAL_LIGHT } from '@/theme';
import { memo, useCallback } from 'react';
import { ErrorAlert, type ErrorInfo } from '@/components/ErrorAlert';

interface TwoFactorModalProps {
  visible: boolean;
  loading: boolean;
  token: string;
  error: ErrorInfo | null;
  onTokenChange: (token: string) => void;
  onVerify: () => void;
  onCancel: () => void;
  onErrorClose: () => void;
}

/**
 * 双因素认证 Modal 组件
 * 用于输入和验证 6 位验证码
 */
export const TwoFactorModal = memo<TwoFactorModalProps>(
  ({ visible, loading, token, error, onTokenChange, onVerify, onCancel, onErrorClose }) => {
    const handleTokenChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        // 只允许数字输入
        const value = e.target.value.replace(/\D/g, '');
        onTokenChange(value);
      },
      [onTokenChange]
    );

    return (
      <Modal
        title="双因素认证"
        open={visible}
        onCancel={onCancel}
        onOk={onVerify}
        okText="验证"
        cancelText="取消"
        okButtonProps={{ loading }}
      >
        <div style={{ padding: '20px 0' }}>
          {/* 错误提示 */}
          {error && (
            <ErrorAlert
              error={error}
              onClose={onErrorClose}
              onRetry={onVerify}
              style={{ marginBottom: 16 }}
            />
          )}

          <p style={{ marginBottom: 16, color: NEUTRAL_LIGHT.text.secondary }}>
            请输入验证器应用中显示的6位验证码
          </p>
          <Input
            placeholder="请输入6位验证码"
            value={token}
            onChange={handleTokenChange}
            maxLength={6}
            size="large"
            prefix={<SafetyOutlined />}
            autoFocus
            onPressEnter={onVerify}
          />
        </div>
      </Modal>
    );
  }
);

TwoFactorModal.displayName = 'TwoFactorModal';
