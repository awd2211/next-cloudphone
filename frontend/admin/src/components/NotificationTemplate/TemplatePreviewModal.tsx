import { memo } from 'react';
import { Modal, Form, Input, Button, Card } from 'antd';
import type { FormInstance } from 'antd';
import type { NotificationTemplate } from '@/types';

interface TemplatePreviewModalProps {
  visible: boolean;
  template: NotificationTemplate | null;
  previewContent: string;
  form: FormInstance;
  onCancel: () => void;
  onPreview: () => void;
}

export const TemplatePreviewModal = memo<TemplatePreviewModalProps>(
  ({ visible, template, previewContent, form, onCancel, onPreview }) => {
    return (
      <Modal
        title={`预览: ${template?.name}`}
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical">
          {template?.variables.map((varName) => (
            <Form.Item key={varName} label={varName} name={varName}>
              <Input placeholder={`输入 ${varName} 的值`} />
            </Form.Item>
          ))}
          <Button type="primary" onClick={onPreview} style={{ marginBottom: '16px' }}>
            生成预览
          </Button>
        </Form>

        {previewContent && (
          <Card size="small" title="预览结果">
            <div
              dangerouslySetInnerHTML={
                template?.contentType === 'html' ? { __html: previewContent } : undefined
              }
            >
              {template?.contentType !== 'html' && previewContent}
            </div>
          </Card>
        )}
      </Modal>
    );
  }
);

TemplatePreviewModal.displayName = 'TemplatePreviewModal';
