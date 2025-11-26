import React from 'react';
import { Modal, Form, Select, Radio, Space, Divider } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';
import { BgColorsOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { LANGUAGE_OPTIONS, THEME_OPTIONS } from './constants';

interface PreferencesModalProps {
  visible: boolean;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: (values: { language: string; theme: string }) => Promise<void>;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = React.memo(
  ({ visible, form, onCancel, onSubmit }) => {
    const handleCancel = () => {
      onCancel();
      form.resetFields();
    };

    return (
      <Modal
        title="偏好设置"
        open={visible}
        onCancel={handleCancel}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} onFinish={onSubmit} layout="vertical">
          <Form.Item
            label="界面语言"
            name="language"
            rules={[{ required: true, message: '请选择界面语言' }]}
          >
            <Select options={LANGUAGE_OPTIONS} />
          </Form.Item>

          <Form.Item
            label="主题风格"
            name="theme"
            rules={[{ required: true, message: '请选择主题风格' }]}
          >
            <Radio.Group>
              {THEME_OPTIONS.map((option) => (
                <Radio.Button key={option.value} value={option.value}>
                  <Space>
                    {option.value === 'auto' ? <BgColorsOutlined /> : option.icon}
                    {option.label}
                  </Space>
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ color: NEUTRAL_LIGHT.text.secondary }}>💡 提示：</div>
              <ul style={{ color: NEUTRAL_LIGHT.text.secondary, paddingLeft: 20, margin: 0 }}>
                <li>语言设置将影响整个管理后台的界面语言</li>
                <li>深色模式可以减轻眼睛疲劳，适合在夜间使用</li>
                <li>跟随系统将根据您的操作系统主题自动切换</li>
              </ul>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

PreferencesModal.displayName = 'PreferencesModal';
