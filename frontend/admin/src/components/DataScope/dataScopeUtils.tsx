import type { ScopeType } from '@/types';

export const getScopeTypeColor = (type: ScopeType): string => {
  const colors: Record<ScopeType, string> = {
    all: 'red',
    tenant: 'orange',
    department: 'blue',
    department_only: 'cyan',
    self: 'green',
    custom: 'purple',
  };
  return colors[type] || 'default';
};
