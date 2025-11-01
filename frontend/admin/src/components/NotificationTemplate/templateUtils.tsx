import { Tag } from 'antd';

/**
 * 获取通知类型标签
 */
export const getTypeTag = (type: string) => {
  const map: Record<string, { color: string; text: string }> = {
    email: { color: 'blue', text: '邮件' },
    sms: { color: 'green', text: '短信' },
    websocket: { color: 'orange', text: '站内' },
  };
  const config = map[type] || map.email;
  return <Tag color={config.color}>{config.text}</Tag>;
};

/**
 * 获取内容类型标签
 */
export const getContentTypeTag = (type: string) => {
  const map: Record<string, { color: string; text: string }> = {
    plain: { color: 'default', text: '纯文本' },
    html: { color: 'blue', text: 'HTML' },
    markdown: { color: 'green', text: 'Markdown' },
  };
  const config = map[type] || map.plain;
  return <Tag color={config.color}>{config.text}</Tag>;
};

/**
 * 插入变量到表单内容
 */
export const insertVariableToContent = (form: any, varName: string) => {
  const content = form.getFieldValue('content') || '';
  const newContent = content + `{{${varName}}}`;
  form.setFieldsValue({ content: newContent });
};
