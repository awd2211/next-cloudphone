import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * 图片懒加载组件
 * 使用 Intersection Observer API 实现视口检测
 * 支持 blur placeholder 效果
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  style = {},
  width,
  height,
  objectFit = 'cover',
}) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 提前 50px 开始加载
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isInView) return;

    // 创建新的 Image 对象预加载图片
    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setTimeout(() => setIsLoaded(true), 50); // 延迟设置，确保平滑过渡
    };

    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setIsLoaded(true); // 即使失败也移除 blur
    };
  }, [isInView, src]);

  return (
    <div
      style={{
        position: 'relative',
        width: width || '100%',
        height: height || 'auto',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
    >
      <img
        ref={imgRef}
        src={imageSrc || placeholder}
        alt={alt}
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          transition: 'filter 0.3s ease, opacity 0.3s ease',
          filter: isLoaded ? 'none' : 'blur(10px)',
          opacity: isLoaded ? 1 : 0.6,
        }}
      />

      {/* 加载状态指示器 */}
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 40,
            height: 40,
            border: '3px solid rgba(99, 102, 241, 0.1)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}

      <style>
        {`
          @keyframes spin {
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
};

export default LazyImage;
