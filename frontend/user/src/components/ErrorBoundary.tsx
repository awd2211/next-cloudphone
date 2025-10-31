import React, { Component, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI
 */
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
    // 更新 state 以便下一次渲染显示降级 UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到日志服务
    this.logErrorToService(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  /**
   * 将错误记录到日志服务
   */
  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    const errorLog = {
      type: 'react_error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: localStorage.getItem('userId'),
    };

    // 发送错误日志到后端
    console.error('ErrorBoundary caught an error:', errorLog);

    // 可以在这里调用 API 将错误发送到服务器
    // 例如: fetch('/api/logs/errors', { method: 'POST', body: JSON.stringify(errorLog) })

    // 或者发送到第三方监控服务 (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(errorLog);
    }
  }

  /**
   * 发送错误到监控服务
   */
  private sendToMonitoringService(errorLog: any) {
    // 示例：使用 fetch 发送到后端日志接口
    try {
      fetch(`${import.meta.env.VITE_API_BASE_URL}/logs/frontend-errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(errorLog),
      }).catch((err) => {
        // 静默失败，避免二次错误
        console.warn('Failed to send error log:', err);
      });
    } catch (err) {
      // 静默失败
      console.warn('Error in sendToMonitoringService:', err);
    }
  }

  /**
   * 重置错误状态
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * 刷新页面
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 如果提供了自定义降级 UI，使用它
      if (fallback) {
        return fallback;
      }

      // 默认降级 UI
      return (
        <div
          style={{
            padding: '50px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f0f2f5',
          }}
        >
          <Result
            status="error"
            title="页面出错了"
            subTitle="抱歉，页面遇到了一些问题。您可以尝试刷新页面或返回首页。"
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
              <Button key="reset" onClick={this.handleReset}>
                返回首页
              </Button>,
              <Button key="home" onClick={() => (window.location.href = '/')}>
                回到首页
              </Button>,
            ]}
          >
            {/* 开发环境下显示详细错误信息 */}
            {process.env.NODE_ENV === 'development' && error && (
              <div
                style={{
                  textAlign: 'left',
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '4px',
                  marginTop: '20px',
                  maxWidth: '800px',
                  overflow: 'auto',
                }}
              >
                <h3 style={{ color: '#ff4d4f' }}>错误详情（仅开发环境可见）：</h3>
                <p>
                  <strong>错误消息：</strong>
                </p>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '4px',
                    overflow: 'auto',
                  }}
                >
                  {error.toString()}
                </pre>

                <p>
                  <strong>错误堆栈：</strong>
                </p>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '300px',
                  }}
                >
                  {error.stack}
                </pre>

                {errorInfo && (
                  <>
                    <p>
                      <strong>组件堆栈：</strong>
                    </p>
                    <pre
                      style={{
                        background: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        overflow: 'auto',
                        maxHeight: '200px',
                      }}
                    >
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}
          </Result>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
