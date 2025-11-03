import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Modal } from 'antd';
import type { UploadFile } from 'antd';
import {
  getTicketDetail,
  getTicketReplies,
  addTicketReply,
  closeTicket,
  reopenTicket,
  uploadAttachment,
  type Ticket,
  type TicketReply,
  type Attachment,
} from '@/services/ticket';

/**
 * 工单详情 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 统一错误处理和消息提示
 * 4. ✅ 集中管理所有状态
 */
export function useTicketDetail(id: string | undefined) {
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([]);

  // ===== 数据加载 =====
  /**
   * 加载工单详情
   */
  const loadTicketDetail = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getTicketDetail(id);
      setTicket(data);
    } catch (error: any) {
      message.error(error.message || '加载工单详情失败');
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  /**
   * 加载回复列表
   */
  const loadReplies = useCallback(async () => {
    if (!id) return;

    setRepliesLoading(true);
    try {
      const data = await getTicketReplies(id);
      setReplies(data);
    } catch (error: any) {
      message.error(error.message || '加载回复列表失败');
    } finally {
      setRepliesLoading(false);
    }
  }, [id]);

  // ===== 文件上传 =====
  /**
   * 处理文件上传
   */
  const handleUpload = useCallback(
    async (options: any) => {
      const { file, onSuccess, onError } = options;

      try {
        const attachment = await uploadAttachment(file);
        setUploadedAttachments((prev) => [...prev, attachment]);
        onSuccess(attachment);
        message.success('文件上传成功');
      } catch (error) {
        onError(error);
        message.error('文件上传失败');
      }
    },
    []
  );

  /**
   * 处理文件移除
   */
  const handleRemoveFile = useCallback(
    (file: UploadFile) => {
      const att = uploadedAttachments.find((a) => a.id === file.response?.id);
      if (att) {
        setUploadedAttachments((prev) => prev.filter((a) => a.id !== att.id));
      }
    },
    [uploadedAttachments]
  );

  // ===== 回复提交 =====
  /**
   * 提交回复
   */
  const handleSubmitReply = useCallback(async () => {
    if (!id || !replyContent.trim()) {
      message.warning('请输入回复内容');
      return;
    }

    setSubmitLoading(true);
    try {
      await addTicketReply(id, {
        content: replyContent,
        attachmentIds: uploadedAttachments.map((att) => att.id),
      });

      message.success('回复已提交');
      setReplyContent('');
      setFileList([]);
      setUploadedAttachments([]);
      await loadReplies();
    } catch (error: any) {
      message.error(error.message || '提交回复失败');
    } finally {
      setSubmitLoading(false);
    }
  }, [id, replyContent, uploadedAttachments, loadReplies]);

  // ===== 工单操作 =====
  /**
   * 关闭工单（带确认）
   */
  const handleCloseTicket = useCallback(() => {
    if (!id) return;

    Modal.confirm({
      title: '确认关闭工单',
      content: '关闭后将无法继续回复，确定要关闭吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await closeTicket(id);
          message.success('工单已关闭');
          await loadTicketDetail();
        } catch (error: any) {
          message.error(error.message || '关闭工单失败');
        }
      },
    });
  }, [id, loadTicketDetail]);

  /**
   * 重新打开工单
   */
  const handleReopenTicket = useCallback(async () => {
    if (!id) return;

    try {
      await reopenTicket(id);
      message.success('工单已重新打开');
      await loadTicketDetail();
    } catch (error: any) {
      message.error(error.message || '重新打开工单失败');
    }
  }, [id, loadTicketDetail]);

  /**
   * 刷新数据
   */
  const handleRefresh = useCallback(() => {
    loadTicketDetail();
    loadReplies();
  }, [loadTicketDetail, loadReplies]);

  // ===== 导航 =====
  /**
   * 返回列表
   */
  const handleBack = useCallback(() => {
    navigate('/tickets');
  }, [navigate]);

  // ===== 副作用 =====
  useEffect(() => {
    loadTicketDetail();
    loadReplies();
  }, [loadTicketDetail, loadReplies]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    repliesLoading,
    submitLoading,
    ticket,
    replies,
    replyContent,
    fileList,

    // 状态设置
    setReplyContent,
    setFileList,

    // 数据操作
    loadTicketDetail,
    loadReplies,

    // 文件上传
    handleUpload,
    handleRemoveFile,

    // 回复提交
    handleSubmitReply,

    // 工单操作
    handleCloseTicket,
    handleReopenTicket,
    handleRefresh,

    // 导航
    handleBack,
  };
}
