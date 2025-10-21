import React from 'react';
import { LazyLoadImage, LazyLoadImageProps } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import 'react-lazy-load-image-component/src/effects/opacity.css';

/**
 * 懒加载图片组件
 *
 * 特性:
 * - 只在图片进入视口时才加载
 * - 支持占位符和加载动画
 * - 支持多种过渡效果 (blur, opacity)
 * - 减少初始加载时间
 */

interface LazyImageComponentProps extends Omit<LazyLoadImageProps, 'effect'> {
  src: string;
  alt: string;
  effect?: 'blur' | 'opacity' | 'black-and-white';
  placeholderSrc?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

const LazyImage: React.FC<LazyImageComponentProps> = ({
  src,
  alt,
  effect = 'blur',
  placeholderSrc,
  width,
  height,
  className,
  ...props
}) => {
  return (
    <LazyLoadImage
      src={src}
      alt={alt}
      effect={effect}
      placeholderSrc={placeholderSrc}
      width={width}
      height={height}
      className={className}
      threshold={100} // 距离视口 100px 时开始加载
      {...props}
    />
  );
};

export default LazyImage;
