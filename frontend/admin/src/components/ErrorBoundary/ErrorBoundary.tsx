/**
 * ErrorBoundary - React错误边界组件
 *
 * 捕获子组件树中的JavaScript错误，防止整个应用崩溃
 * 显示友好的错误提示并记录错误信息
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Result, Button } from 'antd';

interface Props {
  /** 子组件 */
  children: ReactNode;

  /** 自定义错误展示组件 */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);

  /** 错误发生时的回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /** 是否在开发环境显示错误详情 */
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误
    console.error('❌ ErrorBoundary捕获到错误:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo);

    // TODO: 发送错误到监控系统 (Sentry, etc.)
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    // }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, showErrorDetails = process.env.NODE_ENV === 'development' } =
      this.props;

    if (!hasError) {
      return children;
    }

    // 使用自定义fallback
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(error!, this.handleReset);
      }
      return fallback;
    }

    // 默认错误展示
    return <DefaultErrorFallback error={error!} onReset={this.handleReset} showDetails={showErrorDetails} />;
  }
}

/**
 * 默认错误展示组件
 */
interface DefaultErrorFallbackProps {
  error: Error;
  onReset: () => void;
  showDetails: boolean;
}

function DefaultErrorFallback({ error, onReset, showDetails }: DefaultErrorFallbackProps) {
  return (
    <div style={{ padding: '40px', minHeight: '400px', display: 'flex', alignItems: 'center' }}>
      <Result
        status="error"
        title="页面出现错误"
        subTitle={showDetails ? error.message : '抱歉，页面遇到了一些问题，请尝试刷新或联系管理员。'}
        extra={[
          <Button type="primary" key="reset" onClick={onReset}>
            重新加载
          </Button>,
          <Button key="home" onClick={() => (window.location.href = '/')}>
            返回首页
          </Button>,
        ]}
      >
        {showDetails && (
          <div style={{ textAlign: 'left', padding: '20px', background: '#f5f5f5', borderRadius: '4px' }}>
            <h4>错误详情（仅开发环境可见）：</h4>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
              {error.stack}
            </pre>
          </div>
        )}
      </Result>
    </div>
  );
}

/**
 * 轻量级错误边界 - 用于小组件
 * 不显示完整的Result页面，而是显示简单的错误信息
 */
interface LightErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

export function LightErrorBoundary({ children, fallbackMessage = '组件加载失败' }: LightErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: '20px', textAlign: 'center', color: '#ff4d4f' }}>
          <p>{fallbackMessage}</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * 页面级错误边界 - 用于路由页面
 */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // 页面级错误记录
        console.error('页面错误:', {
          pathname: window.location.pathname,
          error,
          errorInfo,
        });
      }}
      showErrorDetails={true}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
