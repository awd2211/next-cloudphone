export interface CacheStats {
  l1Hits: number;
  l2Hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  missRate: number;
  l1Size: number;
  l2Size: number;
}

export const CACHE_INFO_TEXTS = {
  l1Description: 'L1 缓存 (NodeCache): 内存级缓存，速度最快，适合频繁访问的热数据',
  l2Description: 'L2 缓存 (Redis): 分布式缓存，支持跨进程共享，持久化存储',
  strategy: '缓存策略: 先查 L1，未命中查 L2，再未命中查数据库并回填缓存',
  performanceMetrics: [
    '命中率 ≥ 80%: 优秀 (绿色)',
    '命中率 50-80%: 正常 (蓝色)',
    '命中率 < 50%: 需优化 (红色)',
  ],
};

export const MODAL_TEXTS = {
  deleteKey: {
    title: '删除指定缓存键',
    okText: '删除',
    placeholder: '例如: user:123, device:456',
    alertMessage: '提示',
    alertDescription: '请输入完整的缓存键名称，删除后无法恢复。',
  },
  deletePattern: {
    title: '按模式批量删除',
    okText: '删除',
    placeholder: '例如: user:*, session:123*',
    alertMessage: '支持的通配符',
  },
  checkKey: {
    title: '检查缓存键是否存在',
    okText: '检查',
    placeholder: '例如: user:123',
  },
};

export const getHitRateStatus = (rate: number): 'success' | 'normal' | 'exception' => {
  if (rate >= 80) return 'success';
  if (rate >= 50) return 'normal';
  return 'exception';
};

export const getHitRateColor = (rate: number): string => {
  if (rate >= 80) return '#52c41a';
  if (rate >= 50) return '#1890ff';
  return '#ff4d4f';
};
