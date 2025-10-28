/**
 * 性能监控 Hook
 * 监控和记录组件性能指标
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  renderTime: number;
  lastRenderTime: number;
  mountTime: number;
  updateTimes: number[];
  averageUpdateTime: number;
}

interface UsePerformanceOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  componentName?: string;
  trackUpdates?: boolean;
}

/**
 * 性能监控 Hook
 *
 * @example
 * function MyComponent() {
 *   const metrics = usePerformance({ componentName: 'MyComponent' });
 *
 *   return (
 *     <div>
 *       <p>渲染次数: {metrics.renderCount}</p>
 *       <p>平均更新时间: {metrics.averageUpdateTime}ms</p>
 *     </div>
 *   );
 * }
 */
export function usePerformance(options: UsePerformanceOptions = {}): PerformanceMetrics {
  const {
    enabled = process.env.NODE_ENV === 'development',
    logToConsole = true,
    componentName = 'Component',
    trackUpdates = true,
  } = options;

  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(0);
  const updateTimesRef = useRef<number[]>([]);
  const renderStartTimeRef = useRef<number>(0);

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    renderTime: 0,
    lastRenderTime: 0,
    mountTime: 0,
    updateTimes: [],
    averageUpdateTime: 0,
  });

  // 开始计时
  renderStartTimeRef.current = performance.now();

  // 记录挂载时间
  useEffect(() => {
    if (!enabled) return;

    mountTimeRef.current = performance.now();

    if (logToConsole) {
      console.log(`[Performance] ${componentName} mounted in ${mountTimeRef.current.toFixed(2)}ms`);
    }
  }, [enabled, logToConsole, componentName]);

  // 记录渲染时间
  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTimeRef.current;

    renderCountRef.current += 1;
    lastRenderTimeRef.current = renderTime;

    if (trackUpdates && renderCountRef.current > 1) {
      updateTimesRef.current.push(renderTime);
    }

    const averageUpdateTime =
      updateTimesRef.current.length > 0
        ? updateTimesRef.current.reduce((a, b) => a + b, 0) / updateTimesRef.current.length
        : 0;

    setMetrics({
      renderCount: renderCountRef.current,
      renderTime,
      lastRenderTime: renderTime,
      mountTime: mountTimeRef.current,
      updateTimes: [...updateTimesRef.current],
      averageUpdateTime,
    });

    if (logToConsole) {
      console.log(`[Performance] ${componentName} render #${renderCountRef.current}: ${renderTime.toFixed(2)}ms`);

      // 警告慢渲染
      if (renderTime > 16) {
        console.warn(
          `[Performance] ⚠️ ${componentName} render took ${renderTime.toFixed(2)}ms (> 16ms), may cause frame drops!`
        );
      }
    }
  });

  return metrics;
}

/**
 * Web Vitals 监控 Hook
 * 监控核心 Web 性能指标
 */
export function useWebVitals() {
  const [vitals, setVitals] = useState({
    fcp: 0, // First Contentful Paint
    lcp: 0, // Largest Contentful Paint
    fid: 0, // First Input Delay
    cls: 0, // Cumulative Layout Shift
    ttfb: 0, // Time to First Byte
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 使用 PerformanceObserver 监控性能指标
    try {
      // FCP
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setVitals((prev) => ({ ...prev, fcp: lastEntry.startTime }));
      });
      fcpObserver.observe({ type: 'paint', buffered: true });

      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        setVitals((prev) => ({ ...prev, lcp: lastEntry.renderTime || lastEntry.loadTime }));
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          setVitals((prev) => ({ ...prev, fid: entry.processingStart - entry.startTime }));
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            setVitals((prev) => ({ ...prev, cls: clsValue }));
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // TTFB
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const ttfb = navigationEntries[0].responseStart;
        setVitals((prev) => ({ ...prev, ttfb }));
      }

      return () => {
        fcpObserver.disconnect();
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    } catch (error) {
      console.error('Web Vitals monitoring failed:', error);
    }
  }, []);

  return vitals;
}

/**
 * API 性能监控 Hook
 * 监控 API 请求的性能
 */
