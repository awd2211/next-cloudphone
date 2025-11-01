import { memo } from 'react';
import { Card, Row, Col, Space, Button } from 'antd';
import { FilterOutlined, DownloadOutlined } from '@ant-design/icons';
import { PermissionGuard } from '@/hooks';

export interface PaymentToolbarProps {
  showFilters: boolean;
  exportLoading: boolean;
  onToggleFilters: () => void;
  onExport: () => void;
}

/**
 * 支付工具栏组件
 */
export const PaymentToolbar = memo<PaymentToolbarProps>(
  ({ showFilters, exportLoading, onToggleFilters, onExport }) => {
    return (
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <h2 style={{ margin: 0 }}>支付管理</h2>
          </Col>
          <Col>
            <Space>
              <Button icon={<FilterOutlined />} onClick={onToggleFilters}>
                {showFilters ? '隐藏筛选' : '显示筛选'}
              </Button>
              <PermissionGuard permission="payment:list:export">
                <Button icon={<DownloadOutlined />} loading={exportLoading} onClick={onExport}>
                  导出 Excel
                </Button>
              </PermissionGuard>
            </Space>
          </Col>
        </Row>
      </Card>
    );
  }
);

PaymentToolbar.displayName = 'PaymentToolbar';
