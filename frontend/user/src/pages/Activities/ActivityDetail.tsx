import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Spin, Result, Modal } from 'antd';
import { LeftOutlined, TrophyOutlined } from '@ant-design/icons';
import {
  DetailBanner,
  StatusAlerts,
  ActivityInfo,
  ActivityRules,
  ActivityConditions,
  ActivityRewards,
  ParticipateActions,
} from '@/components/Activity';
import {
  useActivityDetail,
  useParticipateActivity,
} from '@/hooks/queries';
import type { ActivityStatus } from '@/services/activity';

/**
 * 活动详情页面
 *
 * 功能：
 * 1. 显示活动详细信息（标题、时间、规则、奖励等）
 * 2. 参与活动（带确认 Modal）
 * 3. 显示参与状态和条件检查
 * 4. 导航（返回、跳转优惠券）
 */
const ActivityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // React Query hooks
  const { data: activity, isLoading: loading } = useActivityDetail(id!);
  const participateActivity = useParticipateActivity();

  // 计算状态（Activity 类型没有 hasParticipated，这里假设用户未参与）
  // 实际项目中应该从单独的 API 或 useMyParticipations 获取参与状态
  const hasParticipated = false;
  const canParticipate =
    activity?.status === ('ongoing' as ActivityStatus) && !hasParticipated;
  const participating = participateActivity.isPending;

  // 参与活动
  const handleParticipate = useCallback(async () => {
    if (!activity) return;

    Modal.confirm({
      title: '确认参与活动',
      content: `确定要参与 "${activity.title}" 吗?`,
      onOk: async () => {
        const result = await participateActivity.mutateAsync(activity.id);

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
      },
    });
  }, [activity, participateActivity]);

  // 导航函数
  const goBack = useCallback(() => {
    navigate('/activities');
  }, [navigate]);

  const goToMyCoupons = useCallback(() => {
    navigate('/activities/coupons');
  }, [navigate]);

  // Loading 状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 404 状态
  if (!activity) {
    return (
      <Result
        status="404"
        title="活动不存在"
        subTitle="抱歉，您访问的活动不存在或已被删除"
        extra={
          <Button type="primary" onClick={goBack}>
            返回活动中心
          </Button>
        }
      />
    );
  }

  return (
    <div>
      {/* 返回按钮 */}
      <Button icon={<LeftOutlined />} onClick={goBack} style={{ marginBottom: 16 }}>
        返回活动列表
      </Button>

      {/* 活动横幅 */}
      <DetailBanner activity={activity} />

      {/* 状态提示 */}
      <StatusAlerts status={activity.status} hasParticipated={hasParticipated} />

      {/* 活动详情 */}
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
        <ActivityInfo activity={activity} />

        {/* 活动规则 */}
        <ActivityRules rules={activity.rules} />

        {/* 参与条件 */}
        <ActivityConditions conditions={activity.conditions} />

        {/* 活动奖励 */}
        <ActivityRewards rewards={activity.rewards} />

        {/* 参与按钮组 */}
        <ParticipateActions
          canParticipate={canParticipate}
          participating={participateActivity.isPending}
          onParticipate={handleParticipate}
          onViewCoupons={goToMyCoupons}
        />
      </Card>
    </div>
  );
};

export default ActivityDetail;