export function useApiPerformance() {
  const [apiMetrics, setApiMetrics] = useState<{
    totalRequests: number;
    averageTime: number;
    slowRequests: number;
    failedRequests: number;
  }>({
    totalRequests: 0,
    averageTime: 0,
    slowRequests: 0,
    failedRequests: 0,
  });

  const requestTimesRef = useRef<number[]>([]);

  const trackRequest = useCallback((duration: number, failed = false) => {
    requestTimesRef.current.push(duration);

    setApiMetrics((prev) => {
      const totalRequests = prev.totalRequests + 1;
      const averageTime =
        requestTimesRef.current.reduce((a, b) => a + b, 0) / requestTimesRef.current.length;
      const slowRequests = prev.slowRequests + (duration > 1000 ? 1 : 0);
      const failedRequests = prev.failedRequests + (failed ? 1 : 0);

      return {
        totalRequests,
        averageTime,
        slowRequests,
        failedRequests,
      };
    });
  }, []);

  return {
    metrics: apiMetrics,
    trackRequest,
  };
}

/**
 * 内存使用监控 Hook
 */
export function useMemoryMonitor(interval = 5000) {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: number;
  } | null>(null);

  useEffect(() => {
    // @ts-ignore - performance.memory 是非标准 API
    if (!performance.memory) {
      console.warn('Memory monitoring not supported in this browser');
      return;
    }

    const updateMemoryInfo = () => {
      // @ts-ignore
      const memory = performance.memory;
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      setMemoryInfo({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage,
      });

      // 警告内存使用过高
      if (usagePercentage > 90) {
        console.warn(
          `⚠️ Memory usage is high: ${usagePercentage.toFixed(2)}% (${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB / ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB)`
        );
      }
    };

    updateMemoryInfo();
    const timer = setInterval(updateMemoryInfo, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return memoryInfo;
}

/**
 * 渲染性能分析器组件
 * 显示性能指标
 */
export function PerformanceMonitor({ position = 'bottom-right' }: { position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left' }) {
  const vitals = useWebVitals();
  const memoryInfo = useMemoryMonitor();
  const [visible, setVisible] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: 16, right: 16 },
    'top-right': { top: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'top-left': { top: 16, left: 16 },
  };

  return (
    <>
      <button
        onClick={() => setVisible(!visible)}
        style={{
          position: 'fixed',
          ...positionStyles[position],
          zIndex: 10000,
          padding: '8px 12px',
          background: '#000',
          color: '#0f0',
          border: '1px solid #0f0',
          borderRadius: 4,
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: 12,
        }}
      >
        {visible ? '隐藏' : '性能'}
      </button>

      {visible && (
        <div
          style={{
            position: 'fixed',
            bottom: position.includes('bottom') ? 60 : undefined,
            top: position.includes('top') ? 60 : undefined,
            right: position.includes('right') ? 16 : undefined,
            left: position.includes('left') ? 16 : undefined,
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.9)',
            color: '#0f0',
            padding: 16,
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 12,
            minWidth: 300,
            border: '1px solid #0f0',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: '#fff' }}>性能指标</h3>

          <div style={{ marginBottom: 12 }}>
            <h4 style={{ margin: '8px 0 4px 0', color: '#fff' }}>Web Vitals</h4>
            <div>FCP: {vitals.fcp.toFixed(2)}ms</div>
            <div>LCP: {vitals.lcp.toFixed(2)}ms {vitals.lcp > 2500 && '⚠️'}</div>
            <div>FID: {vitals.fid.toFixed(2)}ms {vitals.fid > 100 && '⚠️'}</div>
            <div>CLS: {vitals.cls.toFixed(4)} {vitals.cls > 0.1 && '⚠️'}</div>
            <div>TTFB: {vitals.ttfb.toFixed(2)}ms</div>
          </div>

          {memoryInfo && (
            <div>
              <h4 style={{ margin: '8px 0 4px 0', color: '#fff' }}>内存使用</h4>
              <div>
                已用: {(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB
              </div>
              <div>
                总计: {(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB
              </div>
              <div>
                限制: {(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB
              </div>
              <div>
                使用率: {memoryInfo.usagePercentage.toFixed(2)}%{' '}
                {memoryInfo.usagePercentage > 80 && '⚠️'}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
