import React from 'react';
import { Modal, Input } from 'antd';
import { SafetyOutlined } from '@ant-design/icons';

interface TwoFactorModalProps {
  visible: boolean;
  loading: boolean;
  token: string;
  onTokenChange: (token: string) => void;
  onVerify: () => void;
  onCancel: () => void;
}

/**
 * 双因素认证弹窗组件
 * 用于输入6位2FA验证码
 */
export const TwoFactorModal: React.FC<TwoFactorModalProps> = React.memo(({
  visible,
  loading,
  token,
  onTokenChange,
  onVerify,
  onCancel,
}) => {
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
        <p style={{ marginBottom: 16, color: '#666' }}>
          请输入验证器应用中显示的6位验证码
        </p>
        <Input
          placeholder="请输入6位验证码"
          value={token}
          onChange={(e) => onTokenChange(e.target.value.replace(/\D/g, ''))}
          maxLength={6}
          size="large"
          prefix={<SafetyOutlined />}
          autoFocus
          onPressEnter={onVerify}
        />
      </div>
    </Modal>
  );
});

TwoFactorModal.displayName = 'TwoFactorModal';
