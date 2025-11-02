import React from 'react';
import { Modal, Form, Select, Input, Progress } from 'antd';
import type { FormInstance } from 'antd';

const { TextArea } = Input;
const { Option } = Select;

interface BatchOperationModalProps {
  visible: boolean;
  groupName?: string;
  batchProgress: number;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: () => void;
}

/**
 * 批量操作模态框
 */
export const BatchOperationModal: React.FC<BatchOperationModalProps> = React.memo(
  ({ visible, groupName, batchProgress, form, onCancel, onSubmit }) => {
    return (
      <Modal
        title={`批量操作: ${groupName || ''}`}
        open={visible}
        onCancel={onCancel}
        onOk={onSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="操作类型"
            name="operation"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="选择操作">
              <Option value="start">启动所有设备</Option>
              <Option value="stop">停止所有设备</Option>
              <Option value="restart">重启所有设备</Option>
              <Option value="install-app">批量安装应用</Option>
              <Option value="update-config">批量更新配置</Option>
            </Select>
          </Form.Item>

          <Form.Item label="参数 (JSON)" name="params">
            <TextArea rows={4} placeholder='{"appId": "xxx"}' />
          </Form.Item>
        </Form>

        {batchProgress > 0 && <Progress percent={batchProgress} />}
      </Modal>
    );
  }
);

BatchOperationModal.displayName = 'BatchOperationModal';
