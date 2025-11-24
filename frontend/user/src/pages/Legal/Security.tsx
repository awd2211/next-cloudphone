import React from 'react';
import { Card, Row, Col, Timeline, Collapse } from 'antd';
import {
  SafetyOutlined,
  LockOutlined,
  AuditOutlined,
  CloudServerOutlined,
  EyeOutlined,
  FileProtectOutlined,
  ApiOutlined,
} from '@ant-design/icons';

const { Panel } = Collapse;

/**
 * 安全保障页面
 * 展示平台安全措施、合规认证、数据保护等信息
 */
const Security: React.FC = () => {
  // 安全特性
  const securityFeatures = [
    {
      icon: <LockOutlined style={{ fontSize: 48, color: '#1677ff' }} />,
      title: '数据加密',
      description: '采用 AES-256 加密算法，传输使用 TLS 1.3 协议',
      details: [
        '数据库字段级加密',
        'API 通信全程 HTTPS 加密',
        '敏感信息加密存储',
        '密钥定期轮换机制',
      ],
    },
    {
      icon: <SafetyOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
      title: '访问控制',
      description: '多层次访问控制，确保数据访问安全',
      details: [
        '基于角色的权限管理（RBAC）',
        '多因素身份认证（MFA）',
        'IP 白名单访问控制',
        '异常登录实时告警',
      ],
    },
    {
      icon: <CloudServerOutlined style={{ fontSize: 48, color: '#722ed1' }} />,
      title: '基础设施安全',
      description: '企业级云基础设施，多重安全防护',
      details: [
        'DDoS 防护和 WAF 防火墙',
        '容器隔离和资源限制',
        '定期安全扫描和漏洞修复',
        '7×24 小时安全监控',
      ],
    },
    {
      icon: <AuditOutlined style={{ fontSize: 48, color: '#faad14' }} />,
      title: '审计与监控',
      description: '完整的操作日志和审计追踪',
      details: [
        '所有操作完整记录',
        '异常行为实时告警',
        '日志长期安全存储',
        '支持审计查询和导出',
      ],
    },
    {
      icon: <FileProtectOutlined style={{ fontSize: 48, color: '#eb2f96' }} />,
      title: '数据备份',
      description: '自动化备份，确保数据安全可恢复',
      details: [
        '每日自动备份',
        '多地域灾备',
        '快速恢复机制',
        '备份数据加密存储',
      ],
    },
    {
      icon: <EyeOutlined style={{ fontSize: 48, color: '#13c2c2' }} />,
      title: '隐私保护',
      description: '严格遵守数据隐私法规',
      details: [
        '符合 GDPR 和国内数据保护法',
        '用户数据最小化原则',
        '明确的隐私政策',
        '用户数据删除权利',
      ],
    },
  ];

  // 合规认证
  const certifications = [
    {
      title: 'ISO 27001',
      description: '信息安全管理体系认证',
      status: '已认证',
      color: '#1677ff',
    },
    {
      title: 'ISO 9001',
      description: '质量管理体系认证',
      status: '已认证',
      color: '#52c41a',
    },
    {
      title: '等保三级',
      description: '信息系统安全等级保护',
      status: '已认证',
      color: '#722ed1',
    },
    {
      title: 'SOC 2 Type II',
      description: '安全、可用性和机密性认证',
      status: '进行中',
      color: '#faad14',
    },
  ];

  // 安全响应流程
  const securityResponseSteps = [
    {
      title: '事件检测',
      description: '7×24 小时安全监控，实时检测异常行为',
    },
    {
      title: '快速响应',
      description: '安全团队 15 分钟内响应，评估影响范围',
    },
    {
      title: '问题修复',
      description: '立即采取措施控制影响，修复安全漏洞',
    },
    {
      title: '用户通知',
      description: '及时通知受影响用户，提供解决方案',
    },
    {
      title: '复盘改进',
      description: '分析根本原因，完善安全措施，防止再次发生',
    },
  ];

  // 安全最佳实践建议
  const bestPractices = [
    {
      title: '账号安全',
      items: [
        '使用强密码，包含大小写字母、数字和特殊字符',
        '定期更换密码，建议每 3 个月更换一次',
        '启用多因素认证（MFA），增加账号安全性',
        '不要在多个平台使用相同密码',
        '妥善保管 API 密钥，不要硬编码在代码中',
      ],
    },
    {
      title: '设备管理',
      items: [
        '及时删除不再使用的设备，避免资源浪费',
        '为不同项目使用不同的设备分组',
        '定期审查设备访问权限',
        '监控设备使用情况，发现异常及时处理',
      ],
    },
    {
      title: '网络安全',
      items: [
        '通过 VPN 或专线访问设备，避免公网直接暴露',
        '使用 IP 白名单限制访问来源',
        '为敏感操作配置访问审批流程',
        '定期检查防火墙规则配置',
      ],
    },
    {
      title: '数据保护',
      items: [
        '定期备份重要数据到安全位置',
        '加密存储敏感信息',
        '遵循最小权限原则，只授予必要的权限',
        '定期审查和清理不需要的数据',
      ],
    },
  ];

  return (
    <div>
      {/* 页面内容 */}
      <div style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 300px)' }}>
        {/* Hero Section */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '80px 24px',
            textAlign: 'center',
            color: 'white',
          }}
        >
          <SafetyOutlined style={{ fontSize: 64, marginBottom: 24 }} />
          <h1 style={{ fontSize: 48, marginBottom: 16, color: 'white' }}>安全保障</h1>
          <p style={{ fontSize: 20, opacity: 0.9 }}>
            企业级安全防护，全方位保障您的数据安全
          </p>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px' }}>
          {/* 安全特性 */}
          <div style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 28, marginBottom: 32, textAlign: 'center' }}>
              六大安全特性
            </h2>
            <Row gutter={[24, 24]}>
              {securityFeatures.map((feature, index) => (
                <Col xs={24} md={12} lg={8} key={index}>
                  <Card hoverable style={{ height: '100%' }}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      {feature.icon}
                    </div>
                    <h3 style={{ fontSize: 18, marginBottom: 12, textAlign: 'center' }}>
                      {feature.title}
                    </h3>
                    <p style={{ color: '#666', marginBottom: 16, textAlign: 'center' }}>
                      {feature.description}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 20, color: '#666', fontSize: 14 }}>
                      {feature.details.map((detail, detailIndex) => (
                        <li key={detailIndex} style={{ marginBottom: 8 }}>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>

          {/* 合规认证 */}
          <Card style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 28, marginBottom: 32, textAlign: 'center' }}>
              合规认证
            </h2>
            <Row gutter={[24, 24]}>
              {certifications.map((cert, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 24,
                      background: '#f9f9f9',
                      borderRadius: 8,
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 48,
                        fontWeight: 'bold',
                        color: cert.color,
                        marginBottom: 16,
                      }}
                    >
                      <ApiOutlined />
                    </div>
                    <h3 style={{ fontSize: 18, marginBottom: 8 }}>{cert.title}</h3>
                    <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
                      {cert.description}
                    </p>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        background: cert.color,
                        color: 'white',
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      {cert.status}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 安全响应流程 */}
          <Card style={{ marginBottom: 60 }}>
            <h2 style={{ fontSize: 28, marginBottom: 32, textAlign: 'center' }}>
              安全事件响应流程
            </h2>
            <Timeline
              style={{ maxWidth: 800, margin: '0 auto', paddingTop: 24 }}
              items={securityResponseSteps.map((step, index) => ({
                color: index === securityResponseSteps.length - 1 ? 'green' : 'blue',
                children: (
                  <div>
                    <h3 style={{ fontSize: 16, marginBottom: 8 }}>{step.title}</h3>
                    <p style={{ color: '#666', margin: 0 }}>{step.description}</p>
                  </div>
                ),
              }))}
            />
          </Card>

          {/* 安全最佳实践 */}
          <Card>
            <h2 style={{ fontSize: 28, marginBottom: 32, textAlign: 'center' }}>
              安全最佳实践建议
            </h2>
            <Collapse
              defaultActiveKey={['0']}
              style={{ background: '#fafafa', border: 'none' }}
            >
              {bestPractices.map((practice, index) => (
                <Panel
                  header={
                    <span style={{ fontSize: 16, fontWeight: 600 }}>
                      {practice.title}
                    </span>
                  }
                  key={index}
                  style={{ marginBottom: 16, background: 'white' }}
                >
                  <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
                    {practice.items.map((item, itemIndex) => (
                      <li key={itemIndex} style={{ marginBottom: 12, lineHeight: 1.6 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Panel>
              ))}
            </Collapse>
          </Card>

          {/* 联系我们 */}
          <Card
            style={{
              marginTop: 60,
              textAlign: 'center',
              background: '#f9f9f9',
            }}
          >
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>发现安全问题？</h3>
            <p style={{ color: '#666', marginBottom: 24 }}>
              如果您发现任何安全漏洞或问题，请立即联系我们的安全团队
            </p>
            <p style={{ fontSize: 16, marginBottom: 24 }}>
              <strong>安全邮箱：</strong>{' '}
              <a href="mailto:security@cloudphone.run" style={{ color: '#1677ff' }}>
                security@cloudphone.run
              </a>
            </p>
            <p style={{ color: '#999', fontSize: 14 }}>
              我们承诺在 24 小时内响应安全报告，并提供相应的奖励计划
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Security;
