import React from 'react';
import { Modal, Form, Select, Input, Empty } from 'antd';
import type { FormInstance } from 'antd/es/form';
import dayjs from 'dayjs';
import type { Bill, InvoiceRequest } from '@/services/billing';

const { Option } = Select;
const { TextArea } = Input;

interface InvoiceApplyModalProps {
  visible: boolean;
  form: FormInstance;
  bills: Bill[];
  onCancel: () => void;
  onFinish: (values: InvoiceRequest) => void;
}

/**
 * 申请发票弹窗组件
 * 包含发票申请表单，支持个人和企业类型
 */
export const InvoiceApplyModal: React.FC<InvoiceApplyModalProps> = React.memo(({
  visible,
  form,
  bills,
  onCancel,
  onFinish,
}) => {
  return (
    <Modal
      title="申请发票"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      width={600}
    >
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Form.Item
          label="选择账单"
          name="billId"
          rules={[{ required: true, message: '请选择要开具发票的账单' }]}
        >
          <Select
            placeholder="请选择已支付的账单"
            showSearch
            optionFilterProp="children"
            notFoundContent={
              bills.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可开具发票的账单" />
              ) : undefined
            }
          >
            {bills.map((bill) => (
              <Option key={bill.id} value={bill.id}>
                {bill.billNo} - ¥{bill.finalAmount.toFixed(2)} (
                {dayjs(bill.paidAt).format('YYYY-MM-DD')})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="发票类型"
          name="type"
          rules={[{ required: true, message: '请选择发票类型' }]}
          initialValue="personal"
        >
          <Select>
            <Option value="personal">个人</Option>
            <Option value="company">企业</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="发票抬头"
          name="title"
          rules={[{ required: true, message: '请输入发票抬头' }]}
        >
          <Input placeholder="个人姓名或企业名称" />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
        >
          {({ getFieldValue }) =>
            getFieldValue('type') === 'company' ? (
              <Form.Item
                label="纳税人识别号"
                name="taxId"
                rules={[{ required: true, message: '请输入纳税人识别号' }]}
              >
                <Input placeholder="请输入统一社会信用代码" />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        <Form.Item
          label="接收邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="用于接收电子发票" />
        </Form.Item>

        <Form.Item label="联系电话" name="phone">
          <Input placeholder="可选，用于联系" />
        </Form.Item>

        <Form.Item label="邮寄地址" name="address">
          <TextArea rows={2} placeholder="可选，仅纸质发票需要填写" />
        </Form.Item>
      </Form>
    </Modal>
  );
});

InvoiceApplyModal.displayName = 'InvoiceApplyModal';
