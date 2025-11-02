import { Tag } from 'antd';
import {
  GiftOutlined,
  ThunderboltOutlined,
  PercentageOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { ActivityType, ActivityStatus } from '@/services/activity';

/**
 * 活动配置文件
 *
 * 包含：
 * - 活动类型配置
 * - 活动状态配置
 * - Tab 配置
 * - 工具函数
 */

// ==================== 活动类型配置 ====================

export const activityTypeConfig: Record<ActivityType, { icon: any; color: string; text: string }> =
  {
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

/**
 * 获取活动类型配置
 */
export const getTypeConfig = (type: ActivityType) => {
  return activityTypeConfig[type] || activityTypeConfig[ActivityType.DISCOUNT];
};

// ==================== 活动状态配置 ====================

export const activityStatusConfig: Record<ActivityStatus, { color: string; text: string }> = {
  [ActivityStatus.UPCOMING]: { color: 'blue', text: '即将开始' },
  [ActivityStatus.ONGOING]: { color: 'green', text: '进行中' },
  [ActivityStatus.ENDED]: { color: 'default', text: '已结束' },
};

/**
 * 获取活动状态标签
 */
export const getStatusTag = (status: ActivityStatus) => {
  const { color, text } = activityStatusConfig[status];
  return <Tag color={color}>{text}</Tag>;
};

// ==================== Tab 配置 ====================

export const activityTabsConfig = [
  { key: 'all', label: '全部活动' },
  { key: ActivityStatus.ONGOING, label: '进行中' },
  { key: ActivityStatus.UPCOMING, label: '即将开始' },
  { key: ActivityStatus.ENDED, label: '已结束' },
];

// ==================== 工具函数 ====================

/**
 * 计算参与进度百分比
 */
export const calculateProgress = (
  currentParticipants?: number,
  maxParticipants?: number
): number => {
  if (!maxParticipants || !currentParticipants) return 0;
  return (currentParticipants / maxParticipants) * 100;
};

/**
 * 格式化日期范围
 */
export const formatDateRange = (startTime: string, endTime: string): string => {
  const start = new Date(startTime).toLocaleDateString();
  const end = new Date(endTime).toLocaleDateString();
  return `${start} - ${end}`;
};

/**
 * 获取活动按钮文本
 */
export const getActivityButtonText = (status: ActivityStatus): string => {
  const textMap: Record<ActivityStatus, string> = {
    [ActivityStatus.ONGOING]: '立即参与',
    [ActivityStatus.UPCOMING]: '敬请期待',
    [ActivityStatus.ENDED]: '活动已结束',
  };
  return textMap[status];
};

/**
 * 格式化完整日期时间
 */
export const formatDateTime = (dateTime: string): string => {
  return new Date(dateTime).toLocaleString();
};

/**
 * 获取活动类型大图标（用于横幅）
 */
export const getTypeIcon = (type: ActivityType) => {
  const iconMap: Record<ActivityType, any> = {
    [ActivityType.GIFT]: <GiftOutlined />,
    [ActivityType.DISCOUNT]: <PercentageOutlined />,
    [ActivityType.FLASH_SALE]: <ThunderboltOutlined />,
    [ActivityType.NEW_USER]: <TrophyOutlined />,
  };
  return iconMap[type] || <GiftOutlined />;
};

// ==================== 状态提示配置 ====================

/**
 * 获取状态提示配置
 */
export const getStatusAlertConfig = (status: ActivityStatus) => {
  const configMap: Record<
    ActivityStatus,
    { message: string; type: 'info' | 'warning' | 'success' | 'error' }
  > = {
    [ActivityStatus.UPCOMING]: { message: '活动即将开始，敬请期待!', type: 'info' },
    [ActivityStatus.ONGOING]: { message: '活动进行中，快来参与吧!', type: 'success' },
    [ActivityStatus.ENDED]: { message: '活动已结束', type: 'warning' },
  };
  return configMap[status];
};
