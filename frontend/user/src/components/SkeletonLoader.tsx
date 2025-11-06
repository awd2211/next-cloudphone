import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Skeleton 基础组件
 * 显示加载占位符，提升用户体验
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style = {},
  className = '',
}) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    >
      <style>
        {`
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}
      </style>
    </div>
  );
};

/**
 * 卡片 Skeleton
 */
export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          style={{
            padding: 24,
            background: 'white',
            borderRadius: 12,
            marginBottom: 16,
          }}
        >
          <Skeleton width="60%" height={24} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="80%" height={16} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton width={80} height={32} borderRadius={8} />
            <Skeleton width={80} height={32} borderRadius={8} />
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * 列表 Skeleton
 */
export const SkeletonList: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Skeleton width={48} height={48} borderRadius="50%" style={{ marginRight: 16 }} />
          <div style={{ flex: 1 }}>
            <Skeleton width="40%" height={18} style={{ marginBottom: 8 }} />
            <Skeleton width="60%" height={14} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 表格 Skeleton
 */
export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div>
      {/* 表头 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 16,
          padding: '16px 0',
          borderBottom: '2px solid #e0e0e0',
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} width="70%" height={16} />
        ))}
      </div>

      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 16,
            padding: '16px 0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width="90%" height={14} />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * 文本块 Skeleton
 */
export const SkeletonText: React.FC<{ lines?: number; lineHeight?: number }> = ({
  lines = 3,
  lineHeight = 20,
}) => {
  return (
    <div>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '70%' : '100%'}
          height={lineHeight}
          style={{ marginBottom: 12 }}
        />
      ))}
    </div>
  );
};

/**
 * 图片 Skeleton
 */
export const SkeletonImage: React.FC<{
  width?: string | number;
  height?: string | number;
  aspectRatio?: string;
}> = ({ width = '100%', height = 200, aspectRatio }) => {
  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius={8}
      style={{
        aspectRatio: aspectRatio,
      }}
    />
  );
};

/**
 * 头像 Skeleton
 */
export const SkeletonAvatar: React.FC<{
  size?: number;
  shape?: 'circle' | 'square';
}> = ({ size = 48, shape = 'circle' }) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={shape === 'circle' ? '50%' : 8}
    />
  );
};

/**
 * 按钮 Skeleton
 */
export const SkeletonButton: React.FC<{
  width?: string | number;
  height?: number;
}> = ({ width = 120, height = 40 }) => {
  return <Skeleton width={width} height={height} borderRadius={10} />;
};
