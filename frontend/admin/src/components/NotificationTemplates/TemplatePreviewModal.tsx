import { memo, useMemo } from 'react';
import { Modal, Button, Row, Col, Tag, Typography, Card, Tabs } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { NotificationTemplate } from './TemplateActions';

const { Paragraph, Text } = Typography;

/**
 * 内容格式标签颜色映射
 */
const formatColorMap: Record<string, string> = {
  plain: 'default',
  html: 'blue',
  markdown: 'green',
};

/**
 * 内容格式中文标签
 */
const formatLabelMap: Record<string, string> = {
  plain: '纯文本',
  html: 'HTML',
  markdown: 'Markdown',
};

interface TemplatePreviewModalProps {
  visible: boolean;
  template: NotificationTemplate | null;
  onClose: () => void;
}

/**
 * Markdown 内容渲染组件
 */
const MarkdownContent = memo<{ content: string }>(({ content }) => (
  <div className="markdown-preview" style={{
    padding: 16,
    background: '#fafafa',
    borderRadius: 8,
    border: '1px solid #f0f0f0'
  }}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        // 自定义渲染样式
        h1: ({ children }) => <h1 style={{ fontSize: 24, marginBottom: 16 }}>{children}</h1>,
        h2: ({ children }) => <h2 style={{ fontSize: 20, marginBottom: 12 }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ fontSize: 16, marginBottom: 8 }}>{children}</h3>,
        p: ({ children }) => <p style={{ marginBottom: 8, lineHeight: 1.6 }}>{children}</p>,
        ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 8 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 8 }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code style={{
            background: '#f5f5f5',
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'monospace'
          }}>
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre style={{
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 8,
            overflow: 'auto',
            marginBottom: 8
          }}>
            {children}
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: '4px solid #1890ff',
            paddingLeft: 16,
            margin: '8px 0',
            color: '#666'
          }}>
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: 8
          }}>
            {children}
          </table>
        ),
        th: ({ children }) => (
          <th style={{
            border: '1px solid #d9d9d9',
            padding: 8,
            background: '#fafafa',
            textAlign: 'left'
          }}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td style={{ border: '1px solid #d9d9d9', padding: 8 }}>
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
));

MarkdownContent.displayName = 'MarkdownContent';

/**
 * HTML 内容渲染组件
 */
const HtmlContent = memo<{ content: string }>(({ content }) => (
  <div
    className="html-preview"
    style={{
      padding: 16,
      background: '#fafafa',
      borderRadius: 8,
      border: '1px solid #f0f0f0'
    }}
    dangerouslySetInnerHTML={{ __html: content }}
  />
));

HtmlContent.displayName = 'HtmlContent';

/**
 * 纯文本内容渲染组件
 */
const PlainTextContent = memo<{ content: string }>(({ content }) => (
  <Paragraph style={{
    whiteSpace: 'pre-wrap',
    padding: 16,
    background: '#fafafa',
    borderRadius: 8,
    border: '1px solid #f0f0f0',
    margin: 0
  }}>
    {content}
  </Paragraph>
));

PlainTextContent.displayName = 'PlainTextContent';

/**
 * 根据内容格式渲染内容
 */
const ContentRenderer = memo<{ content: string; format: string }>(({ content, format }) => {
  switch (format) {
    case 'markdown':
      return <MarkdownContent content={content} />;
    case 'html':
      return <HtmlContent content={content} />;
    default:
      return <PlainTextContent content={content} />;
  }
});

ContentRenderer.displayName = 'ContentRenderer';

export const TemplatePreviewModal = memo<TemplatePreviewModalProps>(
  ({ visible, template, onClose }) => {
    const contentFormat = template?.contentFormat || 'plain';

    // 构建预览标签页
    const previewTabs = useMemo(() => {
      if (!template) return [];

      const tabs = [];

      // 主内容预览
      if (template.body) {
        tabs.push({
          key: 'body',
          label: '内容预览',
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Text strong>标题：</Text>
                <Paragraph style={{ margin: '8px 0' }}>{template.title}</Paragraph>
              </div>
              <div>
                <Text strong>正文内容 </Text>
                <Tag color={formatColorMap[contentFormat]}>
                  {formatLabelMap[contentFormat]}
                </Tag>
              </div>
              <div style={{ marginTop: 8 }}>
                <ContentRenderer content={template.body} format={contentFormat} />
              </div>
            </div>
          ),
        });
      }

      // 邮件模板预览
      if (template.emailTemplate) {
        tabs.push({
          key: 'email',
          label: '邮件模板',
          children: (
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                邮件渠道专用模板（HTML 格式）
              </Text>
              <HtmlContent content={template.emailTemplate} />
            </div>
          ),
        });
      }

      // 短信模板预览
      if (template.smsTemplate) {
        tabs.push({
          key: 'sms',
          label: '短信模板',
          children: (
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                短信渠道专用模板（纯文本）
              </Text>
              <PlainTextContent content={template.smsTemplate} />
            </div>
          ),
        });
      }

      // 原始内容
      tabs.push({
        key: 'raw',
        label: '原始内容',
        children: (
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              模板原始内容（未渲染）
            </Text>
            <pre style={{
              padding: 16,
              background: '#1f1f1f',
              color: '#e6e6e6',
              borderRadius: 8,
              overflow: 'auto',
              fontSize: 13,
              lineHeight: 1.5
            }}>
              {template.body}
            </pre>
          </div>
        ),
      });

      return tabs;
    }, [template, contentFormat]);

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
        width={800}
      >
        {template && (
          <div>
            {/* 基本信息 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 12]}>
                <Col span={8}>
                  <Text type="secondary">模板代码</Text>
                  <Paragraph code copyable style={{ margin: '4px 0 0 0' }}>
                    {template.code}
                  </Paragraph>
                </Col>
                <Col span={8}>
                  <Text type="secondary">模板名称</Text>
                  <Paragraph style={{ margin: '4px 0 0 0' }}>{template.name}</Paragraph>
                </Col>
                <Col span={8}>
                  <Text type="secondary">状态</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={template.isActive ? 'success' : 'default'}>
                      {template.isActive ? '已激活' : '已停用'}
                    </Tag>
                  </div>
                </Col>
              </Row>

              <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
                <Col span={8}>
                  <Text type="secondary">通知类型</Text>
                  <Paragraph style={{ margin: '4px 0 0 0' }}>{template.type}</Paragraph>
                </Col>
                <Col span={8}>
                  <Text type="secondary">语言</Text>
                  <Paragraph style={{ margin: '4px 0 0 0' }}>{template.language}</Paragraph>
                </Col>
                <Col span={8}>
                  <Text type="secondary">内容格式</Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={formatColorMap[contentFormat]}>
                      {formatLabelMap[contentFormat]}
                    </Tag>
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 12 }}>
                <Text type="secondary">通知渠道</Text>
                <div style={{ marginTop: 4 }}>
                  {template.channels.map((channel: string) => (
                    <Tag key={channel} color="blue">{channel}</Tag>
                  ))}
                </div>
              </div>

              {template.description && (
                <div style={{ marginTop: 12 }}>
                  <Text type="secondary">描述</Text>
                  <Paragraph style={{ margin: '4px 0 0 0' }}>{template.description}</Paragraph>
                </div>
              )}
            </Card>

            {/* 内容预览标签页 */}
            <Tabs items={previewTabs} defaultActiveKey="body" />
          </div>
        )}
      </Modal>
    );
  }
);

TemplatePreviewModal.displayName = 'TemplatePreviewModal';
