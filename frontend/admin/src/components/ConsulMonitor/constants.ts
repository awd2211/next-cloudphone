import { ServiceHealth } from './types';

/**
 * Consul 监控页面常量
 */

// Mock 数据 - 实际应该调用 Consul API
export const MOCK_SERVICES: ServiceHealth[] = [
  {
    service: 'api-gateway',
    instances: [
      {
        id: 'api-gateway-1',
        name: 'api-gateway',
        address: '172.18.0.5',
        port: 30000,
        status: 'passing',
        tags: ['v1.0.0', 'cluster'],
        meta: { version: '1.0.0', instances: '4' },
      },
    ],
    healthyCount: 1,
    unhealthyCount: 0,
  },
  {
    service: 'user-service',
    instances: [
      {
        id: 'user-service-1',
        name: 'user-service',
        address: '172.18.0.6',
        port: 30001,
        status: 'passing',
        tags: ['v1.0.0', 'cluster'],
        meta: { version: '1.0.0', instances: '2' },
      },
    ],
    healthyCount: 1,
    unhealthyCount: 0,
  },
  {
    service: 'device-service',
    instances: [
      {
        id: 'device-service-1',
        name: 'device-service',
        address: '172.18.0.7',
        port: 30002,
        status: 'passing',
        tags: ['v1.0.0'],
        meta: { version: '1.0.0' },
      },
    ],
    healthyCount: 1,
    unhealthyCount: 0,
  },
  {
    service: 'app-service',
    instances: [
      {
        id: 'app-service-1',
        name: 'app-service',
        address: '172.18.0.8',
        port: 30003,
        status: 'passing',
        tags: ['v1.0.0'],
        meta: { version: '1.0.0' },
      },
    ],
    healthyCount: 1,
    unhealthyCount: 0,
  },
  {
    service: 'billing-service',
    instances: [
      {
        id: 'billing-service-1',
        name: 'billing-service',
        address: '172.18.0.9',
        port: 30005,
        status: 'passing',
        tags: ['v1.0.0'],
        meta: { version: '1.0.0' },
      },
    ],
    healthyCount: 1,
    unhealthyCount: 0,
  },
  {
    service: 'notification-service',
    instances: [
      {
        id: 'notification-service-1',
        name: 'notification-service',
        address: '172.18.0.10',
        port: 30006,
        status: 'warning',
        tags: ['v1.0.0'],
        meta: { version: '1.0.0' },
      },
    ],
    healthyCount: 0,
    unhealthyCount: 1,
  },
];

// 自动刷新间隔（毫秒）
export const AUTO_REFRESH_INTERVAL = 10000;

// Consul 地址
export const CONSUL_URL = 'http://localhost:8500';
