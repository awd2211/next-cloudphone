/**
 * 优化的通用组件库
 * 包含常用的性能优化组件
 */

import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// ==================== 优化的列表组件 ====================

interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}

/**
 * 优化的列表组件
 * 使用 memo 和 key 优化渲染性能
 */
export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  loading,
  emptyText = '暂无数据',
  className,
}: OptimizedListProps<T>) {
  if (loading) {
    return <div className={className}>加载中...</div>;
  }

  if (items.length === 0) {
    return <div className={className}>{emptyText}</div>;
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}

// ==================== 懒加载图片组件 ====================

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * 懒加载图片组件
 * 使用 Intersection Observer API 实现
 */
export const LazyImage = memo(({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3C/svg%3E',
  threshold = 0.1,
  onLoad,
  onError,
  ...props
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, threshold]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setImageSrc(placeholder);
    onError?.();
  }, [placeholder, onError]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        opacity: isLoaded ? 1 : 0.5,
        transition: 'opacity 0.3s',
      }}
      {...props}
    />
  );
});

LazyImage.displayName = 'LazyImage';

// ==================== 防抖输入框组件 ====================

interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}

/**
 * 防抖输入框组件
 * 延迟触发 onChange 事件
 */
export const DebouncedInput = memo(({
  value: externalValue,
  onChange: externalOnChange,
  delay = 500,
  ...props
}: DebouncedInputProps) => {
  const [internalValue, setInternalValue] = useState(externalValue);

  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== externalValue) {
        externalOnChange(internalValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [internalValue, externalValue, externalOnChange, delay]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
  }, []);

  return <input value={internalValue} onChange={handleChange} {...props} />;
});

DebouncedInput.displayName = 'DebouncedInput';

// ==================== 条件渲染组件 ====================

interface ConditionalRenderProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 条件渲染组件
 * 使用 memo 避免不必要的渲染
 */
export const ConditionalRender = memo(({
  condition,
  children,
  fallback = null,
}: ConditionalRenderProps) => {
  return <>{condition ? children : fallback}</>;
});

ConditionalRender.displayName = 'ConditionalRender';

// ==================== 节流滚动容器 ====================

interface ThrottledScrollContainerProps {
  children: ReactNode;
  onScroll: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  throttleDelay?: number;
  className?: string;
}

/**
 * 节流滚动容器
 * 限制滚动事件触发频率
 */
export const ThrottledScrollContainer = memo(({
  children,
  onScroll,
  throttleDelay = 200,
  className,
}: ThrottledScrollContainerProps) => {
  const lastCallRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const now = Date.now();
    if (now - lastCallRef.current >= throttleDelay) {
      lastCallRef.current = now;

      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        onScroll(scrollTop, scrollHeight, clientHeight);
      }
    }
  }, [onScroll, throttleDelay]);

  return (
    <div ref={containerRef} onScroll={handleScroll} className={className}>
      {children}
    </div>
  );
});

ThrottledScrollContainer.displayName = 'ThrottledScrollContainer';

// ==================== 无限滚动组件 ====================

interface InfiniteScrollProps {
  children: ReactNode;
  hasMore: boolean;
  loadMore: () => void;
  loading?: boolean;
  threshold?: number;
  loader?: ReactNode;
  endMessage?: ReactNode;
}

/**
 * 无限滚动组件
 * 滚动到底部自动加载更多
 */
export const InfiniteScroll = memo(({
  children,
  hasMore,
  loadMore,
  loading = false,
  threshold = 100,
  loader = <div>加载中...</div>,
  endMessage = <div>没有更多了</div>,
}: InfiniteScrollProps) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadMore]);

  return (
    <div>
      {children}
      {loading && loader}
      {!loading && hasMore && <div ref={observerTarget} style={{ height: threshold }} />}
      {!hasMore && endMessage}
    </div>
  );
});

InfiniteScroll.displayName = 'InfiniteScroll';

// ==================== 延迟渲染组件 ====================

interface DelayedRenderProps {
  children: ReactNode;
  delay?: number;
  placeholder?: ReactNode;
}

/**
 * 延迟渲染组件
 * 延迟一段时间后才渲染子组件
 */
export const DelayedRender = memo(({
  children,
  delay = 1000,
  placeholder = null,
}: DelayedRenderProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return <>{show ? children : placeholder}</>;
});

DelayedRender.displayName = 'DelayedRender';

// ==================== 可见性切换组件 ====================

interface VisibilityToggleProps {
  children: ReactNode;
  visible: boolean;
  unmountOnHide?: boolean;
  animationDuration?: number;
}

/**
 * 可见性切换组件
 * 带动画的显示/隐藏
 */
export const VisibilityToggle = memo(({
  children,
  visible,
  unmountOnHide = false,
  animationDuration = 300,
}: VisibilityToggleProps) => {
  const [shouldRender, setShouldRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
    } else if (!unmountOnHide) {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, animationDuration);
      return () => clearTimeout(timer);
    }
  }, [visible, unmountOnHide, animationDuration]);

  if (!shouldRender && unmountOnHide) {
    return null;
  }

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${animationDuration}ms`,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {children}
    </div>
  );
});

VisibilityToggle.displayName = 'VisibilityToggle';

// ==================== 批量选择组件 ====================

interface BatchSelectProps<T> {
  items: T[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  keyExtractor: (item: T) => string;
  renderItem: (item: T, selected: boolean, onToggle: () => void) => ReactNode;
  renderBatchActions?: (selectedCount: number, clearSelection: () => void) => ReactNode;
}

/**
 * 批量选择组件
 * 支持全选、反选等操作
 */
export function BatchSelect<T>({
  items,
  selectedIds,
  onSelectionChange,
  keyExtractor,
  renderItem,
  renderBatchActions,
}: BatchSelectProps<T>) {
  const toggleItem = useCallback(
    (id: string) => {
      const newSelection = selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id];
      onSelectionChange(newSelection);
    },
    [selectedIds, onSelectionChange]
  );

  const toggleAll = useCallback(() => {
    if (selectedIds.length === items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(keyExtractor));
    }
  }, [items, selectedIds, keyExtractor, onSelectionChange]);

  const clearSelection = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  return (
    <div>
      {renderBatchActions && selectedIds.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {renderBatchActions(selectedIds.length, clearSelection)}
        </div>
      )}

      <div>
        <label>
          <input
            type="checkbox"
            checked={selectedIds.length === items.length && items.length > 0}
            onChange={toggleAll}
          />
          全选
        </label>
      </div>

      {items.map((item) => {
        const id = keyExtractor(item);
        const selected = selectedIds.includes(id);
        return (
          <div key={id}>
            {renderItem(item, selected, () => toggleItem(id))}
          </div>
        );
      })}
    </div>
  );
}
