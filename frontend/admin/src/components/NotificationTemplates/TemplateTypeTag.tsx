import { memo } from 'react';
import { Tag } from 'antd';
import { TYPE_CONFIG } from './constants';

interface TemplateTypeTagProps {
  type: string;
}

export const TemplateTypeTag = memo<TemplateTypeTagProps>(({ type }) => {
  const config = TYPE_CONFIG[type] || { color: 'default', label: type };
  return <Tag color={config.color}>{config.label}</Tag>;
});

TemplateTypeTag.displayName = 'TemplateTypeTag';
