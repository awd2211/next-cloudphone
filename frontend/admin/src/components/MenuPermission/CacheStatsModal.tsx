/**
 * CacheStatsModal - 缓存统计详情弹窗组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Descriptions, Badge, Empty } from 'antd';
import type { MenuCacheStats } from '@/types';
import dayjs from 'dayjs';

interface CacheStatsModalProps {
  visible: boolean;
  cacheStats: MenuCacheStats | null;
  onClose: () => void;
}

/**
 * CacheStatsModal 组件
 * 显示缓存详细统计信息
 */
export const CacheStatsModal = memo<CacheStatsModalProps>(({ visible, cacheStats, onClose }) => {
  return (
    <Modal title="缓存统计详情" open={visible} onCancel={onClose} footer={null} width={600}>
      {cacheStats ? (
        <Descriptions column={1} bordered>
          <Descriptions.Item label="已缓存用户数">{cacheStats.totalCached}</Descriptions.Item>
          <Descriptions.Item label="活跃用户数">{cacheStats.activeUsers}</Descriptions.Item>
          <Descriptions.Item label="缓存命中率">
            <Badge
              status={cacheStats.hitRate > 80 ? 'success' : 'warning'}
              text={`${cacheStats.hitRate.toFixed(2)}%`}
            />
          </Descriptions.Item>
          <Descriptions.Item label="缓存未命中率">
            {cacheStats.missRate.toFixed(2)}%
          </Descriptions.Item>
          <Descriptions.Item label="平均加载时间">
            {cacheStats.avgLoadTime.toFixed(0)} ms
          </Descriptions.Item>
          <Descriptions.Item label="缓存大小">{cacheStats.cacheSize} KB</Descriptions.Item>
          <Descriptions.Item label="运行时间">
            {Math.floor(cacheStats.uptime / 3600)} 小时{' '}
            {Math.floor((cacheStats.uptime % 3600) / 60)} 分钟
          </Descriptions.Item>
          {cacheStats.lastClearTime && (
            <Descriptions.Item label="上次清理时间">
              {dayjs(cacheStats.lastClearTime).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          )}
        </Descriptions>
      ) : (
        <Empty description="暂无缓存统计数据" />
      )}
    </Modal>
  );
});

CacheStatsModal.displayName = 'CacheStatsModal';
