import { memo } from 'react';
import { Space, Button, Tooltip, Popconfirm } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  type: string;
  title: string;
  body: string;
  emailTemplate?: string;
  smsTemplate?: string;
  channels: string[];
  language: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateActionsProps {
  template: NotificationTemplate;
  onPreview: (template: NotificationTemplate) => void;
  onEdit: (template: NotificationTemplate) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TemplateActions = memo<TemplateActionsProps>(
  ({ template, onPreview, onEdit, onToggle, onDelete }) => {
    return (
      <Space size="small">
        <Tooltip title="预览">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onPreview(template)}
          />
        </Tooltip>
        <Tooltip title="编辑">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(template)}
          />
        </Tooltip>
        <Tooltip title={template.isActive ? '停用' : '激活'}>
          <Button type="link" size="small" onClick={() => onToggle(template.id)}>
            {template.isActive ? '停用' : '激活'}
          </Button>
        </Tooltip>
        <Popconfirm
          title="确定删除此模板吗？"
          onConfirm={() => onDelete(template.id)}
          okText="确定"
          cancelText="取消"
        >
          <Tooltip title="删除">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      </Space>
    );
  }
);

TemplateActions.displayName = 'TemplateActions';
