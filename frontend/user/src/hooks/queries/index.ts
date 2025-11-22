/**
 * React Query Hooks 统一导出
 *
 * 所有使用 React Query 的 hooks 都从这里导出
 * 方便统一管理和使用
 */

// ==================== 设备管理 ====================
export {
  deviceKeys,
  useMyDevices,
  useDevice,
  useDeviceStats,
  useStartDevice,
  useStopDevice,
  useRebootDevice,
} from './useDevices';
export type { DeviceStats } from './useDevices';

// ==================== 代理管理 ====================
export {
  proxyKeys,
  useMyProxies,
  useProxyDetail,
  useMyProxyStats,
  useAvailableProxies,
  useProxyUsageHistory,
  useAcquireProxy,
  useReleaseProxy,
  useBatchReleaseProxies,
  useRenewProxy,
  useTestProxy,
  useReportProxyIssue,
} from './useProxy';
export type {
  ProxyStats,
  ProxyListResponse,
  ProxyUsageRecord,
  ProxyUsageHistoryResponse,
} from './useProxy';

// ==================== 短信管理 ====================
export {
  smsKeys,
  useMySMS,
  useMySMSStats,
  useDeviceSMS,
  useMyVerificationCodes,
  useVerificationCodeByPhone,
  useDeviceLatestCode,
  useMyNumbers,
  useMyNumberStats,
  useAcquireNumber,
  useReleaseNumber,
  useRenewNumber,
  useMarkSMSAsRead,
  useBatchMarkAsRead,
} from './useSMS';
export type {
  SMSRecord,
  SMSStats,
  VerificationCode,
  PhoneNumber,
  SMSListResponse,
  VerificationCodesListResponse,
  OTPActiveStatus,
  NumbersListResponse,
  NumberStats,
} from './useSMS';

// ==================== 工单管理 ====================
export {
  ticketKeys,
  useMyTickets,
  useTicketDetail,
  useTicketReplies,
  useCreateTicket,
  useUpdateTicket,
  useAddTicketReply,
  useCloseTicket,
  useReopenTicket,
  useRateTicket,
  useMarkReplyAsRead,
  useMarkAllRepliesAsRead,
  useUnreadRepliesCount,
  useRelatedTickets,
  useSuggestedTags,
  useSubmitSatisfactionSurvey,
  useTicketNotificationSettings,
  useUpdateTicketNotificationSettings,
  useMyTicketStats,
} from './useTickets';

// ==================== 订单管理 ====================
export {
  orderKeys,
  useMyOrders,
  useOrder,
  useCreateOrder,
  useCancelOrder,
} from './useOrders';

// ==================== 账单管理 ====================
export {
  billKeys,
  useBills,
  useBillDetail,
  useBillStats,
  useInvoices,
  usePayBill,
  useCancelBill,
  useRequestRefund,
  useDownloadBill,
  useApplyInvoice,
  useDownloadInvoice,
} from './useBills';
export type { InvoiceListResponse } from './useBills';

// ==================== 支付方式管理 ====================
export {
  paymentMethodKeys,
  usePaymentMethods,
  useIsPaymentMethodEnabled,
  useAvailablePaymentMethods,
} from './usePaymentMethods';
export type { PaymentMethodItem } from './usePaymentMethods';

// ==================== 账户余额管理 ====================
export {
  balanceKeys,
  useBalance,
  useUserBalance,
  useBalanceTransactions,
  useBalanceStatistics,
  useRecharge,
  formatBalance,
} from './useBalance';
export type {
  UserBalance,
  BalanceTransaction,
  BalanceStatistics,
  TransactionListParams,
  TransactionListResponse,
} from './useBalance';

// ==================== 认证管理 ====================
export {
  authKeys,
  useCaptcha,
  useCurrentUser,
  use2FAStatus,
  useLoginHistory,
  useActiveSessions,
  useLogin,
  useRegister,
  useLogout,
  useChangePassword,
  useForgotPassword,
  useVerifyResetToken,
  useResetPassword,
  useGenerate2FA,
  useEnable2FA,
  useVerify2FACode,
  useDisable2FA,
  useTerminateSession,
  useTerminateAllSessions,
} from './useAuth';
export type {
  CaptchaResponse,
  TwoFactorStatus,
  LoginHistoryItem,
  LoginHistoryResponse,
  Session,
  VerifyResetTokenResponse,
} from './useAuth';

// ==================== 快照管理 ====================
export {
  snapshotKeys,
  useDeviceSnapshots,
  useUserSnapshots,
  useSnapshot,
  useCreateSnapshot,
  useRestoreSnapshot,
  useDeleteSnapshot,
} from './useSnapshots';

