import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, message } from 'antd';
import {
  getActivityDetail,
  participateActivity,
  claimCoupon,
  type Activity,
  ActivityStatus,
} from '@/services/activity';

/**
 * 活动详情 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 统一错误处理和消息提示
 * 4. ✅ 集中管理所有状态
 * 5. ✅ Modal 确认逻辑封装
 */
export function useActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [participating, setParticipating] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [hasParticipated, setHasParticipated] = useState(false);

  // ===== 数据加载 =====
  /**
   * 加载活动详情
   */
  const loadActivityDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getActivityDetail(id);
      setActivity(data);
    } catch (error: any) {
      message.error(error.message || '加载活动详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ===== 参与活动 =====
  /**
   * 参与活动（带确认 Modal）
   */
  const handleParticipate = useCallback(async () => {
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
  }, [activity, loadActivityDetail]);

  /**
   * 领取优惠券
   */
  const handleClaimCoupon = useCallback(async () => {
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
  }, [activity]);

  // ===== 导航 =====
  /**
   * 返回活动列表
   */
  const goBack = useCallback(() => {
    navigate('/activities');
  }, [navigate]);

  /**
   * 跳转到我的优惠券
   */
  const goToMyCoupons = useCallback(() => {
    navigate('/activities/coupons');
  }, [navigate]);

  // ===== 计算属性 =====
  const isOngoing = activity?.status === ActivityStatus.ONGOING;
  const canParticipate = isOngoing && !hasParticipated;

  // ===== 副作用 =====
  useEffect(() => {
    loadActivityDetail();
  }, [loadActivityDetail]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    participating,
    activity,
    hasParticipated,

    // 计算属性
    canParticipate,

    // 操作
    handleParticipate,
    handleClaimCoupon,

    // 导航
    goBack,
    goToMyCoupons,
  };
}
