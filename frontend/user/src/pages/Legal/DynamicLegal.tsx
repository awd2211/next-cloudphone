/**
 * 动态法律文档页面
 * 从 CMS API 加载法律文档内容，如果失败则显示错误
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Typography, Spin, Result, Alert, Button } from 'antd';
import {
  LockOutlined,
  FileTextOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { getLegalDocument, type LegalDocument } from '@/services/cms';

const { Title, Text } = Typography;

// 法律文档类型配置
const legalTypeConfig: Record<string, { icon: React.ReactNode; title: string }> = {
  privacy: { icon: <LockOutlined />, title: '隐私政策' },
  terms: { icon: <FileTextOutlined />, title: '服务条款' },
  refund: { icon: <FileTextOutlined />, title: '退款政策' },
  sla: { icon: <SafetyOutlined />, title: '服务水平协议' },
  security: { icon: <SafetyOutlined />, title: '安全说明' },
};

const DynamicLegal: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = async () => {
    if (!type) {
      setError('未指定文档类型');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const doc = await getLegalDocument(type);
      setDocument(doc);
    } catch (err) {
      console.error('Failed to load legal document:', err);
      setError('加载文档失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [type]);

  const config = type ? legalTypeConfig[type] : null;

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#666' }}>正在加载文档...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <Card>
          <Result
            status="error"
            title="加载失败"
            subTitle={error || '无法加载文档内容'}
            extra={
              <Button type="primary" icon={<ReloadOutlined />} onClick={loadDocument}>
                重试
              </Button>
            }
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
              {config?.icon && <span style={{ marginRight: '8px' }}>{config.icon}</span>}
              {document.title}
            </Title>
            <Text type="secondary">
              <ClockCircleOutlined style={{ marginRight: '4px' }} />
              版本 {document.version}
              {document.effectiveDate && ` | 生效日期：${document.effectiveDate}`}
            </Text>
          </div>

          <Alert
            message="法律声明"
            description="请仔细阅读以下内容，使用我们的服务即表示您同意本文档的全部条款。"
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />

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
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                lineHeight: 1.8,
                fontSize: '14px',
              }}
            >
              {document.content}
            </pre>
          )}
        </Typography>
      </Card>
    </div>
  );
};

export default DynamicLegal;
