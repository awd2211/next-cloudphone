import React from 'react';
import { Tag } from 'antd';
import { RESOURCE_TYPE_CONFIG, METHOD_CONFIG, STATUS_CONFIG } from './constants';
import type { AuditLog } from './constants';

export const getResourceTypeTag = (type: AuditLog['resourceType']) => {
  const config = RESOURCE_TYPE_CONFIG[type];
  return <Tag color={config.color}>{config.text}</Tag>;
};

export const getMethodTag = (method: AuditLog['method']) => {
  const config = METHOD_CONFIG[method];
  return <Tag color={config.color}>{config.text}</Tag>;
};

export const getStatusTag = (status: AuditLog['status']) => {
  const config = STATUS_CONFIG[status];
  return <Tag color={config.color}>{config.text}</Tag>;
};
