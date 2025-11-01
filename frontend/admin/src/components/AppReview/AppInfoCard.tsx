import React from 'react';
import { Card, Row, Col, Image, Avatar, Descriptions, Typography, Divider, Tag } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Application } from '@/types';
import { formatSize } from '@/utils/appReview';

const { Title, Text, Paragraph } = Typography;

interface AppInfoCardProps {
  app: Application;
}

export const AppInfoCard: React.FC<AppInfoCardProps> = React.memo(({ app }) => {
  return (
    <Card title="应用信息" style={{ marginBottom: 24 }}>
      <Row gutter={16}>
        <Col xs={24} sm={8}>
          <div style={{ textAlign: 'center' }}>
            {app.icon ? (
              <Image
                src={app.icon}
                alt={app.name}
                width={120}
                height={120}
                style={{ borderRadius: 12 }}
              />
            ) : (
              <Avatar
                size={120}
                icon={<AppstoreOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              />
            )}
          </div>
        </Col>
        <Col xs={24} sm={16}>
          <Descriptions column={1}>
            <Descriptions.Item label="应用名称">
              <Text strong style={{ fontSize: 16 }}>
                {app.name}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="包名">
              <Text code>{app.packageName}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="版本">{app.version}</Descriptions.Item>
            <Descriptions.Item label="大小">{formatSize(app.size)}</Descriptions.Item>
            <Descriptions.Item label="分类">
              <Tag color="blue">{app.category}</Tag>
            </Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>

      <Divider />

      <Title level={5}>应用描述</Title>
      <Paragraph>{app.description || '暂无描述'}</Paragraph>

      <Title level={5}>应用详情</Title>
      <Descriptions bordered column={2}>
        <Descriptions.Item label="上传者" span={2}>
          {app.uploadedBy || '未知'}
        </Descriptions.Item>
        <Descriptions.Item label="上传时间">
          {dayjs(app.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="最后更新">
          {dayjs(app.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="APK路径" span={2}>
          <Text copyable ellipsis style={{ maxWidth: 400 }}>
            {app.apkPath || 'N/A'}
          </Text>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
});

AppInfoCard.displayName = 'AppInfoCard';