// ==================== 应用管理 ====================
export {
  appKeys,
  useApps,
  useApp,
  useInstalledApps,
  useInstallApp,
  useUninstallApp,
  useBatchUninstallApps,
  useUpdateApp,
} from './useApps';

// ==================== 帮助中心 ====================
export {
  helpKeys,
  useHelpCategories,
  usePopularArticles,
  useLatestArticles,
  useFAQs,
} from './useHelp';
export type { FAQListResponse } from './useHelp';

// ==================== 导出中心 ====================
export {
  exportKeys,
  useExportTasks,
  useExportStats,
  useCreateExportTask,
  useDownloadExportFile,
  useRetryExportTask,
  useDeleteExportTask,
  useDeleteExportTasks,
  useClearCompletedTasks,
  useClearFailedTasks,
} from './useExport';
export type { ExportStats, ExportTasksResponse } from './useExport';

// ==================== 消息通知 ====================
export {
  notificationKeys,
  useNotifications,
  useNotificationDetail,
  useUnreadCount,
  useNotificationSettings,
  useNotificationStats,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotifications,
  useClearReadNotifications,
  useUpdateNotificationSettings,
  useRealtimeNotifications,
} from './useNotifications';
export type {
  NotificationStats,
  NotificationListResponse,
  UnreadCountResponse,
} from './useNotifications';

// ==================== 活动中心 ====================
export {
  activityKeys,
  couponKeys,
  useActivities,
  useActivityDetail,
  useMyParticipations,
  useMyCoupons,
  useActivityStats,
  useParticipateActivity,
  useClaimCoupon,
  useUseCoupon,
} from './useActivities';
export type {
  ActivityListResponse,
  ParticipationListResponse,
  CouponListResponse,
  ActivityStats,
} from './useActivities';

// ==================== 推荐返利 ====================
export {
  referralKeys,
  useReferralConfig,
  useReferralStats,
  useReferralRecords,
  useWithdrawRecords,
  useEarningsDetail,
  useGenerateInviteCode,
  useApplyWithdraw,
  useCancelWithdraw,
  useGeneratePoster,
  useShareToSocial,
} from './useReferrals';
export type {
  ReferralStats,
  ReferralConfig,
  ReferralRecord,
  WithdrawRecord,
  ReferralRecordsResponse,
  WithdrawRecordsResponse,
  EarningDetail,
  EarningsResponse,
} from './useReferrals';

// ==================== 套餐计划 ====================
export {
  planKeys,
  usePlans,
  useActivePlans,
  usePlan,
} from './usePlans';

// ==================== 说明：不需要迁移的 Hooks ====================
// 以下 hooks 由于特殊原因不需要迁移到 React Query:
//
// 1. useDashboard.tsx - 仪表盘数据聚合 Hook
//    原因: 应由组件层面组合多个已有的 React Query hooks（设备、账单、应用等）
//    建议: 在组件中直接使用 useDeviceStats, useBalance, useActivityStats 等组合
//
// 2. useHome.tsx - 首页业务逻辑 Hook
//    原因: 主要是导航逻辑和模拟数据，套餐部分已由 usePlans 覆盖
//    建议: 组件中使用 useActivePlans + React Router hooks
//
// 3. usePricing.ts - 定价计算 Hook
//    原因: 纯 UI 状态和本地计算逻辑，不涉及服务器数据
//    建议: 保持现状或迁移为纯计算函数
//
// 4. useDeviceDetail.tsx - 设备详情页 Hook
//    原因: 功能已被 useDevice hook 完全覆盖（来自 useDevices.ts）
//    建议: 使用 useDevice, useStartDevice, useStopDevice, useRebootDevice
//
// 5. useDeviceList.tsx - 设备列表 Hook
//    原因: 功能已被 useMyDevices hook 完全覆盖（来自 useDevices.ts）
//    建议: 使用 useMyDevices
//
// 6. useBatchDeviceOperation.tsx - 批量设备操作 Hook
//    原因: 主要是 UI 状态管理（模态框、进度）和错误处理逻辑
//    建议: 保持现状，或将批量 API 调用部分提取为 mutations
//
// 7. useDeviceMonitor.tsx - 设备监控 Hook
//    原因: 可能包含特殊的监控逻辑和 WebSocket 连接
//    建议: 需要查看具体实现后决定
//
// P3 优先级（工具类，不需要迁移）:
// - useWebRTC.tsx - WebRTC 实时通信（特殊的实时通信逻辑）
// - useScrollAnimation.ts - UI 动画工具类
