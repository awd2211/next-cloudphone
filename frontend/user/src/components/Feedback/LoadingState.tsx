/**
 * 加载状态组件
 *
 * 提供统一的加载状态 UI，支持骨架屏、进度条、空状态等
 */

import { Spin, Skeleton, Empty, Progress, Result, Button } from 'antd';
import { ReactNode, CSSProperties } from 'react';
import { ReloadOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 加载类型
 */
export type LoadingType =
  | 'spinner' // 旋转加载图标
  | 'skeleton' // 骨架屏
  | 'progress' // 进度条
  | 'custom'; // 自定义

/**
 * LoadingState 组件的 Props
 */
export interface LoadingStateProps {
  /** 是否加载中 */
  loading: boolean;

  /** 是否有错误 */
  error?: unknown;

  /** 是否为空数据 */
  empty?: boolean;

  /** 子组件（数据加载成功后显示） */
  children: ReactNode;

  /** 加载类型 */
  loadingType?: LoadingType;

  /** 自定义加载组件 */
  loadingComponent?: ReactNode;

  /** 空状态组件 */
  emptyComponent?: ReactNode;

  /** 空状态描述 */
  emptyDescription?: string;

  /** 错误组件 */
  errorComponent?: ReactNode;

  /** 错误描述 */
  errorDescription?: string;

  /** 重试回调 */
  onRetry?: () => void;

  /** 骨架屏行数 */
  skeletonRows?: number;

  /** 骨架屏是否显示头像 */
  skeletonAvatar?: boolean;

  /** 进度百分比（0-100） */
  progress?: number;

  /** 容器样式 */
  style?: CSSProperties;

  /** 容器类名 */
  className?: string;
}

/**
 * 加载状态组件
 *
 * 统一管理加载、错误、空状态的显示
 *
 * 特性：
 * - 支持多种加载样式（spinner、骨架屏、进度条）
 * - 自动处理错误状态
 * - 自动处理空状态
 * - 支持重试功能
 *
 * 使用示例：
 * ```tsx
 * // 基本使用
 * <LoadingState loading={isLoading} empty={data.length === 0}>
 *   <DataTable data={data} />
 * </LoadingState>
 *
 * // 使用骨架屏
 * <LoadingState loading={isLoading} loadingType="skeleton" skeletonRows={5}>
 *   <UserList users={users} />
 * </LoadingState>
 *
 * // 处理错误状态
 * <LoadingState
 *   loading={isLoading}
 *   error={error}
 *   onRetry={refetch}
 *   errorDescription="加载设备列表失败"
 * >
 *   <DeviceList devices={devices} />
 * </LoadingState>
 *
 * // 使用进度条
 * <LoadingState
 *   loading={isUploading}
 *   loadingType="progress"
 *   progress={uploadProgress}
 * >
 *   <FileList files={files} />
 * </LoadingState>
 * ```
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  error,
  empty = false,
  children,
  loadingType = 'spinner',
  loadingComponent,
  emptyComponent,
  emptyDescription = '暂无数据',
  errorComponent,
  errorDescription,
  onRetry,
  skeletonRows = 3,
  skeletonAvatar = false,
  progress = 0,
  style,
  className,
}) => {
  // 容器样式
  const containerStyle: CSSProperties = {
    minHeight: loading || error || empty ? '200px' : 'auto',
    ...style,
  };

  // 渲染函数：返回带动画的内容
  const renderContent = () => {
    // 错误状态
    if (error) {
      if (errorComponent) {
        return (
          <motion.div
            key="error-custom"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={containerStyle}
            className={className}
          >
            {errorComponent}
          </motion.div>
        );
      }

      return (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={containerStyle}
          className={className}
        >
          <Result
            status="error"
            title="加载失败"
            subTitle={
              errorDescription ||
              (error instanceof Error ? error.message : '数据加载失败，请稍后重试')
            }
            extra={
              onRetry && (
                <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
                  重试
                </Button>
              )
            }
          />
        </motion.div>
      );
    }

    // 加载状态
    if (loading) {
      if (loadingComponent) {
        return (
          <motion.div
            key="loading-custom"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={containerStyle}
            className={className}
          >
            {loadingComponent}
          </motion.div>
        );
      }

      if (loadingType === 'skeleton') {
        return (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: '24px', ...containerStyle }}
            className={className}
          >
            <Skeleton active avatar={skeletonAvatar} paragraph={{ rows: skeletonRows }} />
          </motion.div>
        );
      }

      if (loadingType === 'progress') {
        return (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              ...containerStyle,
            }}
            className={className}
          >
            <Progress
              type="circle"
              percent={progress}
              style={{ marginBottom: '16px' }}
            />
            <div style={{ color: '#666' }}>加载中...</div>
          </motion.div>
        );
      }

      // 默认：spinner
      return (
        <motion.div
          key="spinner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...containerStyle,
          }}
          className={className}
        >
          <Spin size="large" tip="加载中..." />
        </motion.div>
      );
    }

    // 空状态
    if (empty) {
      if (emptyComponent) {
        return (
          <motion.div
            key="empty-custom"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={containerStyle}
            className={className}
          >
            {emptyComponent}
          </motion.div>
        );
      }

      return (
        <motion.div
          key="empty"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={containerStyle}
          className={className}
        >
          <Empty
            description={emptyDescription}
            style={{ padding: '48px 24px' }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </motion.div>
      );
    }

    // 正常显示数据
    return (
      <motion.div
        key="content"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={style}
        className={className}
      >
        {children}
      </motion.div>
    );
  };

  // 使用 AnimatePresence 包裹，实现进入/退出动画
  return (
    <AnimatePresence mode="wait">
      {renderContent()}
    </AnimatePresence>
  );
};

export { LoadingState };
export default LoadingState;
