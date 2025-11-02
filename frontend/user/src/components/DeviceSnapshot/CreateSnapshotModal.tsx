import React from 'react';
import { Modal, Form, Input, Alert, type FormInstance } from 'antd';
import { createSnapshotWarning } from '@/utils/snapshotConfig';

interface CreateSnapshotModalProps {
  visible: boolean;
  form: FormInstance;
  onCancel: () => void;
  onSubmit: () => void;
}

/**
 * 创建快照 Modal 组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的警告信息
 * - 表单验证规则清晰
 */
export const CreateSnapshotModal: React.FC<CreateSnapshotModalProps> = React.memo(
  ({ visible, form, onCancel, onSubmit }) => {
    return (
      <Modal
        title="创建快照"
        open={visible}
        onCancel={onCancel}
        onOk={onSubmit}
        okText="创建"
        cancelText="取消"
      >
        <Alert
          message={createSnapshotWarning.message}
          description={createSnapshotWarning.description}
          type={createSnapshotWarning.type}
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          <Form.Item
            label="快照名称"
            name="name"
            rules={[
              { required: true, message: '请输入快照名称' },
              { max: 50, message: '名称不能超过50个字符' },
            ]}
          >
            <Input placeholder="例如：系统配置备份-20240101" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="记录此快照的用途或包含的内容" maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

CreateSnapshotModal.displayName = 'CreateSnapshotModal';
