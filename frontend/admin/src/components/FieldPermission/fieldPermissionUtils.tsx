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
  operationTypes: Array<{ value: OperationType; label: string }>
): string => {
  const operationType = operationTypes.find((t) => t.value === operation);
  return operationType?.label || operation;
};
