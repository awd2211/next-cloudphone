/**
 * BalanceDisplay - 余额显示组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';

interface BalanceDisplayProps {
  balance: number;
}

/**
 * BalanceDisplay 组件
 * 格式化显示用户余额（保留两位小数）
 */
export const BalanceDisplay = memo<BalanceDisplayProps>(({ balance }) => {
  return <>¥{(balance || 0).toFixed(2)}</>;
});

BalanceDisplay.displayName = 'BalanceDisplay';
