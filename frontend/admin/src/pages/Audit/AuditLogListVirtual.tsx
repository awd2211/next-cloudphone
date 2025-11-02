import React from 'react';
import { Card } from 'antd';
import { FilterBar, StatsBar, VirtualLogList } from '@/components/AuditLogVirtual';
import { useAuditLogVirtual } from '@/hooks/useAuditLogVirtual';
import './AuditLogListVirtual.css';

/**
 * 审计日志列表 - 虚拟滚动版本
 *
 * 使用 react-window 优化超长列表渲染
 * 适合 10,000+ 条记录的场景
 */
const AuditLogListVirtual: React.FC = () => {
  const {
    allLogs,
    filteredLogs,
    searchText,
    setSearchText,
    levelFilter,
    setLevelFilter,
    actionFilter,
    setActionFilter,
  } = useAuditLogVirtual();

  return (
    <div className="audit-log-virtual-container">
      <Card
        title="审计日志 (虚拟滚动)"
        extra={
          <FilterBar
            searchText={searchText}
            onSearchChange={setSearchText}
            levelFilter={levelFilter}
            onLevelChange={setLevelFilter}
            actionFilter={actionFilter}
            onActionChange={setActionFilter}
          />
        }
      >
        <StatsBar totalCount={allLogs.length} filteredCount={filteredLogs.length} />
        <VirtualLogList logs={filteredLogs} />
      </Card>
    </div>
  );
};

export default React.memo(AuditLogListVirtual);
