import type { OperationType } from '@/types';

export const getOperationColor = (operation: OperationType): string => {
  const colors: Record<OperationType, string> = {
    create: 'green',
    update: 'blue',
    view: 'cyan',
    export: 'purple',
  };
  return colors[operation] || 'default';
};

export const getOperationLabel = (
  operation: OperationType,
  operationTypes: Array<{ value: OperationType; label: string }> | undefined
): string => {
  // ✅ 防御性编程：处理 operationTypes 为 undefined 的情况
  if (!operationTypes || operationTypes.length === 0) {
    return operation;
  }
  const operationType = operationTypes.find((t) => t.value === operation);
  return operationType?.label || operation;
};
