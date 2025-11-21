/**
 * 自定义 ReactECharts 组件
 *
 * 使用按需加载的 echarts 实例，减少 bundle 大小
 */

import { useEffect, useRef, CSSProperties } from 'react';
import echarts, { ECOption } from '@/utils/echarts';
import { Spin } from 'antd';

export interface ReactEChartsProps {
  option: ECOption;
  style?: CSSProperties;
  showLoading?: boolean;
  className?: string;
  theme?: string | object;
  notMerge?: boolean;
  lazyUpdate?: boolean;
  onChartReady?: (chart: echarts.ECharts) => void;
  onEvents?: Record<string, Function>;
}

/**
 * ReactECharts 组件（优化版）
 *
 * 特性：
 * - 使用按需加载的 echarts
 * - 自动处理响应式调整
 * - 支持加载状态
 * - 支持事件绑定
 */
const ReactECharts: React.FC<ReactEChartsProps> = ({
  option,
  style = {},
  showLoading = false,
  className,
  theme,
  notMerge = false,
  lazyUpdate = false,
  onChartReady,
  onEvents,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    // 创建 echarts 实例
    const chartInstance = echarts.init(chartRef.current, theme);
    chartInstanceRef.current = chartInstance;

    // 绑定事件
    if (onEvents) {
      Object.keys(onEvents).forEach((eventName) => {
        const handler = onEvents[eventName];
        if (handler) {
          chartInstance.on(eventName, (params) => {
            handler(params, chartInstance);
          });
        }
      });
    }

    // 通知图表已就绪
    if (onChartReady) {
      onChartReady(chartInstance);
    }

    // 窗口大小变化时重新调整图表
    const handleResize = () => {
      chartInstance.resize();
    };
    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
      chartInstanceRef.current = null;
    };
  }, [theme, onChartReady, onEvents]);

  // 更新图表配置
  useEffect(() => {
    if (!chartInstanceRef.current) return;

    if (showLoading) {
      chartInstanceRef.current.showLoading();
    } else {
      chartInstanceRef.current.hideLoading();
      chartInstanceRef.current.setOption(option, notMerge, lazyUpdate);
    }
  }, [option, showLoading, notMerge, lazyUpdate]);

  return (
    <div
      ref={chartRef}
      style={{
        width: '100%',
        height: 400,
        ...style,
      }}
      className={className}
    >
      {showLoading && !chartInstanceRef.current && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Spin tip="加载中..." />
        </div>
      )}
    </div>
  );
};

export default ReactECharts;
