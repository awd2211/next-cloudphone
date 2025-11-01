import React from 'react';
import { Card, Space, Button, Typography } from 'antd';
import {
  LeftOutlined,
  FileTextOutlined,
  WalletOutlined,
  DownloadOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { BillStatus, type Bill } from '@/services/billing';

const { Title } = Typography;

interface BillHeaderProps {
  bill: Bill;
  onBack: () => void;
  onPay: () => void;
  onApplyInvoice: () => void;
  onDownload: () => void;
  onPrint: () => void;
}

/**
 * 账单详情头部组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 根据账单状态条件渲染操作按钮
 */
export const BillHeader: React.FC<BillHeaderProps> = React.memo(
  ({ bill, onBack, onPay, onApplyInvoice, onDownload, onPrint }) => {
    return (
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          {/* 左侧：返回按钮 + 标题 */}
          <Space>
            <Button icon={<LeftOutlined />} onClick={onBack}>
              返回
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined /> 账单详情
            </Title>
          </Space>

          {/* 右侧：操作按钮（根据状态显示） */}
          <Space>
            {bill.status === BillStatus.PENDING && (
              <Button type="primary" icon={<WalletOutlined />} onClick={onPay}>
                立即支付
              </Button>
            )}
            {bill.status === BillStatus.PAID && (
              <>
                <Button icon={<FileTextOutlined />} onClick={onApplyInvoice}>
                  申请发票
                </Button>
                <Button icon={<DownloadOutlined />} onClick={onDownload}>
                  下载账单
                </Button>
                <Button icon={<PrinterOutlined />} onClick={onPrint}>
                  打印
                </Button>
              </>
            )}
          </Space>
        </Space>
      </Card>
    );
  }
);

BillHeader.displayName = 'BillHeader';
