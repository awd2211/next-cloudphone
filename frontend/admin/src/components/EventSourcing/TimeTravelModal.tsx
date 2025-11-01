import { memo } from 'react';
import { Modal, Form, DatePicker, Alert } from 'antd';
import type { FormInstance } from 'antd';

interface TimeTravelModalProps {
  visible: boolean;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * 时间旅行Modal组件
 * 允许用户选择时间点并查看该时间点的用户状态
 */
export const TimeTravelModal = memo<TimeTravelModalProps>(
  ({ visible, form, onOk, onCancel }) => {
    return (
      <Modal
        title="时间旅行"
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText="开始旅行"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="timestamp"
            label="目标时间点"
            rules={[{ required: true, message: '请选择时间点' }]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              placeholder="选择日期和时间"
              format="YYYY-MM-DD HH:mm:ss"
            />
          </Form.Item>
          <Alert
            message="时间旅行"
            description="选择一个历史时间点，系统将重放该时间点之前的所有事件，显示用户在那个时间的状态。"
            type="info"
            showIcon
          />
        </Form>
      </Modal>
    );
  }
);

TimeTravelModal.displayName = 'TimeTravelModal';
