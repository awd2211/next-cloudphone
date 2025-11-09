/**
 * 渐进式加载图片组件
 *
 * 先显示模糊的低分辨率图,再加载高清图,提供更好的用户体验
 */

import { useState, useEffect, memo, CSSProperties } from 'react';
import { LazyImage } from './LazyImage';

export interface ProgressiveImageProps {
  /** 高清图片地址 */
  src: string;

  /** 低分辨率占位图地址 (可选) */
  placeholderSrc?: string;

  /** 图片 alt 文本 */
  alt?: string;

  /** 图片样式 */
  style?: CSSProperties;

  /** 图片类名 */
  className?: string;

  /** 根元素的 margin */
  rootMargin?: string;

  /** 加载完成回调 */
  onLoad?: () => void;

  /** 加载失败回调 */
  onError?: () => void;
}

/**
 * 渐进式加载图片组件
 *
 * @example
 * ```tsx
 * <ProgressiveImage
 *   src="https://example.com/image-full.jpg"
 *   placeholderSrc="https://example.com/image-thumb.jpg"
 *   alt="示例图片"
 *   style={{ width: 400, height: 300 }}
 * />
 * ```
 */
export const ProgressiveImage = memo<ProgressiveImageProps>(
  ({ src, placeholderSrc, alt, style, className, rootMargin, onLoad, onError }) => {
    const [imageSrc, setImageSrc] = useState(placeholderSrc || src);
    const [isHighResLoaded, setIsHighResLoaded] = useState(false);

    useEffect(() => {
      // 如果有低分辨率占位图,先显示它
      if (placeholderSrc) {
        setImageSrc(placeholderSrc);
        setIsHighResLoaded(false);

        // 在后台加载高清图
        const img = new Image();
        img.src = src;
        img.onload = () => {
          setImageSrc(src);
          setIsHighResLoaded(true);
          onLoad?.();
        };
        img.onerror = () => {
          onError?.();
        };
      } else {
        setImageSrc(src);
      }
    }, [src, placeholderSrc, onLoad, onError]);

    return (
      <LazyImage
        src={imageSrc}
        alt={alt}
        style={style}
        className={className}
        rootMargin={rootMargin}
        fadeIn={isHighResLoaded}
        fadeInDuration={500}
        onLoad={onLoad}
        onError={onError}
      />
    );
  }
);

ProgressiveImage.displayName = 'ProgressiveImage';
