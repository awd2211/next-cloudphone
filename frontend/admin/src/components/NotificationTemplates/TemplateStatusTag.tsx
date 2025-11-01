import { memo } from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined, StopOutlined } from '@ant-design/icons';

interface TemplateStatusTagProps {
  isActive: boolean;
}

export const TemplateStatusTag = memo<TemplateStatusTagProps>(({ isActive }) => {
  return isActive ? (
    <Tag color="success" icon={<CheckCircleOutlined />}>
      激活
    </Tag>
  ) : (
    <Tag color="default" icon={<StopOutlined />}>
      停用
    </Tag>
  );
});

TemplateStatusTag.displayName = 'TemplateStatusTag';
