import React from 'react';
import { Modal, Space, Select, Input, Typography } from 'antd';

const { Text } = Typography;
const { Option } = Select;

interface InvoiceModalProps {
  visible: boolean;
  invoiceType: 'personal' | 'company';
  invoiceTitle: string;
  taxId: string;
  onInvoiceTypeChange: (type: 'personal' | 'company') => void;
  onInvoiceTitleChange: (title: string) => void;
  onTaxIdChange: (taxId: string) => void;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * 发票弹窗组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染税号输入框（企业发票）
 */
export const InvoiceModal: React.FC<InvoiceModalProps> = React.memo(
  ({
    visible,
    invoiceType,
    invoiceTitle,
    taxId,
    onInvoiceTypeChange,
    onInvoiceTitleChange,
    onTaxIdChange,
    onOk,
    onCancel,
  }) => {
    return (
      <Modal
        title="申请发票"
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        okText="提交申请"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 发票类型 */}
          <div>
            <Text>发票类型：</Text>
            <Select
              value={invoiceType}
              onChange={onInvoiceTypeChange}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Option value="personal">个人</Option>
              <Option value="company">企业</Option>
            </Select>
          </div>

          {/* 发票抬头 */}
          <div>
            <Text>发票抬头：</Text>
            <Input
              value={invoiceTitle}
              onChange={(e) => onInvoiceTitleChange(e.target.value)}
              style={{ marginTop: 8 }}
              placeholder="请输入发票抬头"
            />
          </div>

          {/* 税号（企业发票） */}
          {invoiceType === 'company' && (
            <div>
              <Text>税号：</Text>
              <Input
                value={taxId}
                onChange={(e) => onTaxIdChange(e.target.value)}
                style={{ marginTop: 8 }}
                placeholder="请输入企业税号"
              />
            </div>
          )}
        </Space>
      </Modal>
    );
  }
);

InvoiceModal.displayName = 'InvoiceModal';
