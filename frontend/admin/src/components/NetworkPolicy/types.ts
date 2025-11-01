/**
 * 网络策略接口
 */
export interface NetworkPolicy {
  id: string;
  name: string;
  description?: string;
  direction: string;
  protocol?: string;
  sourceIp?: string;
  destIp?: string;
  destPort?: string;
  action: string;
  priority: number;
  isEnabled: boolean;
  bandwidthLimit?: number;
  createdAt: string;
}

/**
 * 策略表单值
 */
export interface PolicyFormValues {
  name: string;
  description?: string;
  direction: string;
  protocol: string;
  sourceIp?: string;
  destIp?: string;
  destPort?: string;
  action: string;
  priority: number;
  isEnabled: boolean;
  bandwidthLimit?: number;
}

/**
 * 测试表单值
 */
export interface TestFormValues {
  targetIp: string;
  port?: number;
  protocol: string;
}

/**
 * 测试结果
 */
export interface TestResult {
  connected: boolean;
  latency: number;
  bandwidth: number;
}
