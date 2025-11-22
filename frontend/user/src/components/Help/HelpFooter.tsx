import React from 'react';
import { Card, Space, Button, Typography } from 'antd';
import { CustomerServiceOutlined, QuestionCircleOutlined, FormOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface HelpFooterProps {
  onContactClick: () => void;
  onFAQClick: () => void;
}

/**
 * 帮助中心底部提示组件（优化版）
 */
export const HelpFooter: React.FC<HelpFooterProps> = React.memo(({
  onContactClick,
  onFAQClick,
}) => {
  return (
    <div style={{ marginBottom: 48 }}>
      <style>
        {`
          @keyframes footerSlideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes iconFloat {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-12px);
            }
          }
          @keyframes ripple {
            0% {
              transform: scale(1);
              opacity: 0.3;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
          .footer-card {
            position: relative;
            overflow: hidden;
            border: none;
            border-radius: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .footer-card::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -20%;
            width: 400px;
            height: 400px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
            filter: blur(40px);
            animation: iconFloat 6s ease-in-out infinite;
          }
          .footer-card::after {
            content: '';
            position: absolute;
            bottom: -50%;
            left: -10%;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
            filter: blur(40px);
            animation: iconFloat 8s ease-in-out infinite reverse;
          }
          .footer-icon-container {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            animation: iconFloat 3s ease-in-out infinite;
          }
          .footer-icon-container::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            animation: ripple 2s ease-out infinite;
          }
          .footer-button {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-weight: 500;
            border-radius: 8px;
            height: 48px;
            padding: 0 32px;
            font-size: 15px;
          }
          .footer-button-primary {
            background: #fff;
            color: #667eea;
            border: none;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          }
          .footer-button-primary:hover {
            background: #fff !important;
            color: #667eea !important;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
          }
          .footer-button-secondary {
            background: rgba(255, 255, 255, 0.2);
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
          }
          .footer-button-secondary:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            color: #fff !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
            transform: translateY(-2px);
          }
        `}
      </style>

      <Card
        className="footer-card"
        styles={{ body: { padding: '60px 24px', position: 'relative', zIndex: 1 } }}
        style={{
          textAlign: 'center',
          animation: 'footerSlideUp 0.6s ease-out',
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* 图标 */}
          <div className="footer-icon-container">
            <CustomerServiceOutlined style={{ fontSize: 40, color: '#fff' }} />
          </div>

          {/* 文本内容 */}
          <div>
            <Title level={2} style={{ marginBottom: 12, color: '#fff', fontWeight: 700, fontSize: 32 }}>
              找不到您需要的帮助？
            </Title>
            <Paragraph style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 16, marginBottom: 0 }}>
              我们的客服团队 7×24 小时随时准备为您提供专业支持
            </Paragraph>
          </div>

          {/* 按钮 */}
          <Space size={16}>
            <Button
              className="footer-button footer-button-primary"
              size="large"
              onClick={onContactClick}
              icon={<FormOutlined />}
            >
              提交工单
            </Button>
            <Button
              className="footer-button footer-button-secondary"
              size="large"
              onClick={onFAQClick}
              icon={<QuestionCircleOutlined />}
            >
              查看 FAQ
            </Button>
          </Space>

          {/* 额外提示 */}
          <div style={{ marginTop: 16 }}>
            <Paragraph style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, marginBottom: 0 }}>
              平均响应时间 &lt; 2 小时 · 问题解决率 98%
            </Paragraph>
          </div>
        </Space>
      </Card>
    </div>
  );
});

HelpFooter.displayName = 'HelpFooter';
