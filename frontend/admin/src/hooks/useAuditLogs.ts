import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { MOCK_AUDIT_LOGS } from '@/components/Audit/constants';
import type { AuditLog } from '@/components/Audit/constants';

export const useAuditLogs = () => {
  const [logs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [loading] = useState(false);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>(logs);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');

  // 过滤逻辑
  useEffect(() => {
    let filtered = logs;

    if (resourceTypeFilter !== 'all') {
      filtered = filtered.filter((log) => log.resourceType === resourceTypeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter((log) => log.method === methodFilter);
    }

    if (searchText) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchText.toLowerCase()) ||
          log.userName.toLowerCase().includes(searchText.toLowerCase()) ||
          log.details?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [resourceTypeFilter, statusFilter, methodFilter, searchText, logs]);

  const handleExport = useCallback(() => {
    const headers = [
      'ID',
      '用户名',
      '操作',
      '资源',
      '资源类型',
      'IP地址',
      '方法',
      '状态',
      '详情',
      '创建时间',
    ];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map((log) => {
        const escapedDetails = (log.details || '').replace(/"/g, '""');
        return [
          log.id,
          log.userName,
          log.action,
          log.resource,
          log.resourceType,
          log.ipAddress,
          log.method,
          log.status,
          `"${escapedDetails}"`,
          dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        ].join(',');
      }),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const handleReset = useCallback(() => {
    setResourceTypeFilter('all');
    setStatusFilter('all');
    setMethodFilter('all');
    setSearchText('');
  }, []);

  const handleViewDetails = useCallback((record: AuditLog) => {
    console.log('查看详情:', record);
  }, []);

  return {
    logs,
    loading,
    filteredLogs,
    resourceTypeFilter,
    statusFilter,
    methodFilter,
    searchText,
    setResourceTypeFilter,
    setStatusFilter,
    setMethodFilter,
    setSearchText,
    handleExport,
    handleReset,
    handleViewDetails,
  };
};
