/**
 * QuickTemplatesCard - 快速模板卡片组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Card, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface QuickTemplatesCardProps {
  templates: any[];
  onCreateFromTemplate: (templateId: string) => void;
}

/**
 * QuickTemplatesCard 组件
 * 显示快速创建模板按钮
 */
export const QuickTemplatesCard = memo<QuickTemplatesCardProps>(
  ({ templates, onCreateFromTemplate }) => {
    if (templates.length === 0) return null;

    return (
      <Card title="快速创建" size="small">
        <Space wrap>
          {templates.map((template: any) => (
            <Button
              key={template.id}
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => onCreateFromTemplate(template.id)}
            >
              {template.name}
            </Button>
          ))}
        </Space>
      </Card>
    );
  }
);

QuickTemplatesCard.displayName = 'QuickTemplatesCard';
