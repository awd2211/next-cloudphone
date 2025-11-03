/**
 * 增强的错误提示组件
 * 提供更友好和详细的错误信息
 */

import { Alert, Button, Space, Typography, Collapse } from 'antd';
import { ReloadOutlined, BugOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

export interface ErrorDetail {
  code?: string;
  message: string;
  details?: string;
  stack?: string;
  timestamp?: string;
  requestId?: string;
}

interface ErrorAlertProps {
  error: Error | ErrorDetail | string;
  onRetry?: () => void;
  onReport?: () => void;
  showDetails?: boolean;
  type?: 'error' | 'warning';
}

/**
 * 解析错误对象，提取有用信息
 */
function parseError(error: Error | ErrorDetail | string): ErrorDetail {
  if (typeof error === 'string') {
    return { message: error };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
  }

  return error;
}

/**
 * 根据错误代码获取用户友好的建议
 */
function getErrorSuggestion(code?: string): string | null {
  const suggestions: Record<string, string> = {
    NETWORK_ERROR: '请检查您的网络连接，然后重试',
    TIMEOUT: '请求超时，请检查网络或稍后重试',
    UNAUTHORIZED: '登录已过期，请重新登录',
    FORBIDDEN: '您没有权限执行此操作，请联系管理员',
    NOT_FOUND: '请求的资源不存在，请刷新页面后重试',
    VALIDATION_ERROR: '请检查输入的数据是否正确',
    SERVER_ERROR: '服务器遇到问题，请稍后重试',
    QUOTA_EXCEEDED: '配额已用完，请升级套餐或联系管理员',
  };

  return code ? suggestions[code] || null : null;
}

/**
 * 错误提示组件
 */
export function ErrorAlert({
  error,
  onRetry,
  onReport,
  showDetails = false,
  type = 'error',
}: ErrorAlertProps) {
  const errorDetail = parseError(error);
  const suggestion = getErrorSuggestion(errorDetail.code);

  return (
    <Alert
      type={type}
      showIcon
      message={
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 错误标题 */}
          <Text strong>{errorDetail.code ? `错误 [${errorDetail.code}]` : '操作失败'}</Text>

          {/* 错误消息 */}
          <Paragraph style={{ marginBottom: 0 }}>{errorDetail.message}</Paragraph>

          {/* 建议 */}
          {suggestion && (
            <Alert
              type="info"
              message="建议"
              description={suggestion}
              showIcon
              style={{ marginTop: 8 }}
            />
          )}

          {/* 操作按钮 */}
          <Space style={{ marginTop: 8 }}>
            {onRetry && (
              <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry} size="small">
                重试
              </Button>
            )}
            {onReport && (
              <Button icon={<BugOutlined />} onClick={onReport} size="small">
                报告问题
              </Button>
            )}
          </Space>

          {/* 详细信息（可折叠） */}
          {showDetails && (errorDetail.details || errorDetail.stack || errorDetail.requestId) && (
            <Collapse ghost style={{ marginTop: 8 }}>
              <Panel header="查看详细信息" key="details">
                <Space direction="vertical" style={{ width: '100%' }}>
                  {errorDetail.requestId && <Text code>请求 ID: {errorDetail.requestId}</Text>}
                  {errorDetail.timestamp && (
                    <Text type="secondary">
                      时间: {new Date(errorDetail.timestamp).toLocaleString('zh-CN')}
                    </Text>
                  )}
                  {errorDetail.details && (
                    <>
                      <Text strong>详细信息:</Text>
                      <Paragraph>
                        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                          {errorDetail.details}
                        </pre>
                      </Paragraph>
                    </>
                  )}
                  {errorDetail.stack && (
                    <>
                      <Text strong>堆栈跟踪:</Text>
                      <Paragraph>
                        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                          {errorDetail.stack}
                        </pre>
                      </Paragraph>
                    </>
                  )}
                </Space>
              </Panel>
            </Collapse>
          )}
        </Space>
      }
    />
  );
}

/**
 * 简化版错误提示（用于内联显示）
 */
export function InlineError({ message }: { message: string }) {
  return <Alert type="error" message={message} showIcon closable style={{ marginBottom: 16 }} />;
}

/**
 * 成功提示组件
 */
export function SuccessAlert({ message, description }: { message: string; description?: string }) {
  return (
    <Alert
      type="success"
      message={message}
      description={description}
      showIcon
      closable
      style={{ marginBottom: 16 }}
    />
  );
}

/**
 * 警告提示组件
 */
export function WarningAlert({ message, description }: { message: string; description?: string }) {
  return (
    <Alert
      type="warning"
      message={message}
      description={description}
      showIcon
      closable
      style={{ marginBottom: 16 }}
    />
  );
}
