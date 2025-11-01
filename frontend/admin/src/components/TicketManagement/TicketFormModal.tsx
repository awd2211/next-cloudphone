/**
 * TicketFormModal - 工单表单弹窗组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Modal, Form, Input, Select, Row, Col } from 'antd';
import type { FormInstance } from 'antd';
import type { Ticket } from '@/types';

interface TicketFormModalProps {
  visible: boolean;
  editingTicket: Ticket | null;
  form: FormInstance;
  onOk: () => void;
  onCancel: () => void;
}

/**
 * TicketFormModal 组件
 * 新建或编辑工单的表单弹窗
 */
export const TicketFormModal = memo<TicketFormModalProps>(
  ({ visible, editingTicket, form, onOk, onCancel }) => {
    return (
      <Modal
        title={editingTicket ? '编辑工单' : '新建工单'}
        open={visible}
        onOk={onOk}
        onCancel={onCancel}
        width={700}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          {!editingTicket && (
            <Form.Item
              name="userId"
              label="用户ID"
              rules={[{ required: true, message: '请输入用户ID' }]}
            >
              <Input placeholder="请输入用户ID" />
            </Form.Item>
          )}

          <Form.Item
            name="subject"
            label="主题"
            rules={[{ required: true, message: '请输入工单主题' }]}
          >
            <Input placeholder="请输入工单主题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
            rules={[{ required: true, message: '请输入工单描述' }]}
          >
            <Input.TextArea placeholder="请详细描述问题" rows={4} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="category"
                label="分类"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  <Select.Option value="technical">技术支持</Select.Option>
                  <Select.Option value="billing">账单问题</Select.Option>
                  <Select.Option value="account">账户问题</Select.Option>
                  <Select.Option value="feature_request">功能请求</Select.Option>
                  <Select.Option value="other">其他</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select placeholder="请选择优先级">
                  <Select.Option value="low">低</Select.Option>
                  <Select.Option value="medium">中</Select.Option>
                  <Select.Option value="high">高</Select.Option>
                  <Select.Option value="urgent">紧急</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {editingTicket && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="status" label="状态">
                  <Select placeholder="请选择状态">
                    <Select.Option value="open">待处理</Select.Option>
                    <Select.Option value="in_progress">处理中</Select.Option>
                    <Select.Option value="pending">待用户反馈</Select.Option>
                    <Select.Option value="resolved">已解决</Select.Option>
                    <Select.Option value="closed">已关闭</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="assignedTo" label="分配给">
                  <Input placeholder="请输入客服ID" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item name="tags" label="标签" tooltip="多个标签用逗号分隔">
            <Input placeholder="如: 紧急, 重要, 多个用逗号分隔" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
);

TicketFormModal.displayName = 'TicketFormModal';
