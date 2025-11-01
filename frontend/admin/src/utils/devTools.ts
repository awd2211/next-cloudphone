/**
 * 开发者工具和调试辅助
 * 仅在开发环境启用
 */

/**
 * 性能日志记录器
 */
export class PerformanceLogger {
  private static timers: Map<string, number> = new Map();
  private static enabled = process.env.NODE_ENV === 'development';

  /**
   * 开始计时
   */
  static start(label: string): void {
    if (!this.enabled) return;
    this.timers.set(label, performance.now());
    console.log(`⏱️ [${label}] Started`);
  }

  /**
   * 结束计时并输出
   */
  static end(label: string): number {
    if (!this.enabled) return 0;

    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`⚠️ No start time found for "${label}"`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);

    const emoji = duration < 100 ? '✅' : duration < 500 ? '⚠️' : '❌';
    console.log(`${emoji} [${label}] Completed in ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * 测量函数执行时间
   */
  static async measure<T>(
    label: string,
    fn: () => T | Promise<T>
  ): Promise<{ result: T; duration: number }> {
    this.start(label);
    const result = await fn();
    const duration = this.end(label);
    return { result, duration };
  }
}

/**
 * 渲染次数追踪器
 */
export function useRenderCount(componentName: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;

  console.log(`🔄 [${componentName}] Render #${renderCountRef.current}`);

  React.useEffect(() => {
    console.log(`✨ [${componentName}] Mounted`);
    return () => {
      console.log(`💀 [${componentName}] Unmounted`);
    };
  }, [componentName]);
}

/**
 * Props 变化追踪器
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  if (process.env.NODE_ENV !== 'development') return;

  const previousProps = React.useRef<Record<string, any>>(props);

  React.useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(`🔍 [${name}] Props changed:`, changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * 组件大小监控器
 */
export function useComponentSize(ref: React.RefObject<HTMLElement>): {
  width: number;
  height: number;
} {
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!ref.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return; // ✅ 添加类型守卫

      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`📏 Component resized: ${entry.contentRect.width}x${entry.contentRect.height}`);
      }
    });

    resizeObserver.observe(ref.current);

    return () => resizeObserver.disconnect();
  }, [ref]);

  return size;
}

/**
 * Bundle 大小分析器
 */
export function analyzeBundleSize(): void {
  if (process.env.NODE_ENV !== 'development') return;

  // 分析已加载的脚本
  const scripts = Array.from(document.scripts);
  const scriptSizes: { src: string; size: number }[] = [];

  scripts.forEach((script) => {
    if (script.src) {
      fetch(script.src, { method: 'HEAD' })
        .then((response) => {
          const size = parseInt(response.headers.get('content-length') || '0', 10);
          scriptSizes.push({ src: script.src, size });
        })
        .catch(() => {
          // 忽略错误
        });
    }
  });

  setTimeout(() => {
    console.table(
      scriptSizes
        .sort((a, b) => b.size - a.size)
        .map((item) => ({
          Script: item.src.split('/').pop(),
          'Size (KB)': (item.size / 1024).toFixed(2),
        }))
    );
  }, 1000);
}

/**
 * API 请求记录器
 */
export class ApiLogger {
  private static requests: Array<{
    url: string;
    method: string;
    duration: number;
    status: number;
    timestamp: Date;
  }> = [];

  static log(url: string, method: string, duration: number, status: number): void {
    if (process.env.NODE_ENV !== 'development') return;

    this.requests.push({
      url,
      method,
      duration,
      status,
      timestamp: new Date(),
    });

    const emoji = status >= 200 && status < 300 ? '✅' : '❌';
    console.log(`${emoji} [API] ${method} ${url} - ${status} (${duration.toFixed(2)}ms)`);

    // 慢请求警告
    if (duration > 1000) {
      console.warn(`⚠️ Slow API request: ${url} took ${duration.toFixed(2)}ms`);
    }
  }

  static getStats(): {
    totalRequests: number;
    averageDuration: number;
    slowRequests: number;
    failedRequests: number;
  } {
    const totalRequests = this.requests.length;
    const averageDuration =
      this.requests.reduce((sum, req) => sum + req.duration, 0) / totalRequests;
    const slowRequests = this.requests.filter((req) => req.duration > 1000).length;
    const failedRequests = this.requests.filter((req) => req.status >= 400).length;

    return {
      totalRequests,
      averageDuration,
      slowRequests,
      failedRequests,
    };
  }

  static printStats(): void {
    console.table(this.getStats());
  }
}

/**
 * 内存泄漏检测器
 */
export class MemoryLeakDetector {
  private static snapshots: number[] = [];
  private static interval: NodeJS.Timeout | null = null;

  static start(intervalMs = 5000): void {
    if (process.env.NODE_ENV !== 'development') return;

    // @ts-ignore
    if (!performance.memory) {
      console.warn('Memory monitoring not supported');
      return;
    }

    this.interval = setInterval(() => {
      // @ts-ignore
      const usedMemory = performance.memory.usedJSHeapSize;
      this.snapshots.push(usedMemory);

      // 只保留最近 10 个快照
      if (this.snapshots.length > 10) {
        this.snapshots.shift();
      }

      // 检测内存泄漏（持续增长）
      if (this.snapshots.length >= 5) {
        const recentSnapshots = this.snapshots.slice(-5);
        const increasing = recentSnapshots.every((val, i, arr) => i === 0 || val > (arr[i - 1] ?? 0));

        if (increasing) {
          const lastSnapshot = recentSnapshots[recentSnapshots.length - 1];
          const firstSnapshot = recentSnapshots[0];
          // ✅ 添加类型守卫
          if (lastSnapshot !== undefined && firstSnapshot !== undefined) {
            const growth = lastSnapshot - firstSnapshot;
            console.warn(
              `⚠️ Potential memory leak detected! Memory increased by ${(growth / 1024 / 1024).toFixed(2)}MB`
            );
          }
        }
      }
    }, intervalMs);
  }

  static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

/**
 * React Hooks 依赖检查器
 */
export function useDependencyChecker(hookName: string, dependencies: any[]): void {
  if (process.env.NODE_ENV !== 'development') return;

  const previousDeps = React.useRef<any[]>(dependencies);

  React.useEffect(() => {
    if (previousDeps.current) {
      dependencies.forEach((dep, index) => {
        if (dep !== previousDeps.current![index]) {
          console.log(`🔍 [${hookName}] Dependency ${index} changed:`, {
            from: previousDeps.current![index],
            to: dep,
          });
        }
      });
    }

    previousDeps.current = dependencies;
  });
}

/**
 * 导出全局调试工具到 window 对象
 */
if (process.env.NODE_ENV === 'development') {
  (window as any).__DEV_TOOLS__ = {
    PerformanceLogger,
    ApiLogger,
    MemoryLeakDetector,
    analyzeBundleSize,
  };

  console.log(
    '%c🔧 开发者工具已启用',
    'background: #222; color: #bada55; font-size: 16px; padding: 4px;'
  );
  console.log('使用 window.__DEV_TOOLS__ 访问调试工具');
}

// 需要导入 React
import React from 'react';
