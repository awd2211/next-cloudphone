import { memo } from 'react';
import { Space, Button, Tooltip, Popconfirm } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { AccessibleButton } from '@/components/Accessible/AccessibleButton';

// Frontend-specific NotificationTemplate type (different from backend API type)
export interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  type: string;
  language: string;
  channels: string[];
  title: string;
  body: string;
  emailTemplate?: string;
  smsTemplate?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface TemplateActionsProps {
  template: NotificationTemplate;
  onPreview: (template: NotificationTemplate) => void;
  onEdit: (template: NotificationTemplate) => void;
  onToggle: (id: string, isActive: boolean) => void;
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
          <Button type="link" size="small" onClick={() => onToggle(template.id, !template.isActive)}>
            {template.isActive ? '停用' : '激活'}
          </Button>
        </Tooltip>
        <Popconfirm
          title="确定删除此模板吗？"
          onConfirm={() => onDelete(template.id)}
          okText="确定"
          cancelText="取消"
        >
          <AccessibleButton
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            ariaLabel={`删除通知模板 ${template.name}`}
            ariaDescription="删除此通知模板，此操作不可恢复"
          />
        </Popconfirm>
      </Space>
    );
  }
);

TemplateActions.displayName = 'TemplateActions';
