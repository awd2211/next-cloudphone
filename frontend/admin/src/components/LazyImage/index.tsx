import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Spin } from 'antd';

interface LazyImageProps {
  src: string;
  width?: number;
  height?: number;
  alt?: string;
  placeholder?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  width,
  height,
  alt = '',
  placeholder,
  className,
  style,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!src) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    // Intersection Observer 懒加载
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 图片进入视口,开始加载
            const img = new Image();
            img.src = src;

            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
            };

            img.onerror = () => {
              setIsError(true);
              setIsLoading(false);
            };

            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // 提前 100px 开始加载
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const containerStyle: React.CSSProperties = {
    width,
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    overflow: 'hidden',
    ...style,
  };

  if (isError) {
    return (
      <div ref={imgRef} style={containerStyle} className={className}>
        {placeholder || <div style={{ fontSize: '12px', color: '#999' }}>加载失败</div>}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div ref={imgRef} style={containerStyle} className={className}>
        {placeholder || <Spin size="small" />}
      </div>
    );
  }

  return (
    <div ref={imgRef} style={containerStyle} className={className}>
      <img
        src={imageSrc || ''}
        alt={alt}
        width={width}
        height={height}
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};

export default LazyImage;
