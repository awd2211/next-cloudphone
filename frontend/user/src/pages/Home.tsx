import { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Tag, message, Statistic } from 'antd';
import { CheckOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getActivePlans } from '@/services/plan';
import type { Plan } from '@/types';

const Home = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await getActivePlans();
      setPlans(data);
    } catch (error) {
      message.error('加载套餐失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const getPlanTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      monthly: '月付',
      yearly: '年付',
      'one-time': '一次性',
    };
    return typeMap[type] || type;
  };

  const getPlanTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      monthly: 'blue',
      yearly: 'green',
      'one-time': 'orange',
    };
    return colorMap[type] || 'default';
  };

  const handlePurchase = (plan: Plan) => {
    navigate(`/plans/${plan.id}/purchase`);
  };

  return (
    <div>
      {/* 头部横幅 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '60px 0',
          color: '#fff',
          textAlign: 'center',
          marginBottom: 48,
        }}
      >
        <h1 style={{ fontSize: 48, fontWeight: 'bold', color: '#fff', margin: 0 }}>
          云手机平台
        </h1>
        <p style={{ fontSize: 20, marginTop: 16, opacity: 0.9 }}>
          随时随地，轻松使用云端手机
        </p>
        <Button
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          style={{ marginTop: 24, height: 48, fontSize: 18, padding: '0 48px' }}
          onClick={() => navigate('/devices')}
        >
          开始使用
        </Button>
      </div>

      {/* 套餐列表 */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 32, marginBottom: 48 }}>
          选择适合您的套餐
        </h2>

        <Row gutter={[24, 24]}>
          {plans.map((plan) => (
            <Col key={plan.id} xs={24} sm={12} lg={6}>
              <Card
                hoverable
                loading={loading}
                style={{
                  height: '100%',
                  border: '2px solid #f0f0f0',
                  transition: 'all 0.3s',
                }}
                styles={{
                  body: {
                    padding: '32px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  },
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <Tag color={getPlanTypeColor(plan.type)} style={{ marginBottom: 12 }}>
                    {getPlanTypeText(plan.type)}
                  </Tag>
                  <h3 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
                    {plan.name}
                  </h3>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 'bold', color: '#1890ff' }}>
                      ¥{plan.price}
                    </span>
                    {plan.type !== 'one-time' && (
                      <span style={{ fontSize: 14, color: '#999' }}>/{plan.duration}天</span>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, marginBottom: 24 }}>
                  {plan.description && (
                    <p style={{ color: '#666', textAlign: 'center', marginBottom: 16 }}>
                      {plan.description}
                    </p>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 12,
                        fontSize: 14,
                      }}
                    >
                      <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      <span>最多 {plan.deviceLimit} 个云手机</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 12,
                        fontSize: 14,
                      }}
                    >
                      <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                      <span>有效期 {plan.duration} 天</span>
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <>
                        {plan.features.map((feature, index) => (
                          <div
                            key={index}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              marginBottom: 12,
                              fontSize: 14,
                            }}
                          >
                            <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => handlePurchase(plan)}
                >
                  立即购买
                </Button>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 特性介绍 */}
        <div style={{ marginTop: 80, marginBottom: 80 }}>
          <h2 style={{ textAlign: 'center', fontSize: 32, marginBottom: 48 }}>
            为什么选择我们
          </h2>

          <Row gutter={[48, 48]}>
            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#e6f7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    fontSize: 40,
                  }}
                >
                  🚀
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 12 }}>高性能</h3>
                <p style={{ color: '#666' }}>
                  高性能云服务器，流畅运行 Android 系统
                </p>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#f6ffed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    fontSize: 40,
                  }}
                >
                  🛡️
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 12 }}>安全可靠</h3>
                <p style={{ color: '#666' }}>
                  数据隔离存储，7x24 小时监控保障
                </p>
              </div>
            </Col>

            <Col xs={24} md={8}>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: '#fff7e6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    fontSize: 40,
                  }}
                >
                  💰
                </div>
                <h3 style={{ fontSize: 20, marginBottom: 12 }}>价格实惠</h3>
                <p style={{ color: '#666' }}>
                  灵活的套餐选择，按需付费更省钱
                </p>
              </div>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default Home;
