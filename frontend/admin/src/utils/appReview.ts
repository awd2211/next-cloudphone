import React from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

export const formatSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  }
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export const getStatusConfig = (status: string) => {
  const statusMap: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
    pending: {
      color: 'processing',
      icon: React.createElement(WarningOutlined),
      text: '待审核',
    },
    approved: {
      color: 'success',
      icon: React.createElement(CheckCircleOutlined),
      text: '已批准',
    },
    rejected: {
      color: 'error',
      icon: React.createElement(CloseCircleOutlined),
      text: '已拒绝',
    },
    changes_requested: {
      color: 'warning',
      icon: React.createElement(FileTextOutlined),
      text: '需修改',
    },
  };
  return statusMap[status] || statusMap.pending;
};

export const getReviewActionLabel = (action: string): string => {
  const actionMap: Record<string, string> = {
    approve: '批准',
    reject: '拒绝',
    request_changes: '要求修改',
    submit: '提交审核',
  };
  return actionMap[action] || action;
};
