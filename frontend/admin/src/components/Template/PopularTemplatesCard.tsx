import { memo } from 'react';
import { Card, Space, Tag } from 'antd';
import { FireOutlined } from '@ant-design/icons';
import type { DeviceTemplate } from '@/types';

interface PopularTemplatesCardProps {
  templates: DeviceTemplate[];
  onTemplateClick: (template: DeviceTemplate) => void;
}

export const PopularTemplatesCard = memo<PopularTemplatesCardProps>(
  ({ templates, onTemplateClick }) => {
    if (templates.length === 0) {
      return null;
    }

    return (
      <Card
        title={
          <span>
            <FireOutlined /> 热门模板
          </span>
        }
        style={{ marginBottom: '16px' }}
      >
        <Space wrap>
          {templates.map((template) => (
            <Tag
              key={template.id}
              color="orange"
              style={{ cursor: 'pointer', fontSize: '14px', padding: '4px 12px' }}
              onClick={() => onTemplateClick(template)}
            >
              {template.name} ({template.usageCount} 次使用)
            </Tag>
          ))}
        </Space>
      </Card>
    );
  }
);

PopularTemplatesCard.displayName = 'PopularTemplatesCard';
