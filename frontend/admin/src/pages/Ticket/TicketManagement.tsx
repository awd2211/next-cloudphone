import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { Form } from 'antd';
import type {
  Ticket,
  TicketReply,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  CreateTicketDto,
  TicketStatistics,
} from '@/types';
import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  getTicketReplies,
  addTicketReply,
  getTicketStatistics,
} from '@/services/ticket';
import {
  StatisticsRow,
  TicketTableCard,
  TicketFormModal,
  ReplyFormModal,
  TicketDetailDrawer,
} from '@/components/TicketManagement';

/**
 * 工单管理页面
 * 用于查看和管理系统工单及回复
 */
const TicketManagement: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statistics, setStatistics] = useState<TicketStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketReplies, setTicketReplies] = useState<TicketReply[]>([]);
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();
  const [filterStatus, setFilterStatus] = useState<TicketStatus | undefined>(undefined);
  const [filterPriority, setFilterPriority] = useState<TicketPriority | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<TicketCategory | undefined>(undefined);
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('');

  useEffect(() => {
    loadTickets();
    loadStatistics();
  }, [filterStatus, filterPriority, filterCategory, filterAssignedTo]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category = filterCategory;
      if (filterAssignedTo) params.assignedTo = filterAssignedTo;

      const res = await getAllTickets(params);
      if (res.success) {
        setTickets(res.data);
      }
    } catch (error) {
      message.error('加载工单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await getTicketStatistics();
      if (res.success) {
        setStatistics(res.data);
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  const loadTicketReplies = async (ticketId: string) => {
    try {
      const res = await getTicketReplies(ticketId, true);
      if (res.success) {
        setTicketReplies(res.data);
      }
    } catch (error) {
      message.error('加载回复列表失败');
    }
  };

  const handleCreate = () => {
    setEditingTicket(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: Ticket) => {
    setEditingTicket(record);
    form.setFieldsValue({
      subject: record.subject,
      description: record.description,
      category: record.category,
      priority: record.priority,
      status: record.status,
      assignedTo: record.assignedTo,
      tags: record.tags?.join(', '),
    });
    setIsModalVisible(true);
  };

  const handleViewDetail = async (record: Ticket) => {
    try {
      const res = await getTicketById(record.id);
      if (res.success) {
        setSelectedTicket(res.data);
        await loadTicketReplies(record.id);
        setIsDetailDrawerVisible(true);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  };

  const handleReply = (record: Ticket) => {
    setSelectedTicket(record);
    replyForm.resetFields();
    setIsReplyModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const data: CreateTicketDto | any = {
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: values.priority,
        userId: values.userId,
        tags: values.tags ? values.tags.split(',').map((s: string) => s.trim()) : undefined,
      };

      if (editingTicket) {
        const updateData: any = {
          ...data,
          status: values.status,
          assignedTo: values.assignedTo,
        };
        const res = await updateTicket(editingTicket.id, updateData);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadTickets();
          loadStatistics();
        }
      } else {
        const res = await createTicket(data);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadTickets();
          loadStatistics();
        }
      }
    } catch (error) {
      message.error(editingTicket ? '更新工单失败' : '创建工单失败');
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedTicket) return;

    try {
      const values = await replyForm.validateFields();

      const res = await addTicketReply(selectedTicket.id, {
        userId: values.userId,
        type: values.type,
        content: values.content,
        isInternal: values.isInternal || false,
      });

      if (res.success) {
        message.success(res.message);
        setIsReplyModalVisible(false);
        loadTickets();
        if (isDetailDrawerVisible) {
          await loadTicketReplies(selectedTicket.id);
        }
      }
    } catch (error) {
      message.error('添加回复失败');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* 统计行 */}
      <StatisticsRow statistics={statistics} />

      {/* 工单表格 */}
      <TicketTableCard
        tickets={tickets}
        loading={loading}
        filterStatus={filterStatus}
        filterPriority={filterPriority}
        filterCategory={filterCategory}
        onFilterStatusChange={setFilterStatus}
        onFilterPriorityChange={setFilterPriority}
        onFilterCategoryChange={setFilterCategory}
        onRefresh={loadTickets}
        onCreate={handleCreate}
        onViewDetail={handleViewDetail}
        onReply={handleReply}
        onEdit={handleEdit}
      />

      {/* 新建/编辑工单弹窗 */}
      <TicketFormModal
        visible={isModalVisible}
        editingTicket={editingTicket}
        form={form}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
      />

      {/* 回复工单弹窗 */}
      <ReplyFormModal
        visible={isReplyModalVisible}
        form={replyForm}
        onOk={handleSubmitReply}
        onCancel={() => setIsReplyModalVisible(false)}
      />

      {/* 工单详情抽屉 */}
      <TicketDetailDrawer
        visible={isDetailDrawerVisible}
        selectedTicket={selectedTicket}
        ticketReplies={ticketReplies}
        onClose={() => setIsDetailDrawerVisible(false)}
      />
    </div>
  );
};

export default TicketManagement;
