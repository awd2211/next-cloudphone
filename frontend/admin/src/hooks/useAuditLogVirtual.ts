import { useState, useMemo } from 'react';
import type { AuditLog } from '@/types/auditLog';
import { generateLogs } from '@/utils/auditLog';

export const useAuditLogVirtual = () => {
  const [allLogs] = useState<AuditLog[]>(generateLogs(10000));
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (searchText && !log.userName.includes(searchText) && !log.action.includes(searchText)) {
        return false;
      }
      return true;
    });
  }, [allLogs, searchText, levelFilter, actionFilter]);

  return {
    allLogs,
    filteredLogs,
    searchText,
    setSearchText,
    levelFilter,
    setLevelFilter,
    actionFilter,
    setActionFilter,
  };
};
