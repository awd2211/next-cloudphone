import React from 'react';
import { Card, Row, Col, Space, Switch, Typography, Alert } from 'antd';
import {
  MessageOutlined,
  MailOutlined,
  MobileOutlined,
  BellOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';

const { Text } = Typography;

interface NotificationMethodCardsProps {
  form: FormInstance;
}

/**
 * 通知方式卡片组件
 * 展示并管理邮件、短信、推送、声音四种通知方式
 */
export const NotificationMethodCards: React.FC<NotificationMethodCardsProps> = React.memo(({
  form,
}) => {
  const methods = [
    {
      name: 'emailEnabled',
      icon: <MailOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
      title: '邮件通知',
      description: '重要消息邮件提醒',
    },
    {
      name: 'smsEnabled',
      icon: <MobileOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: '短信通知',
      description: '紧急事件短信提醒',
    },
    {
      name: 'pushEnabled',
      icon: <BellOutlined style={{ fontSize: 32, color: '#faad14' }} />,
      title: '推送通知',
      description: '浏览器推送提醒',
    },
    {
      name: 'soundEnabled',
      icon: <SoundOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
      title: '声音提醒',
      description: '新消息声音提示',
    },
  ];

  return (
    <Card
      title={
        <Space>
          <MessageOutlined />
          <span>通知方式</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Row gutter={[16, 16]}>
        {methods.map((method) => (
          <Col xs={24} sm={12} lg={6} key={method.name}>
            <Card
              size="small"
              hoverable
              style={{
                textAlign: 'center',
                borderColor: form.getFieldValue(method.name) ? '#1890ff' : undefined,
              }}
            >
              <Space direction="vertical" size="small">
                {method.icon}
                <div>
                  <div style={{ fontWeight: 500 }}>{method.title}</div>
                  <Switch
                    checked={form.getFieldValue(method.name)}
                    onChange={(checked) => form.setFieldValue(method.name, checked)}
                  />
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {method.description}
                </Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Alert
        message="提示"
        description="邮件和短信通知可能会产生额外费用，建议仅对重要通知启用"
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Card>
  );
});

NotificationMethodCards.displayName = 'NotificationMethodCards';
