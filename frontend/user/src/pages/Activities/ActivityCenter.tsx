import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Carousel,
  Tabs,
  Space,
  Statistic,
  Empty,
  Spin,
  message,
} from 'antd';
import {
  GiftOutlined,
  ThunderboltOutlined,
  PercentageOutlined,
  TrophyOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  getActivities,
  getActivityStats,
  type Activity,
  ActivityType,
  ActivityStatus,
} from '@/services/activity';

const { TabPane } = Tabs;

const ActivityCenter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ActivityStatus | 'all'>('all');

  // 加载数据
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [activitiesRes, statsRes] = await Promise.all([
        getActivities({
          status: activeTab === 'all' ? undefined : activeTab,
          page: 1,
          pageSize: 20,
        }),
        getActivityStats(),
      ]);

      setActivities(activitiesRes.data);
      setStats(statsRes);
    } catch (error: any) {
      message.error(error.message || '加载活动失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取活动类型图标和颜色
  const getTypeConfig = (type: ActivityType) => {
    const config: Record<ActivityType, { icon: any; color: string; text: string }> = {
      [ActivityType.DISCOUNT]: {
        icon: <PercentageOutlined />,
        color: 'orange',
        text: '折扣优惠',
      },
      [ActivityType.GIFT]: {
        icon: <GiftOutlined />,
        color: 'pink',
        text: '礼包赠送',
      },
      [ActivityType.FLASH_SALE]: {
        icon: <ThunderboltOutlined />,
        color: 'red',
        text: '限时秒杀',
      },
      [ActivityType.NEW_USER]: {
        icon: <TrophyOutlined />,
        color: 'blue',
        text: '新用户专享',
      },
    };
    return config[type] || config[ActivityType.DISCOUNT];
  };

  // 获取活动状态标签
  const getStatusTag = (status: ActivityStatus, startTime: string, endTime: string) => {
    const config: Record<ActivityStatus, { color: string; text: string }> = {
      [ActivityStatus.UPCOMING]: { color: 'blue', text: '即将开始' },
      [ActivityStatus.ONGOING]: { color: 'green', text: '进行中' },
      [ActivityStatus.ENDED]: { color: 'default', text: '已结束' },
    };
    const { color, text } = config[status];
    return <Tag color={color}>{text}</Tag>;
  };

  // 渲染热门活动轮播图
  const renderBanner = () => {
    const bannerActivities = activities.filter(
      (a) => a.status === ActivityStatus.ONGOING && a.bannerImage
    );

    if (bannerActivities.length === 0) return null;

    return (
      <Card style={{ marginBottom: 24 }} bodyStyle={{ padding: 0 }}>
        <Carousel autoplay>
          {bannerActivities.map((activity) => (
            <div key={activity.id}>
              <div
                style={{
                  height: 300,
                  background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => navigate(`/activities/${activity.id}`)}
              >
                {activity.bannerImage && (
                  <img
                    src={activity.bannerImage}
                    alt={activity.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '20px 32px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    color: '#fff',
                  }}
                >
                  <h2 style={{ color: '#fff', margin: 0 }}>{activity.title}</h2>
                  <p style={{ margin: '8px 0 0', opacity: 0.9 }}>{activity.description}</p>
                </div>
              </div>
            </div>
          ))}
        </Carousel>
      </Card>
    );
  };

  // 渲染统计卡片
  const renderStats = () => {
    if (!stats) return null;

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="进行中活动"
              value={stats.ongoingActivities}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="我的优惠券"
              value={stats.availableCoupons}
              suffix={`/ ${stats.myCoupons}`}
              prefix={<GiftOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="参与次数"
              value={stats.totalParticipations}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="获得奖励"
              value={stats.totalRewards}
              prefix={<GiftOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染活动卡片
  const renderActivityCard = (activity: Activity) => {
    const typeConfig = getTypeConfig(activity.type);
    const progress =
      activity.maxParticipants && activity.currentParticipants
        ? (activity.currentParticipants / activity.maxParticipants) * 100
        : 0;

    return (
      <Col xs={24} sm={12} lg={8} xl={6} key={activity.id}>
        <Card
          hoverable
          cover={
            <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
              {activity.coverImage ? (
                <img
                  alt={activity.title}
                  src={activity.coverImage}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 48, color: '#fff', opacity: 0.8 }}>
                    {typeConfig.icon}
                  </div>
                </div>
              )}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                {getStatusTag(activity.status, activity.startTime, activity.endTime)}
              </div>
            </div>
          }
          onClick={() => navigate(`/activities/${activity.id}`)}
        >
          <Card.Meta
            title={
              <Space>
                <Tag icon={typeConfig.icon} color={typeConfig.color}>
                  {typeConfig.text}
                </Tag>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{activity.title}</span>
              </Space>
            }
            description={
              <div>
                <p
                  style={{
                    margin: '12px 0',
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {activity.description}
                </p>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {activity.discount && (
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                      {activity.discount}折
                    </div>
                  )}
                  {activity.maxParticipants && (
                    <div style={{ fontSize: 12, color: '#999' }}>
                      已参与: {activity.currentParticipants} / {activity.maxParticipants}
                      <div
                        style={{
                          marginTop: 4,
                          height: 4,
                          background: '#f0f0f0',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: typeConfig.color,
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {new Date(activity.startTime).toLocaleDateString()} -{' '}
                    {new Date(activity.endTime).toLocaleDateString()}
                  </div>
                </Space>
                <Button
                  type="primary"
                  block
                  style={{ marginTop: 12 }}
                  disabled={activity.status !== ActivityStatus.ONGOING}
                  icon={<RightOutlined />}
                >
                  {activity.status === ActivityStatus.ONGOING
                    ? '立即参与'
                    : activity.status === ActivityStatus.UPCOMING
                    ? '敬请期待'
                    : '活动已结束'}
                </Button>
              </div>
            }
          />
        </Card>
      </Col>
    );
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <GiftOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <span style={{ fontSize: 24, fontWeight: 'bold' }}>活动中心</span>
          </Space>
        }
        extra={
          <Button onClick={() => navigate('/activities/coupons')}>
            我的优惠券 <RightOutlined />
          </Button>
        }
        bordered={false}
      >
        {/* 轮播图 */}
        {renderBanner()}

        {/* 统计数据 */}
        {renderStats()}

        {/* Tab切换 */}
        <Tabs activeKey={activeTab} onChange={(key: any) => setActiveTab(key)}>
          <TabPane tab="全部活动" key="all" />
          <TabPane tab="进行中" key={ActivityStatus.ONGOING} />
          <TabPane tab="即将开始" key={ActivityStatus.UPCOMING} />
          <TabPane tab="已结束" key={ActivityStatus.ENDED} />
        </Tabs>

        {/* 活动列表 */}
        <Spin spinning={loading}>
          {activities.length > 0 ? (
            <Row gutter={[16, 16]}>{activities.map(renderActivityCard)}</Row>
          ) : (
            <Empty
              description="暂无活动"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '60px 0' }}
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default ActivityCenter;
