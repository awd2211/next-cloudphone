/**
 * 活动服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';

// ========== 活动相关接口 ==========

/**
 * 活动类型
 */
export enum ActivityType {
  DISCOUNT = 'discount', // 折扣
  GIFT = 'gift', // 礼包
  FLASH_SALE = 'flash_sale', // 限时秒杀
  NEW_USER = 'new_user', // 新用户专享
}

/**
 * 活动状态
 */
export enum ActivityStatus {
  UPCOMING = 'upcoming', // 即将开始
  ONGOING = 'ongoing', // 进行中
  ENDED = 'ended', // 已结束
}

/**
 * 优惠券状态
 */
export enum CouponStatus {
  AVAILABLE = 'available', // 可用
  USED = 'used', // 已使用
  EXPIRED = 'expired', // 已过期
}

/**
 * 活动信息
 */
export interface Activity {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  status: ActivityStatus;
  startTime: string;
  endTime: string;
  coverImage?: string;
  bannerImage?: string;
  rules?: string;
  discount?: number; // 折扣率 (0-100)
  maxParticipants?: number; // 最大参与人数
  currentParticipants?: number; // 当前参与人数
  rewards?: string[]; // 奖励列表
  conditions?: string[]; // 参与条件
  createdAt: string;
  updatedAt: string;
}

/**
 * 优惠券信息
 */
export interface Coupon {
  id: string;
  code: string;
  name: string;
  type: 'discount' | 'cash' | 'gift'; // 折扣券/现金券/礼品券
  value: number; // 面额或折扣率
  minAmount?: number; // 最低消费金额
  status: CouponStatus;
  activityId?: string;
  activityTitle?: string;
  startTime: string;
  endTime: string;
  usedAt?: string;
  createdAt: string;
}

/**
 * 参与活动记录
 */
export interface Participation {
  id: string;
  activityId: string;
  activityTitle: string;
  userId: string;
  participatedAt: string;
  rewards: string[];
  status: 'pending' | 'completed' | 'failed';
}

/**
 * 获取活动列表
 */
export const getActivities = (params?: {
  type?: ActivityType;
  status?: ActivityStatus;
  page?: number;
  pageSize?: number;
}) =>
  api.get<{
    data: Activity[];
    total: number;
    page: number;
    pageSize: number;
  }>('/activities', { params });

/**
 * 获取活动详情
 */
export const getActivityDetail = (id: string) =>
  api.get<Activity>(`/activities/${id}`);

/**
 * 参与活动
 */
export const participateActivity = (id: string) =>
  api.post<{
    participation: Participation;
    rewards: string[];
    message: string;
  }>(`/activities/${id}/participate`);

/**
 * 获取我的参与记录
 */
export const getMyParticipations = (params?: {
  activityId?: string;
  page?: number;
  pageSize?: number;
}) =>
  api.get<{
    data: Participation[];
    total: number;
    page: number;
    pageSize: number;
  }>('/activities/my/participations', { params });

/**
 * 获取我的优惠券列表
 */
export const getMyCoupons = (params?: {
  status?: CouponStatus;
  page?: number;
  pageSize?: number;
}) =>
  api.get<{
    data: Coupon[];
    total: number;
    page: number;
    pageSize: number;
  }>('/coupons/my', { params });

/**
 * 使用优惠券
 */
export const useCoupon = (couponId: string, orderId: string) =>
  api.post<{
    success: boolean;
    message: string;
    discount: number;
  }>(`/coupons/${couponId}/use`, { orderId });

/**
 * 领取优惠券
 */
export const claimCoupon = (activityId: string) =>
  api.post<{
    coupon: Coupon;
    message: string;
  }>(`/activities/${activityId}/claim-coupon`);

/**
 * 获取活动统计
 */
export const getActivityStats = () =>
  api.get<{
    totalActivities: number;
    ongoingActivities: number;
    myCoupons: number;
    availableCoupons: number;
    totalParticipations: number;
    totalRewards: number;
  }>('/activities/stats');
