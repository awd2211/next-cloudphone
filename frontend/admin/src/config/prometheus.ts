export const PROMETHEUS_CONFIG = {
  prometheusUrl: 'http://localhost:9090',
  grafanaUrl: 'http://localhost:3000',
  defaultRefreshInterval: '5s',
};

export const GRAFANA_DASHBOARDS = [
  {
    id: 'device-overview',
    title: '设备概览',
    url: 'http://localhost:3000/d/device-overview',
    iframeSrc: 'http://localhost:3000/d-solo/device-overview?orgId=1&refresh=5s&theme=light&panelId=1',
    description: '设备运行状态、资源使用情况总览',
  },
  {
    id: 'service-metrics',
    title: '服务指标',
    url: 'http://localhost:3000/d/service-metrics',
    iframeSrc: 'http://localhost:3000/d-solo/service-metrics?orgId=1&refresh=5s&theme=light&panelId=1',
    description: 'API请求量、响应时间、错误率等服务指标',
  },
  {
    id: 'resource-usage',
    title: '资源使用',
    url: 'http://localhost:3000/d/resource-usage',
    iframeSrc: 'http://localhost:3000/d-solo/resource-usage?orgId=1&refresh=5s&theme=light&panelId=1',
    description: 'CPU、内存、磁盘、网络等资源使用趋势',
  },
  {
    id: 'database-metrics',
    title: '数据库监控',
    url: 'http://localhost:3000/d/database-metrics',
    iframeSrc: 'http://localhost:3000/d-solo/database-metrics?orgId=1&refresh=5s&theme=light&panelId=1',
    description: 'PostgreSQL、Redis连接数、查询性能等',
  },
];

export const KEY_METRICS = [
  {
    title: '系统请求量（QPS）',
    iframeSrc: 'http://localhost:3000/d-solo/system-overview?orgId=1&refresh=5s&theme=light&panelId=2',
  },
  {
    title: '平均响应时间',
    iframeSrc: 'http://localhost:3000/d-solo/system-overview?orgId=1&refresh=5s&theme=light&panelId=3',
  },
  {
    title: 'CPU使用率',
    iframeSrc: 'http://localhost:3000/d-solo/resource-usage?orgId=1&refresh=5s&theme=light&panelId=4',
  },
  {
    title: '内存使用率',
    iframeSrc: 'http://localhost:3000/d-solo/resource-usage?orgId=1&refresh=5s&theme=light&panelId=5',
  },
];
