import React from 'react';
import { Button, Card, Spin, Result } from 'antd';
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
import { useActivityDetail } from '@/hooks/useActivityDetail';

/**
 * 活动详情页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 配置文件扩展（类型、状态、工具函数）
 * 5. ✅ Modal 确认逻辑封装在 Hook 中
 * 6. ✅ 代码从 366 行减少到 ~105 行
 */
const ActivityDetail: React.FC = () => {
  const {
    loading,
    participating,
    activity,
    hasParticipated,
    canParticipate,
    handleParticipate,
    goBack,
    goToMyCoupons,
  } = useActivityDetail();

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
          participating={participating}
          onParticipate={handleParticipate}
          onViewCoupons={goToMyCoupons}
        />
      </Card>
    </div>
  );
};

export default ActivityDetail;
