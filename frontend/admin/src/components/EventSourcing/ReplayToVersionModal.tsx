import { memo } from 'react';
import { Modal, Form, Input, Alert } from 'antd';
import type { FormInstance } from 'antd';

interface ReplayToVersionModalProps {
  visible: boolean;
  form: FormInstance;
  userEventsCount: number;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * 重放到版本Modal组件
 * 允许用户指定版本号并重放到该版本
 */
export const ReplayToVersionModal = memo<ReplayToVersionModalProps>(
  ({ visible, form, userEventsCount, onOk, onCancel }) => {
    return (
      <Modal
        title="重放到特定版本"
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText="重放"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="version"
            label="目标版本号"
            rules={[
              { required: true, message: '请输入版本号' },
              { type: 'number', min: 1, message: '版本号必须大于0' },
            ]}
          >
            <Input type="number" placeholder="例如: 5" />
          </Form.Item>
          <Alert
            message="提示"
            description={`当前用户有 ${userEventsCount} 个事件。重放到指定版本将显示用户在该版本时的状态。`}
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    );
  }
);

ReplayToVersionModal.displayName = 'ReplayToVersionModal';
