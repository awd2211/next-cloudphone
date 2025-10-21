import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Tabs,
  Empty,
  Spin,
  message,
  Space,
  Statistic,
  Modal,
} from 'antd';
import {
  GiftOutlined,
  PercentageOutlined,
  DollarOutlined,
  LeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { getMyCoupons, type Coupon, CouponStatus } from '@/services/activity';

const { TabPane } = Tabs;

const MyCoupons = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activeTab, setActiveTab] = useState<CouponStatus | 'all'>('all');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    loadCoupons();
  }, [activeTab]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const result = await getMyCoupons({
        status: activeTab === 'all' ? undefined : activeTab,
        page: 1,
        pageSize: 100,
      });
      setCoupons(result.data);
    } catch (error: any) {
      message.error(error.message || '加载优惠券失败');
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const stats = {
    total: coupons.length,
    available: coupons.filter((c) => c.status === CouponStatus.AVAILABLE).length,
    used: coupons.filter((c) => c.status === CouponStatus.USED).length,
    expired: coupons.filter((c) => c.status === CouponStatus.EXPIRED).length,
  };

  // 显示优惠券详情
  const showCouponDetail = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
  };

  // 渲染优惠券卡片
  const renderCouponCard = (coupon: Coupon) => {
    const isAvailable = coupon.status === CouponStatus.AVAILABLE;
    const isUsed = coupon.status === CouponStatus.USED;
    const isExpired = coupon.status === CouponStatus.EXPIRED;

    // 优惠券类型配置
    const typeConfig = {
      discount: {
        icon: <PercentageOutlined />,
        color: '#ff4d4f',
        text: '折扣券',
        valueText: `${coupon.value}折`,
      },
      cash: {
        icon: <DollarOutlined />,
        color: '#faad14',
        text: '代金券',
        valueText: `¥${coupon.value}`,
      },
      gift: {
        icon: <GiftOutlined />,
        color: '#52c41a',
        text: '礼品券',
        valueText: coupon.name,
      },
    };

    const config = typeConfig[coupon.type];

    return (
      <Col xs={24} sm={12} lg={8} key={coupon.id}>
        <Card
          hoverable={isAvailable}
          onClick={() => showCouponDetail(coupon)}
          style={{
            position: 'relative',
            overflow: 'hidden',
            opacity: isAvailable ? 1 : 0.6,
          }}
        >
          {/* 已使用/已过期水印 */}
          {!isAvailable && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                fontSize: 48,
                fontWeight: 'bold',
                color: isUsed ? '#52c41a' : '#ff4d4f',
                opacity: 0.2,
                zIndex: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {isUsed ? '已使用' : '已过期'}
            </div>
          )}

          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* 顶部标签 */}
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Tag icon={config.icon} color={config.color}>
                  {config.text}
                </Tag>
                <Tag
                  color={
                    isAvailable ? 'success' : isUsed ? 'default' : 'error'
                  }
                  icon={
                    isAvailable ? (
                      <CheckCircleOutlined />
                    ) : isUsed ? (
                      <CheckCircleOutlined />
                    ) : (
                      <CloseCircleOutlined />
                    )
                  }
                >
                  {isAvailable ? '可用' : isUsed ? '已使用' : '已过期'}
                </Tag>
              </Space>
            </div>

            {/* 优惠券金额/折扣 */}
            <div
              style={{
                fontSize: 36,
                fontWeight: 'bold',
                color: config.color,
                marginBottom: 12,
              }}
            >
              {config.valueText}
            </div>

            {/* 优惠券名称 */}
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {coupon.name}
            </div>

            {/* 使用条件 */}
            {coupon.minAmount && (
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                满 ¥{coupon.minAmount} 可用
              </div>
            )}

            {/* 活动来源 */}
            {coupon.activityTitle && (
              <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 8 }}>
                来自: {coupon.activityTitle}
              </div>
            )}

            {/* 有效期 */}
            <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {new Date(coupon.startTime).toLocaleDateString()} -{' '}
              {new Date(coupon.endTime).toLocaleDateString()}
            </div>

            {/* 优惠券码 */}
            <div
              style={{
                background: '#f5f5f5',
                padding: '8px 12px',
                borderRadius: 4,
                fontSize: 14,
                fontFamily: 'monospace',
                marginBottom: 12,
              }}
            >
              {coupon.code}
            </div>

            {/* 使用记录 */}
            {isUsed && coupon.usedAt && (
              <div style={{ fontSize: 12, color: '#52c41a' }}>
                使用时间: {new Date(coupon.usedAt).toLocaleString()}
              </div>
            )}

            {/* 操作按钮 */}
            {isAvailable && (
              <Button
                type="primary"
                block
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: 实现使用优惠券逻辑
                  message.info('请在购买套餐或充值时使用优惠券');
                }}
              >
                立即使用
              </Button>
            )}
          </div>
        </Card>
      </Col>
    );
  };

  return (
    <div>
      {/* 顶部返回按钮 */}
      <Button
        icon={<LeftOutlined />}
        onClick={() => navigate('/activities')}
        style={{ marginBottom: 16 }}
      >
        返回活动中心
      </Button>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="全部优惠券"
              value={stats.total}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="可用"
              value={stats.available}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已使用"
              value={stats.used}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已过期"
              value={stats.expired}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 优惠券列表 */}
      <Card
        title={
          <Space>
            <GiftOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span style={{ fontSize: 20 }}>我的优惠券</span>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={(key: any) => setActiveTab(key)}>
          <TabPane tab={`全部 (${stats.total})`} key="all" />
          <TabPane tab={`可用 (${stats.available})`} key={CouponStatus.AVAILABLE} />
          <TabPane tab={`已使用 (${stats.used})`} key={CouponStatus.USED} />
          <TabPane tab={`已过期 (${stats.expired})`} key={CouponStatus.EXPIRED} />
        </Tabs>

        <Spin spinning={loading}>
          {coupons.length > 0 ? (
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {coupons.map(renderCouponCard)}
            </Row>
          ) : (
            <Empty
              description="暂无优惠券"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '60px 0' }}
            >
              <Button type="primary" onClick={() => navigate('/activities')}>
                去活动中心领取
              </Button>
            </Empty>
          )}
        </Spin>
      </Card>

      {/* 优惠券详情 Modal */}
      <Modal
        title="优惠券详情"
        open={!!selectedCoupon}
        onCancel={() => setSelectedCoupon(null)}
        footer={
          selectedCoupon?.status === CouponStatus.AVAILABLE
            ? [
                <Button key="cancel" onClick={() => setSelectedCoupon(null)}>
                  关闭
                </Button>,
                <Button
                  key="use"
                  type="primary"
                  onClick={() => {
                    message.info('请在购买套餐或充值时使用优惠券');
                    setSelectedCoupon(null);
                  }}
                >
                  立即使用
                </Button>,
              ]
            : [
                <Button key="close" onClick={() => setSelectedCoupon(null)}>
                  关闭
                </Button>,
              ]
        }
      >
        {selectedCoupon && (
          <div>
            <p>
              <strong>优惠券名称:</strong> {selectedCoupon.name}
            </p>
            <p>
              <strong>优惠券码:</strong>{' '}
              <code style={{ background: '#f5f5f5', padding: '2px 8px' }}>
                {selectedCoupon.code}
              </code>
            </p>
            <p>
              <strong>类型:</strong>{' '}
              {
                {
                  discount: '折扣券',
                  cash: '代金券',
                  gift: '礼品券',
                }[selectedCoupon.type]
              }
            </p>
            <p>
              <strong>面额:</strong>{' '}
              {selectedCoupon.type === 'discount'
                ? `${selectedCoupon.value}折`
                : `¥${selectedCoupon.value}`}
            </p>
            {selectedCoupon.minAmount && (
              <p>
                <strong>使用条件:</strong> 满 ¥{selectedCoupon.minAmount} 可用
              </p>
            )}
            <p>
              <strong>有效期:</strong> {new Date(selectedCoupon.startTime).toLocaleDateString()} -{' '}
              {new Date(selectedCoupon.endTime).toLocaleDateString()}
            </p>
            {selectedCoupon.activityTitle && (
              <p>
                <strong>活动来源:</strong> {selectedCoupon.activityTitle}
              </p>
            )}
            {selectedCoupon.usedAt && (
              <p>
                <strong>使用时间:</strong> {new Date(selectedCoupon.usedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyCoupons;
