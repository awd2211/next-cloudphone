import { memo } from 'react';
import { Modal, Form, Input, Descriptions } from 'antd';
import type { FormInstance } from 'antd';
import type { Application } from '@/types';
import { formatSize } from './appReviewUtils';

const { TextArea } = Input;

interface ReviewActionModalProps {
  visible: boolean;
  app: Application | null;
  action: 'approve' | 'reject' | 'request_changes';
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
  onFinish: (values: any) => void;
}

export const ReviewActionModal = memo<ReviewActionModalProps>(
  ({ visible, app, action, form, onOk, onCancel, onFinish }) => {
    const getTitle = () => {
      switch (action) {
        case 'approve':
          return '批准应用';
        case 'reject':
          return '拒绝应用';
        case 'request_changes':
          return '请求修改';
        default:
          return '审核操作';
      }
    };

    return (
      <Modal
        title={getTitle()}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        width={600}
      >
        {app && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="应用名称" span={2}>
                {app.name}
              </Descriptions.Item>
              <Descriptions.Item label="包名" span={2}>
                {app.packageName}
              </Descriptions.Item>
              <Descriptions.Item label="版本">{app.versionName}</Descriptions.Item>
              <Descriptions.Item label="大小">{formatSize(app.size)}</Descriptions.Item>
            </Descriptions>

            <Form form={form} onFinish={onFinish} layout="vertical">
              {action === 'approve' && (
                <Form.Item label="批准意见（可选）" name="comment">
                  <TextArea rows={3} placeholder="可以添加一些批准意见或建议" />
                </Form.Item>
              )}
              {action === 'reject' && (
                <Form.Item
                  label="拒绝原因"
                  name="reason"
                  rules={[{ required: true, message: '请输入拒绝原因' }]}
                >
                  <TextArea rows={4} placeholder="请详细说明拒绝原因，帮助开发者改进应用" />
                </Form.Item>
              )}
              {action === 'request_changes' && (
                <Form.Item
                  label="需要修改的内容"
                  name="changes"
                  rules={[{ required: true, message: '请输入需要修改的内容' }]}
                >
                  <TextArea rows={4} placeholder="请详细列出需要修改的内容" />
                </Form.Item>
              )}
            </Form>
          </>
        )}
      </Modal>
    );
  }
);

ReviewActionModal.displayName = 'ReviewActionModal';
