import React from 'react';
import { Card, Row, Col, Space, Switch, Typography, theme } from 'antd';
import {
  BellOutlined,
  MessageOutlined,
  MobileOutlined,
} from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';

const { Text, Paragraph } = Typography;
const { useToken } = theme;

interface NotificationTypeListProps {
  form: FormInstance;
}

/**
 * 通知类型列表组件
 * 展示并管理各类通知类型的开关
 */
export const NotificationTypeList: React.FC<NotificationTypeListProps> = React.memo(({
  form,
}) => {
  const { token } = useToken();

  const types = [
    {
      name: 'systemNotifications',
      icon: <BellOutlined style={{ fontSize: 18, color: token.colorPrimary }} />,
      title: '系统通知',
      description: '系统公告、维护通知',
    },
    {
      name: 'ticketNotifications',
      icon: <MessageOutlined style={{ fontSize: 18, color: token.colorSuccess }} />,
      title: '工单通知',
      description: '工单回复、状态变更',
    },
    {
      name: 'orderNotifications',
      icon: <MessageOutlined style={{ fontSize: 18, color: token.colorWarning }} />,
      title: '订单通知',
      description: '订单创建、完成、失败',
    },
    {
      name: 'deviceNotifications',
      icon: <MobileOutlined style={{ fontSize: 18, color: token['cyan-6'] ?? '#13c2c2' }} />,
      title: '设备通知',
      description: '设备状态、应用安装',
    },
    {
      name: 'billingNotifications',
      icon: <MessageOutlined style={{ fontSize: 18, color: token['magenta-6'] ?? '#eb2f96' }} />,
      title: '账单通知',
      description: '充值、余额不足',
    },
    {
      name: 'promotionNotifications',
      icon: <MessageOutlined style={{ fontSize: 18, color: token['orange-6'] ?? '#fa8c16' }} />,
      title: '促销通知',
      description: '优惠活动、新功能',
    },
  ];

  return (
    <Card
      title={
        <Space>
          <BellOutlined />
          <span>通知类型</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Paragraph type="secondary">选择您希望接收的通知类型</Paragraph>

      <Row gutter={[24, 16]}>
        {types.map((type) => (
          <Col xs={24} sm={12} lg={8} key={type.name}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                borderRadius: '4px',
                backgroundColor: token.colorBgLayout,
              }}
            >
              <Space>
                {type.icon}
                <div>
                  <div style={{ fontWeight: 500 }}>{type.title}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {type.description}
                  </Text>
                </div>
              </Space>
              <Switch
                checked={form.getFieldValue(type.name)}
                onChange={(checked) => form.setFieldValue(type.name, checked)}
              />
            </div>
          </Col>
        ))}
      </Row>
    </Card>
  );
});

NotificationTypeList.displayName = 'NotificationTypeList';
