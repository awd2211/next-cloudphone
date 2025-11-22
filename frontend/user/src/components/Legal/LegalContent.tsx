/**
 * 法律文档动态内容组件
 * 从 CMS API 加载法律文档内容
 */
import React, { useEffect, useState } from 'react';
import { Card, Typography, Spin, Result, Alert } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { getLegalDocument, type LegalDocument } from '@/services/cms';

const { Title, Text } = Typography;

interface LegalContentProps {
  type: 'privacy' | 'terms' | 'refund' | 'sla' | 'security';
  icon?: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 法律文档内容组件
 *
 * 从 CMS API 动态加载法律文档内容，支持 HTML 和 Markdown 格式
 * 如果 API 加载失败，会显示 fallback 内容
 */
const LegalContent: React.FC<LegalContentProps> = ({ type, icon, fallback }) => {
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        const doc = await getLegalDocument(type);
        setDocument(doc);
      } catch (err) {
        console.error('Failed to load legal document:', err);
        setError('加载文档失败');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [type]);

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#666' }}>正在加载文档...</p>
          </div>
        </Card>
      </div>
    );
  }

  // 如果加载失败且有 fallback，显示 fallback
  if (error && fallback) {
    return <>{fallback}</>;
  }

  // 如果加载失败且没有 fallback，显示错误
  if (error || !document) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <Card>
          <Result
            status="error"
            title="加载失败"
            subTitle="无法加载文档内容，请稍后重试"
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card>
        <Typography>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2}>
              {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
              {document.title}
            </Title>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              版本 {document.version}
              {document.effectiveDate && ` | 生效日期：${document.effectiveDate}`}
            </Text>
          </div>

          {document.contentType === 'html' && (
            <Alert
              message="法律声明"
              description="请仔细阅读以下内容，使用我们的服务即表示您同意本文档的全部条款。"
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />
          )}

          {/* 内容区域 */}
          {document.contentType === 'html' ? (
            <div
              className="legal-content"
              dangerouslySetInnerHTML={{ __html: document.content }}
              style={{
                lineHeight: 1.8,
                fontSize: '14px',
              }}
            />
          ) : (
            // Markdown 内容 - 后续可以集成 markdown 渲染器
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {document.content}
            </pre>
          )}
        </Typography>
      </Card>
    </div>
  );
};

export default LegalContent;
