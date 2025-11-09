/**
 * 错误边界组件
 *
 * 捕获组件树中的 JavaScript 错误，显示友好的错误界面
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Result, Typography, Collapse } from 'antd';
import { ReloadOutlined, HomeOutlined, BugOutlined } from '@ant-design/icons';
import { handleError, normalizeError, type AppError } from '@/utils/errorHandling';

const { Paragraph, Text } = Typography;
const { Panel } = Collapse;

interface Props {
  /** 子组件 */
  children: ReactNode;

  /** 错误时的后备 UI（可选） */
  fallback?: (error: AppError, reset: () => void) => ReactNode;

  /** 错误回调 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /** 是否显示错误详情（开发模式默认显示） */
  showDetails?: boolean;

  /** 边界名称（用于日志） */
  boundaryName?: string;
}

interface State {
  /** 是否有错误 */
  hasError: boolean;

  /** 错误对象 */
  error: AppError | null;

  /** 错误信息 */
  errorInfo: ErrorInfo | null;

  /** 错误发生时间 */
  errorTime: Date | null;
}

/**
 * 错误边界组件
 *
 * 特性：
 * - 捕获组件树中的 JS 错误
 * - 显示友好的错误界面
 * - 提供重试和返回首页功能
 * - 开发模式显示详细错误信息
 * - 自动上报错误到监控系统
 *
 * 使用示例：
 * ```tsx
 * <ErrorBoundary boundaryName="DeviceList">
 *   <DeviceList />
 * </ErrorBoundary>
 *
 * // 自定义后备 UI
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <h1>出错了</h1>
 *       <p>{error.message}</p>
 *       <button onClick={reset}>重试</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error: normalizeError(error),
      errorTime: new Date(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, boundaryName = 'ErrorBoundary' } = this.props;

    // 记录错误信息
    console.error(`[${boundaryName}] 捕获到错误:`, error, errorInfo);

    // 更新错误信息
    this.setState({
      errorInfo,
    });

    // 处理错误（上报、通知等）
    handleError(error, {
      showMessage: false, // 不显示消息，由错误边界 UI 展示
      log: true,
      report: true,
    });

    // 执行错误回调
    if (onError) {
      onError(error, errorInfo);
    }
  }

  /**
   * 重置错误状态
   */
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null,
    });
  };

  /**
   * 返回首页
   */
  goHome = () => {
    window.location.href = '/';
  };

  /**
   * 重新加载页面
   */
  reloadPage = () => {
    window.location.reload();
  };

  render(): ReactNode {
    const { children, fallback, showDetails = import.meta.env.DEV, boundaryName } =
      this.props;
    const { hasError, error, errorInfo, errorTime } = this.state;

    // 没有错误，正常渲染子组件
    if (!hasError || !error) {
      return children;
    }

    // 使用自定义后备 UI
    if (fallback) {
      return fallback(error, this.resetError);
    }

    // 默认错误 UI
    return (
      <div style={{ padding: '48px 24px', minHeight: '400px' }}>
        <Result
          status="error"
          title="页面加载失败"
          subTitle={
            <div>
              <Paragraph>
                <Text strong>{error.message}</Text>
              </Paragraph>
              {error.retryable && (
                <Paragraph type="secondary">
                  这可能是暂时的网络问题，您可以尝试重新加载页面。
                </Paragraph>
              )}
            </div>
          }
          extra={[
            <Button
              type="primary"
              key="retry"
              icon={<ReloadOutlined />}
              onClick={this.resetError}
            >
              重试
            </Button>,
            <Button key="home" icon={<HomeOutlined />} onClick={this.goHome}>
              返回首页
            </Button>,
            error.retryable && (
              <Button key="reload" onClick={this.reloadPage}>
                重新加载页面
              </Button>
            ),
          ]}
        >
          {/* 开发模式显示详细错误信息 */}
          {showDetails && errorInfo && (
            <div style={{ marginTop: 24, textAlign: 'left' }}>
              <Collapse
                items={[
                  {
                    key: 'details',
                    label: (
                      <Text>
                        <BugOutlined /> 错误详情（仅开发模式显示）
                      </Text>
                    ),
                    children: (
                      <div>
                        <Paragraph>
                          <Text strong>错误边界:</Text> {boundaryName}
                        </Paragraph>
                        <Paragraph>
                          <Text strong>错误类型:</Text> {error.type}
                        </Paragraph>
                        {error.code && (
                          <Paragraph>
                            <Text strong>错误代码:</Text> {error.code}
                          </Paragraph>
                        )}
                        {errorTime && (
                          <Paragraph>
                            <Text strong>发生时间:</Text> {errorTime.toLocaleString()}
                          </Paragraph>
                        )}
                        <Paragraph>
                          <Text strong>组件堆栈:</Text>
                          <pre
                            style={{
                              background: '#f5f5f5',
                              padding: '12px',
                              borderRadius: '4px',
                              overflow: 'auto',
                              maxHeight: '300px',
                            }}
                          >
                            {errorInfo.componentStack}
                          </pre>
                        </Paragraph>
                        {error.details && (
                          <Paragraph>
                            <Text strong>详细信息:</Text>
                            <pre
                              style={{
                                background: '#f5f5f5',
                                padding: '12px',
                                borderRadius: '4px',
                                overflow: 'auto',
                                maxHeight: '200px',
                              }}
                            >
                              {JSON.stringify(error.details, null, 2)}
                            </pre>
                          </Paragraph>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Result>
      </div>
    );
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
