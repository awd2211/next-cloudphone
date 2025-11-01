/**
 * Consul Monitor 类型定义
 */

export interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  status: 'passing' | 'warning' | 'critical';
  tags: string[];
  meta?: Record<string, string>;
}

export interface ServiceHealth {
  service: string;
  instances: ServiceInstance[];
  healthyCount: number;
  unhealthyCount: number;
}
