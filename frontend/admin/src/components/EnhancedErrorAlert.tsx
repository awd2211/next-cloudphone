import React from 'react';
import { Alert, Button, Space, Typography, Collapse, Tag } from 'antd';
import {
  ReloadOutlined,
  QuestionCircleOutlined,
  CustomerServiceOutlined,
  LinkOutlined,
} from '@ant-design/icons';

const { Text, Link } = Typography;
const { Panel } = Collapse;

/**
 * 恢复建议
 */
export interface RecoverySuggestion {
  action: string;
  description: string;
  actionUrl?: string;
}

/**
 * 增强的错误信息
 */
export interface EnhancedError {
  message: string;
  userMessage?: string;
  technicalMessage?: string;
  code?: string;
  requestId?: string;
  recoverySuggestions?: RecoverySuggestion[];
  documentationUrl?: string;
  supportUrl?: string;
  retryable?: boolean;
  details?: any;
}

export interface EnhancedErrorAlertProps {
  /** 错误对象 */
  error: EnhancedError | Error | string | null;
  /** 是否显示 */
  visible?: boolean;
  /** 错误标题 */
  title?: string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 是否显示恢复建议（默认true） */
  showRecoverySuggestions?: boolean;
  /** 是否显示Request ID（默认true） */
  showRequestId?: boolean;
  /** 是否显示技术详情（默认true） */
  showTechnicalDetails?: boolean;
  /** 是否显示文档链接（默认true） */
  showDocumentation?: boolean;
  /** 额外的CSS类名 */
  className?: string;
  /** Alert类型（默认error） */
  type?: 'error' | 'warning' | 'info';
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 解析错误对象
 */
function parseError(error: EnhancedError | Error | string | null): EnhancedError | null {
  if (!error) return null;

  if (typeof error === 'string') {
    return {
      message: error,
      userMessage: error,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      userMessage: error.message,
      technicalMessage: error.message,
    };
  }

  return error;
}

/**
 * 增强的错误提示组件
 *
 * 功能：
 * 1. 显示用户友好的错误消息
 * 2. 显示恢复建议（带跳转链接）
 * 3. 显示Request ID（方便技术支持）
 * 4. 显示技术详情（可折叠）
 * 5. 显示文档和支持链接
 * 6. 支持重试按钮
 *
 * @example
 * ```tsx
 * <EnhancedErrorAlert
 *   error={error}
 *   onRetry={handleRetry}
 *   onClose={() => setError(null)}
 * />
 * ```
 */
export const EnhancedErrorAlert: React.FC<EnhancedErrorAlertProps> = ({
  error,
  visible = true,
  title,
  onRetry,
  onClose,
  showRecoverySuggestions = true,
  showRequestId = true,
  showTechnicalDetails = true,
  showDocumentation = true,
  className,
  type = 'error',
  style,
}) => {
  const parsedError = parseError(error);

  if (!visible || !parsedError) {
    return null;
  }

  const displayMessage = parsedError.userMessage || parsedError.message;
  const hasSuggestions =
    showRecoverySuggestions &&
    parsedError.recoverySuggestions &&
    parsedError.recoverySuggestions.length > 0;
  const hasRequestId = showRequestId && parsedError.requestId;
  const hasTechnicalDetails =
    showTechnicalDetails && (parsedError.technicalMessage || parsedError.details);
  const hasDocumentation =
    showDocumentation && (parsedError.documentationUrl || parsedError.supportUrl);
  const canRetry = onRetry && parsedError.retryable !== false;

  return (
    <Alert
      type={type}
      showIcon
      closable={!!onClose}
      onClose={onClose}
      className={className}
      style={style}
      message={
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              marginBottom: hasSuggestions || hasRequestId ? 12 : 0,
            }}
          >
            {title || displayMessage}
          </div>

          {/* 恢复建议 */}
          {hasSuggestions && (
            <div style={{ marginTop: 12 }}>
              <Text strong style={{ fontSize: 13 }}>
                解决方案：
              </Text>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                {parsedError.recoverySuggestions!.map((suggestion, index) => (
                  <li key={index} style={{ marginBottom: 6 }}>
                    <Text strong>{suggestion.action}:</Text> {suggestion.description}
                    {suggestion.actionUrl && (
                      <>
                        {' '}
                        <Link
                          href={suggestion.actionUrl}
                          target={suggestion.actionUrl.startsWith('http') ? '_blank' : '_self'}
                        >
                          前往 <LinkOutlined style={{ fontSize: 12 }} />
                        </Link>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Request ID 和错误代码 */}
          {(hasRequestId || parsedError.code) && (
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {hasRequestId && (
                <div>
                  <Tag color="default" style={{ fontSize: 11 }}>
                    Request ID: {parsedError.requestId}
                  </Tag>
                </div>
              )}
              {parsedError.code && (
                <div>
                  <Tag color="default" style={{ fontSize: 11 }}>
                    错误代码: {parsedError.code}
                  </Tag>
                </div>
              )}
            </div>
          )}

          {/* 技术详情 */}
          {hasTechnicalDetails && (
            <div style={{ marginTop: 12 }}>
              <Collapse
                ghost
                size="small"
                items={[
                  {
                    key: 'technical',
                    label: (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        查看技术详情
                      </Text>
                    ),
                    children: (
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {parsedError.technicalMessage && (
                          <div style={{ marginBottom: 8 }}>
                            <Text strong>技术消息：</Text>
                            <pre
                              style={{
                                background: '#f5f5f5',
                                padding: 8,
                                borderRadius: 4,
                                margin: '4px 0 0 0',
                                fontSize: 11,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {parsedError.technicalMessage}
                            </pre>
                          </div>
                        )}
                        {parsedError.details && (
                          <div>
                            <Text strong>详细信息：</Text>
                            <pre
                              style={{
                                background: '#f5f5f5',
                                padding: 8,
                                borderRadius: 4,
                                margin: '4px 0 0 0',
                                fontSize: 11,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: 200,
                                overflow: 'auto',
                              }}
                            >
                              {typeof parsedError.details === 'string'
                                ? parsedError.details
                                : JSON.stringify(parsedError.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* 文档和支持链接、重试按钮 */}
          {(hasDocumentation || canRetry) && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
              <Space size="middle">
                {canRetry && (
                  <Button type="primary" size="small" icon={<ReloadOutlined />} onClick={onRetry}>
                    重试
                  </Button>
                )}
                {parsedError.documentationUrl && (
                  <Link
                    href={parsedError.documentationUrl}
                    target="_blank"
                    style={{ fontSize: 13 }}
                  >
                    <QuestionCircleOutlined /> 查看文档
                  </Link>
                )}
                {parsedError.supportUrl && (
                  <Link
                    href={parsedError.supportUrl}
                    target={parsedError.supportUrl.startsWith('http') ? '_blank' : '_self'}
                    style={{ fontSize: 13 }}
                  >
                    <CustomerServiceOutlined /> 联系技术支持
                  </Link>
                )}
              </Space>
            </div>
          )}
        </div>
      }
    />
  );
};

/**
 * 简化版ErrorAlert（向后兼容）
 */
export interface SimpleErrorAlertProps {
  error: Error | string | null;
  onClose?: () => void;
  className?: string;
}

export const SimpleErrorAlert: React.FC<SimpleErrorAlertProps> = ({
  error,
  onClose,
  className,
}) => {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  return (
    <Alert
      type="error"
      showIcon
      closable={!!onClose}
      onClose={onClose}
      message={message}
      className={className}
      style={{ marginBottom: 16 }}
    />
  );
};

export default EnhancedErrorAlert;
