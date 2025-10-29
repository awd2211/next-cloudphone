import { useState, useEffect, ComponentType } from 'react';

/**
 * 条件懒加载组件 Hook
 * 只有在条件满足时才加载组件,节省初始加载时间
 *
 * @param importFn 动态导入函数
 * @param shouldLoad 是否应该加载组件
 * @returns { Component, loading, error }
 *
 * @example
 * const { Component: ChartComponent, loading } = useLazyComponent(
 *   () => import('@/components/DeviceChart'),
 *   showChart // 只有在 showChart 为 true 时才加载
 * );
 *
 * return (
 *   <div>
 *     <Button onClick={() => setShowChart(true)}>显示图表</Button>
 *     {showChart && (loading ? <Spin /> : ChartComponent && <ChartComponent />)}
 *   </div>
 * );
 */
export const useLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  shouldLoad: boolean
) => {
  const [Component, setComponent] = useState<ComponentType<P> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (shouldLoad && !Component && !loading) {
      setLoading(true);
      setError(null);

      importFn()
        .then((module) => {
          setComponent(() => module.default);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[useLazyComponent] Failed to load component:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        });
    }
  }, [shouldLoad, Component, loading, importFn]);

  return { Component, loading, error };
};

export default useLazyComponent;
