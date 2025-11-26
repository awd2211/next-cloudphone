import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { Spin } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';

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
 * ECharts 图表组件 (优化后 ~200KB，减少 60%)
 * 使用按需加载的 echarts，只在需要显示图表时加载
 */
export const LazyECharts = lazy(() =>
  import('@/components/ReactECharts').catch(() => {
    console.warn('[LazyLoad] Failed to load ECharts');
    return {
      default: () => <div>图表加载失败</div>,
    };
  })
);

export const EChartsLazy = withLazyLoad(LazyECharts);

/**
 * WebRTC 播放器组件 (~300KB WebRTC 库)
 * 只在需要实时查看设备屏幕时加载
 */
export const LazyWebRTCPlayer = lazy(() =>
  import('@/components/WebRTCPlayer').catch(() => {
    console.warn('[LazyLoad] Failed to load WebRTCPlayer');
    return {
      default: () => <div>视频播放器加载失败</div>,
    };
  })
);

export const WebRTCPlayerLazy = withLazyLoad(
  LazyWebRTCPlayer,
  <div
    style={{
      padding: '48px',
      textAlign: 'center',
      background: '#000',
      borderRadius: '8px',
      minHeight: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div>
      <Spin size="large" />
      <div style={{ color: '#fff', marginTop: '16px' }}>加载播放器中...</div>
    </div>
  </div>
);

/**
 * 阿里云云手机播放器组件
 * 使用无影 Web SDK 连接阿里云云手机
 */
export const LazyAliyunCloudPhonePlayer = lazy(() =>
  import('@/components/AliyunCloudPhonePlayer').catch(() => {
    console.warn('[LazyLoad] Failed to load AliyunCloudPhonePlayer');
    return {
      default: () => <div>阿里云播放器加载失败</div>,
    };
  })
);

export const AliyunCloudPhonePlayerLazy = withLazyLoad(
  LazyAliyunCloudPhonePlayer,
  <div
    style={{
      padding: '48px',
      textAlign: 'center',
      background: '#000',
      borderRadius: '8px',
      minHeight: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div>
      <Spin size="large" />
      <div style={{ color: '#fff', marginTop: '16px' }}>加载阿里云播放器中...</div>
    </div>
  </div>
);

/**
 * ADB 控制台组件 (~150KB 终端库)
 * 只在需要执行 ADB 命令时加载
 */
export const LazyADBConsole = lazy(() =>
  import('@/components/ADBConsole').catch(() => {
    console.warn('[LazyLoad] Failed to load ADBConsole');
    return {
      default: () => <div>控制台加载失败</div>,
    };
  })
);

export const ADBConsoleLazy = withLazyLoad(
  LazyADBConsole,
  <div
    style={{
      padding: '24px',
      textAlign: 'center',
      border: `1px solid ${NEUTRAL_LIGHT.border.primary}`,
      borderRadius: '4px',
      background: NEUTRAL_LIGHT.bg.elevated,
    }}
  >
    <Spin />
    <div style={{ marginTop: '12px', color: NEUTRAL_LIGHT.text.secondary }}>加载控制台中...</div>
  </div>
);

/**
 * 收入图表组件 (ECharts)
 */
export const LazyRevenueChart = lazy(() =>
  import('@/components/RevenueChart').catch(() => {
    console.warn('[LazyLoad] Failed to load RevenueChart');
    return {
      default: () => <div>图表加载失败</div>,
    };
  })
);

export const RevenueChartLazy = withLazyLoad(LazyRevenueChart);

/**
 * 设备状态图表组件 (ECharts)
 */
export const LazyDeviceStatusChart = lazy(() =>
  import('@/components/DeviceStatusChart').catch(() => {
    console.warn('[LazyLoad] Failed to load DeviceStatusChart');
    return {
      default: () => <div>图表加载失败</div>,
    };
  })
);

export const DeviceStatusChartLazy = withLazyLoad(LazyDeviceStatusChart);

/**
 * 用户增长图表组件 (ECharts)
 */
export const LazyUserGrowthChart = lazy(() =>
  import('@/components/UserGrowthChart').catch(() => {
    console.warn('[LazyLoad] Failed to load UserGrowthChart');
    return {
      default: () => <div>图表加载失败</div>,
    };
  })
);

export const UserGrowthChartLazy = withLazyLoad(LazyUserGrowthChart);

/**
 * 套餐分布图表组件 (ECharts)
 */
export const LazyPlanDistributionChart = lazy(() =>
  import('@/components/PlanDistributionChart').catch(() => {
    console.warn('[LazyLoad] Failed to load PlanDistributionChart');
    return {
      default: () => <div>图表加载失败</div>,
    };
  })
);

export const PlanDistributionChartLazy = withLazyLoad(LazyPlanDistributionChart);

/**
 * 使用示例:
 *
 * import {
 *   WebRTCPlayerLazy,
 *   ADBConsoleLazy,
 *   RevenueChartLazy,
 *   DeviceStatusChartLazy,
 *   UserGrowthChartLazy,
 *   PlanDistributionChartLazy
 * } from '@/components/LazyComponents';
 *
 * // 在设备详情页
 * const DeviceDetail = () => {
 *   return (
 *     <div>
 *       <h1>设备实时画面</h1>
 *       <WebRTCPlayerLazy deviceId={deviceId} />
 *
 *       <h2>ADB 控制台</h2>
 *       <ADBConsoleLazy deviceId={deviceId} />
 *     </div>
 *   );
 * };
 *
 * // 在仪表盘
 * const Dashboard = () => {
 *   return (
 *     <div>
 *       <h1>数据看板</h1>
 *       <RevenueChartLazy data={revenueData} />
 *       <DeviceStatusChartLazy data={statusData} />
 *     </div>
 *   );
 * };
 */
