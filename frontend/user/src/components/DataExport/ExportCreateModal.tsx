import React, { useMemo } from 'react';
import { Modal, Form, Select, Alert, Space, Typography, theme } from 'antd';
import { DatePicker } from 'antd';
import { ExportOutlined, FileTextOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd/es/form';
import { ExportDataType, ExportFormat } from '@/services/export';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;
const { useToken } = theme;

interface ExportCreateModalProps {
  visible: boolean;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * 创建导出任务弹窗组件
 * 包含数据类型、格式选择和日期范围
 */
export const ExportCreateModal: React.FC<ExportCreateModalProps> = React.memo(({
  visible,
  form,
  onOk,
  onCancel,
}) => {
  const { token } = useToken();

  // 数据类型配置
  const dataTypeConfig = useMemo(() => ({
    [ExportDataType.ORDERS]: { label: '订单数据', description: '导出所有订单记录，包括订单详情、支付信息等', color: token.colorPrimary },
    [ExportDataType.DEVICES]: { label: '设备数据', description: '导出设备列表和配置信息', color: token.colorSuccess },
    [ExportDataType.TICKETS]: { label: '工单数据', description: '导出工单记录和回复内容', color: token.colorWarning },
    [ExportDataType.BILLING]: { label: '账单数据', description: '导出账单记录和充值历史', color: token.colorError },
    [ExportDataType.USAGE]: { label: '使用记录', description: '导出设备使用时长和流量记录', color: token.colorInfo },
    [ExportDataType.MESSAGES]: { label: '消息通知', description: '导出所有消息通知记录', color: token.purple },
    [ExportDataType.TRANSACTIONS]: { label: '交易记录', description: '导出所有交易流水记录', color: token.orange },
  }), [token]);

  // 格式配置
  const formatConfig = useMemo(() => ({
    [ExportFormat.CSV]: { label: 'CSV', icon: <FileTextOutlined />, color: token.colorSuccess },
    [ExportFormat.EXCEL]: { label: 'Excel', icon: <FileExcelOutlined />, color: token.colorPrimary },
    [ExportFormat.PDF]: { label: 'PDF', icon: <FilePdfOutlined />, color: token.colorError },
    [ExportFormat.JSON]: { label: 'JSON', icon: <FileTextOutlined />, color: token.colorWarning },
  }), [token]);

  return (
    <Modal
      title={
        <Space>
          <ExportOutlined /> 创建导出任务
        </Space>
      }
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      width={600}
      okText="创建"
      cancelText="取消"
    >
      <Alert
        message="提示"
        description="导出任务将在后台处理，完成后可在列表中下载文件。文件将保留 7 天。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          name="dataType"
          label="数据类型"
          rules={[{ required: true, message: '请选择数据类型' }]}
        >
          <Select placeholder="选择要导出的数据类型" size="large">
            {Object.entries(dataTypeConfig).map(([key, config]) => (
              <Option key={key} value={key}>
                <Space>
                  <FileTextOutlined style={{ color: config.color }} />
                  <div>
                    <div>{config.label}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {config.description}
                    </Text>
                  </div>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="format"
          label="导出格式"
          rules={[{ required: true, message: '请选择导出格式' }]}
        >
          <Select placeholder="选择文件格式" size="large">
            {Object.entries(formatConfig).map(([key, config]) => (
              <Option key={key} value={key}>
                <Space>
                  <span style={{ color: config.color }}>{config.icon}</span>
                  <span>{config.label}</span>
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="dateRange" label="日期范围（可选）">
          <RangePicker
            style={{ width: '100%' }}
            size="large"
            format="YYYY-MM-DD"
            placeholder={['开始日期', '结束日期']}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
});

ExportCreateModal.displayName = 'ExportCreateModal';
