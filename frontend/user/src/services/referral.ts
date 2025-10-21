import request from '@/utils/request';

// ========== 邀请返利相关接口 ==========

/**
 * 邀请记录状态
 */
export enum ReferralStatus {
  PENDING = 'pending', // 待确认
  CONFIRMED = 'confirmed', // 已确认
  REWARDED = 'rewarded', // 已奖励
  EXPIRED = 'expired', // 已过期
}

/**
 * 提现状态
 */
export enum WithdrawStatus {
  PENDING = 'pending', // 待审核
  APPROVED = 'approved', // 已批准
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed', // 已完成
  REJECTED = 'rejected', // 已拒绝
}

/**
 * 邀请统计
 */
export interface ReferralStats {
  totalInvites: number; // 总邀请人数
  confirmedInvites: number; // 确认的邀请
  pendingInvites: number; // 待确认的邀请
  totalRewards: number; // 总奖励金额
  availableBalance: number; // 可提现余额
  withdrawnAmount: number; // 已提现金额
  conversionRate: number; // 转化率
}

/**
 * 邀请记录
 */
export interface ReferralRecord {
  id: string;
  refereeId: string; // 被邀请人ID
  refereeUsername: string; // 被邀请人用户名
  refereeEmail?: string;
  refereePhone?: string;
  status: ReferralStatus;
  reward: number; // 奖励金额
  registeredAt: string; // 注册时间
  confirmedAt?: string; // 确认时间
  rewardedAt?: string; // 奖励发放时间
  createdAt: string;
}

/**
 * 提现记录
 */
export interface WithdrawRecord {
  id: string;
  amount: number;
  status: WithdrawStatus;
  method: 'alipay' | 'wechat' | 'bank'; // 提现方式
  account: string; // 提现账户
  accountName?: string; // 账户名
  fee?: number; // 手续费
  actualAmount?: number; // 实际到账金额
  remark?: string; // 备注
  rejectReason?: string; // 拒绝原因
  appliedAt: string; // 申请时间
  processedAt?: string; // 处理时间
  completedAt?: string; // 完成时间
  createdAt: string;
}

/**
 * 邀请配置
 */
export interface ReferralConfig {
  inviteCode: string; // 邀请码
  inviteLink: string; // 邀请链接
  qrCodeUrl?: string; // 二维码URL
  rewardPerInvite: number; // 每邀请一人的奖励
  minWithdrawAmount: number; // 最低提现金额
  withdrawFeeRate: number; // 提现手续费率 (0-1)
  rules: string; // 规则说明
}

/**
 * 获取邀请配置
 */
export async function getReferralConfig() {
  return request<ReferralConfig>('/api/referral/config', {
    method: 'GET',
  });
}

/**
 * 生成邀请码
 */
export async function generateInviteCode() {
  return request<{
    code: string;
    link: string;
    qrCodeUrl: string;
  }>('/api/referral/generate-code', {
    method: 'POST',
  });
}

/**
 * 获取邀请统计
 */
export async function getReferralStats() {
  return request<ReferralStats>('/api/referral/stats', {
    method: 'GET',
  });
}

/**
 * 获取邀请记录
 */
export async function getReferralRecords(params?: {
  status?: ReferralStatus;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}) {
  return request<{
    data: ReferralRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>('/api/referral/records', {
    method: 'GET',
    params,
  });
}

/**
 * 获取提现记录
 */
export async function getWithdrawRecords(params?: {
  status?: WithdrawStatus;
  page?: number;
  pageSize?: number;
}) {
  return request<{
    data: WithdrawRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>('/api/referral/withdrawals', {
    method: 'GET',
    params,
  });
}

/**
 * 申请提现
 */
export async function applyWithdraw(data: {
  amount: number;
  method: 'alipay' | 'wechat' | 'bank';
  account: string;
  accountName?: string;
  remark?: string;
}) {
  return request<{
    withdrawId: string;
    message: string;
    estimatedArrival: string; // 预计到账时间
  }>('/api/referral/withdraw', {
    method: 'POST',
    data,
  });
}

/**
 * 取消提现
 */
export async function cancelWithdraw(withdrawId: string) {
  return request<{
    success: boolean;
    message: string;
  }>(`/api/referral/withdrawals/${withdrawId}/cancel`, {
    method: 'POST',
  });
}

/**
 * 生成邀请海报
 */
export async function generatePoster() {
  return request<{
    posterUrl: string;
  }>('/api/referral/generate-poster', {
    method: 'POST',
  });
}

/**
 * 获取收益明细
 */
export async function getEarningsDetail(params?: {
  type?: 'invite' | 'bonus' | 'other';
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}) {
  return request<{
    data: Array<{
      id: string;
      type: 'invite' | 'bonus' | 'other';
      amount: number;
      description: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>('/api/referral/earnings', {
    method: 'GET',
    params,
  });
}

/**
 * 分享到社交平台
 */
export async function shareToSocial(params: {
  platform: 'wechat' | 'qq' | 'weibo' | 'link';
  inviteCode: string;
}) {
  return request<{
    shareUrl: string;
    shareText: string;
  }>('/api/referral/share', {
    method: 'POST',
    data: params,
  });
}
