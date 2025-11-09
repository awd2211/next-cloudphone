/**
 * 懒加载图片组件
 *
 * 使用 IntersectionObserver API 实现图片懒加载
 * 只有当图片进入视口时才开始加载,大幅提升页面性能
 */

import { useState, useEffect, useRef, memo, CSSProperties } from 'react';
import { Skeleton } from 'antd';
import { PictureOutlined } from '@ant-design/icons';

export interface LazyImageProps {
  /** 图片地址 */
  src: string;

  /** 图片 alt 文本 */
  alt?: string;

  /** 图片样式 */
  style?: CSSProperties;

  /** 图片类名 */
  className?: string;

  /** 占位符图片 (在加载前显示) */
  placeholder?: string;

  /** 错误时的占位符 */
  errorPlaceholder?: React.ReactNode;

  /** 加载时的占位符 */
  loadingPlaceholder?: React.ReactNode;

  /** 根元素的 margin,用于提前加载 (默认 '50px') */
  rootMargin?: string;

  /** 是否使用淡入动画 (默认 true) */
  fadeIn?: boolean;

  /** 淡入动画持续时间 (ms, 默认 300) */
  fadeInDuration?: number;

  /** 加载完成回调 */
  onLoad?: () => void;

  /** 加载失败回调 */
  onError?: () => void;
}

/**
 * 懒加载图片组件
 *
 * @example
 * ```tsx
 * <LazyImage
 *   src="https://example.com/image.jpg"
 *   alt="示例图片"
 *   style={{ width: 200, height: 200, objectFit: 'cover' }}
 *   rootMargin="100px"
 * />
 * ```
 */
export const LazyImage = memo<LazyImageProps>(
  ({
    src,
    alt = '',
    style,
    className,
    placeholder,
    errorPlaceholder,
    loadingPlaceholder,
    rootMargin = '50px',
    fadeIn = true,
    fadeInDuration = 300,
    onLoad,
    onError,
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // IntersectionObserver 监听图片是否进入视口
    useEffect(() => {
      const currentContainer = containerRef.current;
      if (!currentContainer) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              // 已经进入视口,可以停止观察
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin,
          threshold: 0.01, // 1% 可见即触发
        }
      );

      observer.observe(currentContainer);

      return () => {
        if (currentContainer) {
          observer.unobserve(currentContainer);
        }
      };
    }, [rootMargin]);

    // 当图片进入视口时开始加载
    useEffect(() => {
      if (!isInView || !imgRef.current) return;

      const img = imgRef.current;

      const handleLoad = () => {
        setIsLoading(false);
        onLoad?.();
      };

      const handleError = () => {
        setIsLoading(false);
        setIsError(true);
        onError?.();
      };

      // 如果图片已经加载完成 (缓存命中)
      if (img.complete) {
        handleLoad();
      } else {
        img.addEventListener('load', handleLoad);
        img.addEventListener('error', handleError);
      }

      return () => {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };
    }, [isInView, onLoad, onError]);

    // 默认加载占位符
    const defaultLoadingPlaceholder = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          ...style,
        }}
      >
        <Skeleton.Image active style={{ width: '100%', height: '100%' }} />
      </div>
    );

    // 默认错误占位符
    const defaultErrorPlaceholder = (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#999',
          fontSize: 32,
          ...style,
        }}
      >
        <PictureOutlined />
      </div>
    );

    // 错误状态
    if (isError) {
      return <>{errorPlaceholder || defaultErrorPlaceholder}</>;
    }

    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          overflow: 'hidden',
          ...style,
        }}
        className={className}
      >
        {/* 加载占位符 */}
        {isLoading && (loadingPlaceholder || defaultLoadingPlaceholder)}

        {/* 实际图片 */}
        {isInView && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isLoading ? 0 : 1,
              transition: fadeIn ? `opacity ${fadeInDuration}ms ease-in-out` : 'none',
              ...style,
            }}
            className={className}
          />
        )}

        {/* 占位符图片 (可选) */}
        {!isInView && placeholder && (
          <img
            src={placeholder}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(10px)',
              ...style,
            }}
            className={className}
          />
        )}
      </div>
    );
  }
);

LazyImage.displayName = 'LazyImage';
