import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { Spin } from 'antd';

/**
 * 通用懒加载包装器
 * @param Component 懒加载的组件
 * @param fallback 加载时的占位内容
 */
export const withLazyLoad = <P extends object>(
  Component: React.LazyExoticComponent<ComponentType<P>>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <Suspense
      fallback={
        fallback || (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spin size="large" />
          </div>
        )
      }
    >
      <Component {...props} />
    </Suspense>
  );
};

// 懒加载大型第三方库组件
// 这些组件体积大,应该按需加载

/**
 * ECharts 图表组件 (~500KB)
 * 只在需要显示图表时加载
 */
export const LazyECharts = lazy(
  () => import('echarts-for-react').catch(() => {
    console.warn('[LazyLoad] Failed to load ECharts');
    return {
      default: () => <div>图表加载失败</div>,
    };
  })
);

export const EChartsLazy = withLazyLoad(LazyECharts);

/**
 * Monaco Editor 代码编辑器 (~2MB)
 * 只在需要编辑代码时加载
 */
export const LazyMonacoEditor = lazy(
  () => import('@monaco-editor/react').catch(() => {
    console.warn('[LazyLoad] Failed to load Monaco Editor');
    return {
      default: () => <div>编辑器加载失败</div>,
    };
  })
);

export const MonacoEditorLazy = withLazyLoad(LazyMonacoEditor);

/**
 * 使用示例:
 *
 * import { EChartsLazy } from '@/components/LazyComponents';
 *
 * const Dashboard = () => {
 *   return (
 *     <div>
 *       <h1>数据看板</h1>
 *       <EChartsLazy option={chartOption} />
 *     </div>
 *   );
 * };
 */
