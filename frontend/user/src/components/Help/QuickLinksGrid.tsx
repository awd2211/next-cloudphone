import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import type { QuickLink } from '@/utils/helpConfig';

const { Title, Text } = Typography;

interface QuickLinksGridProps {
  quickLinks: QuickLink[];
  onLinkClick: (path: string) => void;
}

/**
 * 帮助中心快速入口网格组件（优化版）
 */
export const QuickLinksGrid: React.FC<QuickLinksGridProps> = React.memo(({
  quickLinks,
  onLinkClick,
}) => {
  return (
    <div style={{ marginBottom: 40 }}>
      <style>
        {`
          @keyframes quickLinkSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes iconBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          .quick-link-card {
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            border: none;
            background: #fafafa;
          }
          .quick-link-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12) !important;
          }
          .quick-link-card:hover .quick-link-icon {
            animation: iconBounce 0.6s ease-in-out;
          }
          .quick-link-card::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--card-color);
            transform: scaleX(0);
            transition: transform 0.3s ease;
          }
          .quick-link-card:hover::after {
            transform: scaleX(1);
          }
        `}
      </style>

      <Row gutter={[20, 20]}>
        {quickLinks.map((link, index) => (
          <Col key={index} xs={24} sm={12} lg={6}>
            <Card
              className="quick-link-card"
              onClick={() => onLinkClick(link.path)}
              style={{
                textAlign: 'center',
                animation: `quickLinkSlideIn 0.5s ease-out ${index * 0.1}s backwards`,
                ['--card-color' as any]: link.iconColor,
              }}
            >
              <div
                className="quick-link-icon"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  background: `${link.iconColor}15`,
                  color: link.iconColor,
                  fontSize: 36,
                  marginBottom: 16,
                  boxShadow: `0 4px 16px ${link.iconColor}25`,
                }}
              >
                {link.icon}
              </div>
              <Title level={4} style={{ marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
                {link.title}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {link.description}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
});

QuickLinksGrid.displayName = 'QuickLinksGrid';
