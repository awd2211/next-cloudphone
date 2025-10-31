import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Progress,
  Timeline,
  Alert,
  Spin,
  message,
  Modal,
  Result,
} from 'antd';
import {
  LeftOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  getActivityDetail,
  participateActivity,
  claimCoupon,
  type Activity,
  ActivityType,
  ActivityStatus,
} from '@/services/activity';

const ActivityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [hasParticipated, setHasParticipated] = useState(false);

  useEffect(() => {
    if (id) {
      loadActivityDetail();
    }
  }, [id]);

  const loadActivityDetail = async () => {
    try {
      setLoading(true);
      const data = await getActivityDetail(id!);
      setActivity(data);
    } catch (error: any) {
      message.error(error.message || '加载活动详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 参与活动
  const handleParticipate = async () => {
    if (!activity) return;

    Modal.confirm({
      title: '确认参与活动',
      content: `确定要参与 "${activity.title}" 吗?`,
      onOk: async () => {
        try {
          setParticipating(true);
          const result = await participateActivity(activity.id);

          Modal.success({
            title: '参与成功!',
            content: (
              <div>
                <p>{result.message}</p>
                {result.rewards && result.rewards.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <strong>获得奖励:</strong>
                    <ul>
                      {result.rewards.map((reward, index) => (
                        <li key={index}>{reward}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ),
          });

          setHasParticipated(true);
          loadActivityDetail(); // 重新加载活动数据
        } catch (error: any) {
          message.error(error.message || '参与活动失败');
        } finally {
          setParticipating(false);
        }
      },
    });
  };

  // 领取优惠券
  const handleClaimCoupon = async () => {
    if (!activity) return;

    try {
      setParticipating(true);
      const result = await claimCoupon(activity.id);
      message.success(`领取成功! 优惠券: ${result.coupon.name}`);
      setHasParticipated(true);
    } catch (error: any) {
      message.error(error.message || '领取优惠券失败');
    } finally {
      setParticipating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!activity) {
    return (
      <Result
        status="404"
        title="活动不存在"
        subTitle="抱歉，您访问的活动不存在或已被删除"
        extra={
          <Button type="primary" onClick={() => navigate('/activities')}>
            返回活动中心
          </Button>
        }
      />
    );
  }

  const progress =
    activity.maxParticipants && activity.currentParticipants
      ? (activity.currentParticipants / activity.maxParticipants) * 100
      : 0;

  const isOngoing = activity.status === ActivityStatus.ONGOING;
  const canParticipate = isOngoing && !hasParticipated;

  return (
    <div>
      {/* 顶部返回按钮 */}
      <Button
        icon={<LeftOutlined />}
        onClick={() => navigate('/activities')}
        style={{ marginBottom: 16 }}
      >
        返回活动列表
      </Button>

      {/* 活动横幅 */}
      <Card bodyStyle={{ padding: 0 }} style={{ marginBottom: 24 }}>
        <div
          style={{
            height: 320,
            background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}
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
              padding: '32px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              color: '#fff',
            }}
          >
            <Space size="large" align="center">
              <div style={{ fontSize: 48 }}>
                {activity.type === ActivityType.GIFT ? <GiftOutlined /> : <ThunderboltOutlined />}
              </div>
              <div>
                <h1 style={{ color: '#fff', margin: 0, fontSize: 32 }}>{activity.title}</h1>
                <p style={{ margin: '8px 0 0', fontSize: 16, opacity: 0.9 }}>
                  {activity.description}
                </p>
              </div>
            </Space>
          </div>
        </div>
      </Card>

      {/* 活动状态提示 */}
      {!isOngoing && (
        <Alert
          message={
            activity.status === ActivityStatus.UPCOMING ? '活动即将开始，敬请期待!' : '活动已结束'
          }
          type={activity.status === ActivityStatus.UPCOMING ? 'info' : 'warning'}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {hasParticipated && (
        <Alert
          message="您已参与过此活动"
          description="感谢您的参与，请前往我的优惠券查看您的奖励"
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 24 }}
        />
      )}

      <Card
        title="活动详情"
        extra={
          canParticipate && (
            <Button
              type="primary"
              size="large"
              loading={participating}
              onClick={handleParticipate}
              icon={<TrophyOutlined />}
            >
              立即参与
            </Button>
          )
        }
      >
        {/* 基本信息 */}
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="活动类型">
            <Tag color="blue">
              {
                {
                  [ActivityType.DISCOUNT]: '折扣优惠',
                  [ActivityType.GIFT]: '礼包赠送',
                  [ActivityType.FLASH_SALE]: '限时秒杀',
                  [ActivityType.NEW_USER]: '新用户专享',
                }[activity.type]
              }
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="活动状态">
            <Tag
              color={
                {
                  [ActivityStatus.UPCOMING]: 'blue',
                  [ActivityStatus.ONGOING]: 'green',
                  [ActivityStatus.ENDED]: 'default',
                }[activity.status]
              }
            >
              {
                {
                  [ActivityStatus.UPCOMING]: '即将开始',
                  [ActivityStatus.ONGOING]: '进行中',
                  [ActivityStatus.ENDED]: '已结束',
                }[activity.status]
              }
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="开始时间">
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            {new Date(activity.startTime).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="结束时间">
            <ClockCircleOutlined style={{ marginRight: 8 }} />
            {new Date(activity.endTime).toLocaleString()}
          </Descriptions.Item>
          {activity.discount && (
            <Descriptions.Item label="折扣力度">
              <span style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                {activity.discount}折
              </span>
            </Descriptions.Item>
          )}
          {activity.maxParticipants && (
            <Descriptions.Item label="参与进度">
              <div>
                <div style={{ marginBottom: 8 }}>
                  {activity.currentParticipants} / {activity.maxParticipants} 人
                </div>
                <Progress percent={Math.round(progress)} status="active" />
              </div>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* 活动规则 */}
        {activity.rules && (
          <div style={{ marginTop: 24 }}>
            <h3>活动规则</h3>
            <Card>
              <div dangerouslySetInnerHTML={{ __html: activity.rules }} />
            </Card>
          </div>
        )}

        {/* 参与条件 */}
        {activity.conditions && activity.conditions.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3>参与条件</h3>
            <Timeline
              items={activity.conditions.map((condition, index) => ({
                key: index,
                children: condition,
              }))}
            />
          </div>
        )}

        {/* 活动奖励 */}
        {activity.rewards && activity.rewards.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3>活动奖励</h3>
            <Space direction="vertical" style={{ width: '100%' }}>
              {activity.rewards.map((reward, index) => (
                <Card key={index} size="small">
                  <Space>
                    <GiftOutlined style={{ fontSize: 20, color: '#faad14' }} />
                    <span>{reward}</span>
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        )}

        {/* 操作按钮 */}
        {canParticipate && (
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <Space size="large">
              <Button
                type="primary"
                size="large"
                loading={participating}
                onClick={handleParticipate}
                icon={<TrophyOutlined />}
              >
                立即参与
              </Button>
              <Button size="large" onClick={() => navigate('/activities/coupons')}>
                查看我的优惠券
              </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityDetail;
