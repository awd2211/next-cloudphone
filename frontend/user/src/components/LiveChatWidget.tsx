import React, { useState } from 'react';
import { FloatButton, Modal, Button, Space, Typography, List, Card, theme } from 'antd';
import {
  CustomerServiceOutlined,
  QuestionCircleOutlined,
  BookOutlined,
  FileTextOutlined,
  MessageOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

interface QuickAction {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  color: string;
}

const LiveChatWidget: React.FC = () => {
  const { token } = useToken();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // 快捷操作
  const quickActions: QuickAction[] = [
    {
      icon: <MessageOutlined style={{ fontSize: 24 }} />,
      title: '提交工单',
      description: '创建支持工单，获得专业帮助',
      action: () => {
        setVisible(false);
        navigate('/tickets');
      },
      color: token.colorPrimary,
    },
    {
      icon: <QuestionCircleOutlined style={{ fontSize: 24 }} />,
      title: '常见问题',
      description: '快速找到常见问题的答案',
      action: () => {
        setVisible(false);
        navigate('/help/faqs');
      },
      color: token.colorSuccess,
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 24 }} />,
      title: '帮助文档',
      description: '查看详细的产品使用文档',
      action: () => {
        setVisible(false);
        navigate('/help/articles');
      },
      color: token.colorWarning,
    },
    {
      icon: <BookOutlined style={{ fontSize: 24 }} />,
      title: '视频教程',
      description: '通过视频学习产品功能',
      action: () => {
        setVisible(false);
        navigate('/help/tutorials');
      },
      color: token['purple-6'] ?? '#722ed1',
    },
  ];

  return (
    <>
      {/* 浮动按钮 */}
      <FloatButton
        icon={<CustomerServiceOutlined />}
        type="primary"
        style={{
          right: 24,
          bottom: 24,
          width: 60,
          height: 60,
        }}
        onClick={() => setVisible(true)}
        tooltip="在线客服"
      />

      {/* 客服 Modal */}
      <Modal
        title={
          <Space>
            <CustomerServiceOutlined style={{ color: token.colorPrimary }} />
            <span>在线客服</span>
          </Space>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={500}
        closeIcon={<CloseOutlined />}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 欢迎信息 */}
          <Card style={{ background: token.colorPrimaryBg, border: 'none' }}>
            <Space direction="vertical">
              <Title level={4} style={{ margin: 0 }}>
                👋 您好，我能帮您什么？
              </Title>
              <Paragraph type="secondary" style={{ margin: 0 }}>
                选择下方的快捷操作，我们将为您提供最合适的帮助
              </Paragraph>
            </Space>
          </Card>

          {/* 快捷操作列表 */}
          <List
            grid={{ gutter: 16, column: 1 }}
            dataSource={quickActions}
            renderItem={(action) => (
              <List.Item>
                <Card hoverable onClick={action.action} style={{ cursor: 'pointer' }}>
                  <Space style={{ width: '100%' }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '8px',
                        background: `${action.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: action.color,
                      }}
                    >
                      {action.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{action.title}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {action.description}
                      </Text>
                    </div>
                  </Space>
                </Card>
              </List.Item>
            )}
          />

          {/* 工作时间提示 */}
          <Card size="small" style={{ background: token.colorBgLayout, border: 'none' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <CustomerServiceOutlined style={{ color: token.colorSuccess }} />
                <Text strong style={{ fontSize: 12 }}>
                  人工客服工作时间
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                周一至周日：9:00 - 21:00
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                非工作时间请提交工单，我们会尽快回复您
              </Text>
            </Space>
          </Card>

          {/* 联系方式 */}
          <Card size="small" style={{ background: token.colorBgLayout, border: 'none' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 12 }}>
                其他联系方式
              </Text>
              <Space direction="vertical" size="small">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  📧 邮箱: support@cloudphone.run
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  📞 电话: 400-123-4567
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  💬 微信: cloudphone_support
                </Text>
              </Space>
            </Space>
          </Card>

          {/* 底部按钮 */}
          <Space style={{ width: '100%', justifyContent: 'center' }}>
            <Button type="primary" onClick={() => navigate('/tickets')}>
              立即提交工单
            </Button>
            <Button onClick={() => navigate('/help')}>前往帮助中心</Button>
          </Space>
        </Space>
      </Modal>
    </>
  );
};

export default LiveChatWidget;
