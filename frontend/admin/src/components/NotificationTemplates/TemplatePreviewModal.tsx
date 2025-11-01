import { memo } from 'react';
import { Modal, Button, Row, Col, Tag, Typography } from 'antd';
import type { NotificationTemplate } from './TemplateActions';

const { Paragraph, Text } = Typography;

interface TemplatePreviewModalProps {
  visible: boolean;
  template: NotificationTemplate | null;
  onClose: () => void;
}

export const TemplatePreviewModal = memo<TemplatePreviewModalProps>(
  ({ visible, template, onClose }) => {
    return (
      <Modal
        title="模板预览"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {template && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>模板代码：</Text>
                <Paragraph code copyable>
                  {template.code}
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>模板名称：</Text>
                <Paragraph>{template.name}</Paragraph>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>类型：</Text>
                <div>{template.type}</div>
              </Col>
              <Col span={12}>
                <Text strong>语言：</Text>
                <div>{template.language}</div>
              </Col>
            </Row>

            <div style={{ marginTop: 16 }}>
              <Text strong>通知渠道：</Text>
              <div style={{ marginTop: 8 }}>
                {template.channels.map((channel) => (
                  <Tag key={channel}>{channel}</Tag>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>标题：</Text>
              <Paragraph>{template.title}</Paragraph>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>内容：</Text>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{template.body}</Paragraph>
            </div>

            {template.emailTemplate && (
              <div style={{ marginTop: 16 }}>
                <Text strong>邮件模板：</Text>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                  {template.emailTemplate}
                </Paragraph>
              </div>
            )}

            {template.smsTemplate && (
              <div style={{ marginTop: 16 }}>
                <Text strong>短信模板：</Text>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{template.smsTemplate}</Paragraph>
              </div>
            )}

            {template.description && (
              <div style={{ marginTop: 16 }}>
                <Text strong>描述：</Text>
                <Paragraph>{template.description}</Paragraph>
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  }
);

TemplatePreviewModal.displayName = 'TemplatePreviewModal';
