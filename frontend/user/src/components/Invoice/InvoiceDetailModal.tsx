import React, { useMemo } from 'react';
import { Modal, Descriptions, Tag, Typography, Divider, Button } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Invoice } from '@/services/billing';

const { Text, Title } = Typography;

interface InvoiceDetailModalProps {
  visible: boolean;
  invoice: Invoice | null;
  downloading: boolean;
  onCancel: () => void;
  onDownload: (id: string, invoiceNo: string) => void;
}

/**
 * 发票详情弹窗组件
 * 展示完整的发票信息，支持下载
 */
export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = React.memo(({
  visible,
  invoice,
  downloading,
  onCancel,
  onDownload,
}) => {
  // 状态配置
  const statusConfig = useMemo(() => ({
    pending: {
      color: 'processing',
      icon: <ClockCircleOutlined />,
      text: '待开具',
    },
    issued: {
      color: 'success',
      icon: <CheckCircleOutlined />,
      text: '已开具',
    },
    rejected: {
      color: 'error',
      icon: <CloseCircleOutlined />,
      text: '已拒绝',
    },
  }), []);

  const renderStatus = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  const renderStatusSection = () => {
    if (!invoice) return null;

    if (invoice.status === 'issued' && invoice.downloadUrl) {
      return (
        <>
          <Divider />
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircleOutlined
              style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }}
            />
            <div>
              <Title level={5}>发票已开具</Title>
              <Text type="secondary">您可以下载电子发票进行查看和打印</Text>
            </div>
          </div>
        </>
      );
    }

    if (invoice.status === 'pending') {
      return (
        <>
          <Divider />
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <ClockCircleOutlined
              style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }}
            />
            <div>
              <Title level={5}>审核中</Title>
              <Text type="secondary">您的发票申请正在审核中，通常在 1-3 个工作日内完成</Text>
            </div>
          </div>
        </>
      );
    }

    if (invoice.status === 'rejected') {
      return (
        <>
          <Divider />
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CloseCircleOutlined
              style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }}
            />
            <div>
              <Title level={5}>申请被拒绝</Title>
              <Text type="secondary">请检查发票信息是否正确，或联系客服咨询</Text>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  const footer = invoice?.status === 'issued' && invoice?.downloadUrl
    ? [
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<DownloadOutlined />}
          loading={downloading}
          onClick={() => invoice && onDownload(invoice.id, invoice.invoiceNo)}
        >
          下载发票
        </Button>,
      ]
    : [
        <Button key="close" type="primary" onClick={onCancel}>
          关闭
        </Button>,
      ];

  return (
    <Modal
      title="发票详情"
      open={visible}
      onCancel={onCancel}
      footer={footer}
      width={700}
    >
      {invoice && (
        <>
          <Descriptions column={2} bordered>
            <Descriptions.Item label="发票号" span={2}>
              <Text strong copyable>
                {invoice.invoiceNo}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="发票类型">
              <Tag color={invoice.type === 'company' ? 'blue' : 'green'}>
                {invoice.type === 'company' ? '企业' : '个人'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {renderStatus(invoice.status)}
            </Descriptions.Item>
            <Descriptions.Item label="发票抬头" span={2}>
              {invoice.title}
            </Descriptions.Item>
            {invoice.taxId && (
              <Descriptions.Item label="纳税人识别号" span={2}>
                <Text code>{invoice.taxId}</Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="发票金额" span={2}>
              <Text strong style={{ color: '#1890ff', fontSize: '18px' }}>
                ¥{invoice.amount.toFixed(2)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="申请时间">
              {dayjs(invoice.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="开具时间">
              {invoice.issuedAt
                ? dayjs(invoice.issuedAt).format('YYYY-MM-DD HH:mm:ss')
                : '-'}
            </Descriptions.Item>
          </Descriptions>

          {renderStatusSection()}
        </>
      )}
    </Modal>
  );
});

InvoiceDetailModal.displayName = 'InvoiceDetailModal';
