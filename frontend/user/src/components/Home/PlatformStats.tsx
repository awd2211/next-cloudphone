import React from 'react';
import { Row, Col, Card } from 'antd';
import { UserOutlined, MobileOutlined, CheckCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { CountUp } from '@/components';

export interface PlatformStatsData {
  users: string;
  devices: string;
  uptime: string;
  companies: string;
}

interface PlatformStatsProps {
  data: PlatformStatsData;
}

/**
 * CloudPhone.run 平台数据统计组件
 * 展示关键业务指标，建立信任感
 */
export const PlatformStats: React.FC<PlatformStatsProps> = React.memo(({ data }) => {
  const stats = [
    {
      title: '注册用户',
      value: data.users,
      icon: <UserOutlined style={{ fontSize: 36 }} />,
      color: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      bgColor: 'rgba(99, 102, 241, 0.1)',
      description: '活跃用户数',
    },
    {
      title: '在线设备',
      value: data.devices,
      icon: <MobileOutlined style={{ fontSize: 36 }} />,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      description: '云端运行中',
    },
    {
      title: '服务可用性',
      value: data.uptime,
      icon: <CheckCircleOutlined style={{ fontSize: 36 }} />,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      description: 'SLA 保障',
    },
    {
      title: '企业客户',
      value: data.companies,
      icon: <TeamOutlined style={{ fontSize: 36 }} />,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      description: '遍布全球',
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '-80px auto 120px', padding: '0 24px', position: 'relative', zIndex: 10 }}>
      <Card
        style={{
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          border: 'none',
          background: 'white',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: '48px 32px' }}
      >
        <Row gutter={[48, 48]}>
          {stats.map((stat, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <div
                style={{
                  textAlign: 'center',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {/* 背景装饰 */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: stat.bgColor,
                    filter: 'blur(30px)',
                    opacity: 0.5,
                    zIndex: 0,
                  }}
                />

                {/* 图标容器 */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '20px',
                      background: stat.bgColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                      position: 'relative',
                      border: `2px solid ${stat.color}15`,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '20px',
                        background: stat.gradient,
                        opacity: 0.15,
                      }}
                    />
                    <span style={{ color: stat.color }}>{stat.icon}</span>
                  </div>

                  {/* 标题 */}
                  <div
                    style={{
                      fontSize: 14,
                      color: '#64748b',
                      marginBottom: 8,
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {stat.title}
                  </div>

                  {/* 数值 */}
                  <div
                    style={{
                      fontSize: 40,
                      fontWeight: 800,
                      background: stat.gradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      marginBottom: 4,
                      letterSpacing: '-1px',
                    }}
                  >
                    {(() => {
                      // 解析数字和后缀
                      const match = stat.value.match(/^([\d,]+(?:\.\d+)?)(.*)/);
                      if (match && match[1]) {
                        const numValue = parseFloat(match[1].replace(/,/g, ''));
                        const suffix = match[2] || '';
                        const decimalPart = match[1].split('.')[1];
                        const decimals = decimalPart ? decimalPart.length : 0;
                        return (
                          <CountUp
                            end={numValue}
                            duration={2.5}
                            decimals={decimals}
                            suffix={suffix}
                          />
                        );
                      }
                      return stat.value;
                    })()}
                  </div>

                  {/* 描述 */}
                  <div
                    style={{
                      fontSize: 13,
                      color: '#94a3b8',
                      fontWeight: 500,
                    }}
                  >
                    {stat.description}
                  </div>
                </div>
              </div>

              {/* 分隔线（最后一个不显示） */}
              {index < stats.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '20%',
                    height: '60%',
                    width: '1px',
                    background: 'linear-gradient(to bottom, transparent, #e2e8f0, transparent)',
                    display: window.innerWidth < 768 ? 'none' : 'block',
                  }}
                />
              )}
            </Col>
          ))}
        </Row>

        {/* 底部说明文字 */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 32,
            borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 15, color: '#64748b', margin: 0, fontWeight: 500 }}>
            实时数据更新，展示 CloudPhone.run 的全球服务规模与可靠性
          </p>
        </div>
      </Card>
    </div>
  );
});

PlatformStats.displayName = 'PlatformStats';
