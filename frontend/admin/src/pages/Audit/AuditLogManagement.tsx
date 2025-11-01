import React, { useState, useEffect } from 'react';
import { Card, message } from 'antd';
import type { AuditLog, AuditAction, AuditLevel, AuditLogStatistics } from '@/types';
import { searchAuditLogs, getAuditLogStatistics } from '@/services/auditLog';
import {
  AuditStatsCards,
  AuditFilterBar,
  AuditTable,
  AuditDetailDrawer,
} from '@/components/Audit';

/**
 * 审计日志管理页面（优化版）
 *
 * 优化点：
 * 1. ✅ 组件拆分 - 提取 AuditStatsCards, AuditTable 等
 * 2. ✅ 工具函数提取 - utils.tsx
 * 3. ✅ 常量提取 - constants.ts
 * 4. ✅ 代码按功能拆分，提高可维护性
 */
const AuditLogManagement: React.FC = () => {
  // ===== 状态管理 =====
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditLogStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterAction, setFilterAction] = useState<AuditAction | undefined>(undefined);
  const [filterLevel, setFilterLevel] = useState<AuditLevel | undefined>(undefined);
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterSuccess, setFilterSuccess] = useState<boolean | undefined>(undefined);
  const [filterDateRange, setFilterDateRange] = useState<[string, string] | null>(null);

  // ===== 数据加载 =====
  useEffect(() => {
    loadLogs();
    loadStatistics();
  }, [filterUserId, filterAction, filterLevel, filterResourceType, filterSuccess, filterDateRange]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterUserId) params.userId = filterUserId;
      if (filterAction) params.action = filterAction;
      if (filterLevel) params.level = filterLevel;
      if (filterResourceType) params.resourceType = filterResourceType;
      if (filterSuccess !== undefined) params.success = filterSuccess;
      if (filterDateRange) {
        params.startDate = filterDateRange[0];
        params.endDate = filterDateRange[1];
      }

      const res = await searchAuditLogs(params);
      if (res.success) {
        setLogs(res.data);
      }
    } catch (error) {
      message.error('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const res = await getAuditLogStatistics();
      if (res.success) {
        setStatistics(res.data);
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  };

  // ===== 事件处理 =====
  const handleViewDetail = (record: AuditLog) => {
    setSelectedLog(record);
    setIsDetailDrawerVisible(true);
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setFilterDateRange([dates[0].toISOString(), dates[1].toISOString()]);
    } else {
      setFilterDateRange(null);
    }
  };

  // ===== 渲染 =====
  return (
    <div style={{ padding: '24px' }}>
      {/* 统计卡片 */}
      <AuditStatsCards statistics={statistics} />

      {/* 审计日志表格 */}
      <Card
        title="审计日志"
        extra={
          <AuditFilterBar
            filterUserId={filterUserId}
            filterLevel={filterLevel}
            filterResourceType={filterResourceType}
            filterSuccess={filterSuccess}
            onUserIdChange={setFilterUserId}
            onLevelChange={setFilterLevel}
            onResourceTypeChange={setFilterResourceType}
            onSuccessChange={setFilterSuccess}
            onDateRangeChange={handleDateRangeChange}
            onRefresh={loadLogs}
          />
        }
      >
        <AuditTable logs={logs} loading={loading} onViewDetail={handleViewDetail} />
      </Card>

      {/* 详情抽屉 */}
      <AuditDetailDrawer
        visible={isDetailDrawerVisible}
        log={selectedLog}
        onClose={() => setIsDetailDrawerVisible(false)}
      />
    </div>
  );
};

export default AuditLogManagement;
