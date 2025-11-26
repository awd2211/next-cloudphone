/**
 * 模拟 API 服务
 * 所有数据都是模拟的，用于演示目的
 */

import type {
  Device,
  CreateDeviceDto,
  DeviceStats,
  ProxyConfig,
  ProxyStats,
  AcquireProxyDto,
  VerificationCode,
  VerificationCodeQuery,
  PaginatedResponse,
  PaginationParams,
  LoginDto,
  LoginResponse,
  User,
} from '@/types';

// 模拟延迟
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 生成随机ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// 设备状态分布配置
const STATUS_DISTRIBUTION = {
  running: 70,  // 70% 运行中
  stopped: 20,  // 20% 已停止
  error: 10,    // 10% 异常
};

// Android 版本列表
const ANDROID_VERSIONS = ['11.0', '12.0', '13.0', '14.0'];

// 配置规格列表
const SPECS = [
  { cpuCores: 4, memoryMB: 4096, storageMB: 32768 },
  { cpuCores: 8, memoryMB: 8192, storageMB: 65536 },
  { cpuCores: 8, memoryMB: 8192, storageMB: 131072 },
  { cpuCores: 16, memoryMB: 16384, storageMB: 262144 },
];

// 生成100台设备的模拟数据
const generateMockDevices = (count: number): Device[] => {
  const devices: Device[] = [];
  const now = new Date();

  for (let i = 1; i <= count; i++) {
    // 根据分布确定状态
    const rand = Math.random() * 100;
    let status: 'running' | 'stopped' | 'error';
    if (rand < STATUS_DISTRIBUTION.running) {
      status = 'running';
    } else if (rand < STATUS_DISTRIBUTION.running + STATUS_DISTRIBUTION.stopped) {
      status = 'stopped';
    } else {
      status = 'error';
    }

    const spec = SPECS[Math.floor(Math.random() * SPECS.length)];
    const androidVersion = ANDROID_VERSIONS[Math.floor(Math.random() * ANDROID_VERSIONS.length)];
    const deviceNumber = String(i).padStart(3, '0');

    // 生成创建时间（过去30天内随机）
    const createdAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(createdAt.getTime() + Math.random() * (now.getTime() - createdAt.getTime()));

    const device: Device = {
      id: `dev-${deviceNumber}`,
      name: `CloudPhone-${deviceNumber}`,
      status,
      androidVersion,
      cpuCores: spec.cpuCores,
      memoryMB: spec.memoryMB,
      storageMB: spec.storageMB,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      userId: 'user-001',
      tenantId: 'gov-tenant',
    };

    // 运行中的设备添加网络信息
    if (status === 'running') {
      device.adbHost = `192.168.1.${100 + i}`;
      device.adbPort = 5555 + i;
      device.containerIp = `172.17.0.${i + 1}`;
      device.lastActiveAt = updatedAt.toISOString();

      // 30% 的运行中设备配置代理
      if (Math.random() < 0.3) {
        device.proxyId = `proxy-00${Math.floor(Math.random() * 4) + 1}`;
      }
    }

    devices.push(device);
  }

  return devices;
};

// ============ 模拟数据存储 ============
let mockDevices: Device[] = generateMockDevices(100);

// 30个国家的家宽代理配置
const PROXY_COUNTRIES = [
  { country: '美国', city: '洛杉矶', code: 'US', latencyBase: 180 },
  { country: '美国', city: '纽约', code: 'US', latencyBase: 200 },
  { country: '美国', city: '芝加哥', code: 'US', latencyBase: 190 },
  { country: '日本', city: '东京', code: 'JP', latencyBase: 80 },
  { country: '日本', city: '大阪', code: 'JP', latencyBase: 85 },
  { country: '韩国', city: '首尔', code: 'KR', latencyBase: 70 },
  { country: '新加坡', city: '新加坡', code: 'SG', latencyBase: 60 },
  { country: '香港', city: '香港', code: 'HK', latencyBase: 45 },
  { country: '台湾', city: '台北', code: 'TW', latencyBase: 55 },
  { country: '英国', city: '伦敦', code: 'GB', latencyBase: 220 },
  { country: '德国', city: '法兰克福', code: 'DE', latencyBase: 230 },
  { country: '德国', city: '柏林', code: 'DE', latencyBase: 235 },
  { country: '法国', city: '巴黎', code: 'FR', latencyBase: 225 },
  { country: '荷兰', city: '阿姆斯特丹', code: 'NL', latencyBase: 228 },
  { country: '瑞士', city: '苏黎世', code: 'CH', latencyBase: 232 },
  { country: '加拿大', city: '多伦多', code: 'CA', latencyBase: 195 },
  { country: '加拿大', city: '温哥华', code: 'CA', latencyBase: 175 },
  { country: '澳大利亚', city: '悉尼', code: 'AU', latencyBase: 150 },
  { country: '澳大利亚', city: '墨尔本', code: 'AU', latencyBase: 155 },
  { country: '巴西', city: '圣保罗', code: 'BR', latencyBase: 280 },
  { country: '印度', city: '孟买', code: 'IN', latencyBase: 120 },
  { country: '印度', city: '新德里', code: 'IN', latencyBase: 130 },
  { country: '俄罗斯', city: '莫斯科', code: 'RU', latencyBase: 180 },
  { country: '意大利', city: '米兰', code: 'IT', latencyBase: 235 },
  { country: '西班牙', city: '马德里', code: 'ES', latencyBase: 240 },
  { country: '墨西哥', city: '墨西哥城', code: 'MX', latencyBase: 210 },
  { country: '印度尼西亚', city: '雅加达', code: 'ID', latencyBase: 95 },
  { country: '泰国', city: '曼谷', code: 'TH', latencyBase: 75 },
  { country: '越南', city: '胡志明市', code: 'VN', latencyBase: 65 },
  { country: '马来西亚', city: '吉隆坡', code: 'MY', latencyBase: 70 },
  { country: '菲律宾', city: '马尼拉', code: 'PH', latencyBase: 85 },
  { country: '阿联酋', city: '迪拜', code: 'AE', latencyBase: 160 },
  { country: '土耳其', city: '伊斯坦布尔', code: 'TR', latencyBase: 190 },
  { country: '波兰', city: '华沙', code: 'PL', latencyBase: 225 },
  { country: '瑞典', city: '斯德哥尔摩', code: 'SE', latencyBase: 240 },
];

// 代理提供商列表
const PROXY_PROVIDERS = ['IPIDEA', 'Luminati', 'SmartProxy', 'Oxylabs', '911S5', 'IPRoyal', 'Bright Data'];

// 生成家宽代理数据
const generateMockProxies = (): ProxyConfig[] => {
  const proxies: ProxyConfig[] = [];
  const now = new Date();

  PROXY_COUNTRIES.forEach((loc, index) => {
    // 每个地区生成2-4个代理
    const proxyCount = Math.floor(Math.random() * 3) + 2;

    for (let i = 0; i < proxyCount; i++) {
      const proxyNumber = String(proxies.length + 1).padStart(3, '0');
      const provider = PROXY_PROVIDERS[Math.floor(Math.random() * PROXY_PROVIDERS.length)];
      const quality = Math.floor(Math.random() * 25 + 75); // 75-100
      const latency = loc.latencyBase + Math.floor(Math.random() * 50 - 25); // ±25ms波动

      // 60% available, 30% in_use, 10% expired
      const statusRand = Math.random();
      let status: 'available' | 'in_use' | 'expired';
      if (statusRand < 0.6) {
        status = 'available';
      } else if (statusRand < 0.9) {
        status = 'in_use';
      } else {
        status = 'expired';
      }

      const acquiredAt = new Date(now.getTime() - Math.random() * 20 * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(acquiredAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      proxies.push({
        id: `proxy-${proxyNumber}`,
        host: `${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        port: [1080, 3128, 8080, 8888, 9050][Math.floor(Math.random() * 5)],
        username: `user_${loc.code.toLowerCase()}_${i + 1}`,
        password: '******',
        protocol: ['socks5', 'http', 'https'][Math.floor(Math.random() * 3)] as 'socks5' | 'http' | 'https',
        country: loc.country,
        city: loc.city,
        provider,
        quality,
        latency: Math.max(30, latency), // 最低30ms
        status,
        acquiredAt: acquiredAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });
    }
  });

  return proxies;
};

let mockProxies: ProxyConfig[] = generateMockProxies();

let mockSMSCodes: VerificationCode[] = [
  {
    id: 'sms-001',
    phone: '+1 (555) 123-4567',
    code: '485923',
    codeType: 'register',
    sender: 'Google',
    content: '您的Google验证码是：485923，有效期5分钟，请勿泄露给他人。',
    receivedAt: '2024-01-20T10:30:00Z',
    used: false,
  },
  {
    id: 'sms-002',
    phone: '+1 (555) 234-5678',
    code: '736159',
    codeType: 'login',
    sender: 'Facebook',
    content: '736159 is your Facebook code. Don\'t share it.',
    receivedAt: '2024-01-20T10:25:00Z',
    used: false,
  },
  {
    id: 'sms-003',
    phone: '+44 7700 900123',
    code: '918274',
    codeType: 'verify',
    sender: 'Twitter',
    content: 'Your Twitter verification code is 918274',
    receivedAt: '2024-01-20T10:20:00Z',
    used: true,
  },
  {
    id: 'sms-004',
    phone: '+81 90-1234-5678',
    code: '562847',
    codeType: 'register',
    sender: 'Line',
    content: '認証コード：562847 Lineの登録に使用してください。',
    receivedAt: '2024-01-20T10:15:00Z',
    used: false,
  },
  {
    id: 'sms-005',
    phone: '+1 (555) 123-4567',
    code: '293847',
    codeType: 'password_reset',
    sender: 'Amazon',
    content: 'Your Amazon OTP is 293847. Valid for 10 minutes.',
    receivedAt: '2024-01-20T10:10:00Z',
    used: true,
  },
  {
    id: 'sms-006',
    phone: '+49 151 12345678',
    code: '847291',
    codeType: 'verify',
    sender: 'WhatsApp',
    content: 'Ihr WhatsApp-Code lautet: 847291',
    receivedAt: '2024-01-20T10:05:00Z',
    used: false,
  },
];

// ============ 认证 API ============
export const authApi = {
  login: async (data: LoginDto): Promise<LoginResponse> => {
    await delay(500);
    // 模拟登录验证
    if (data.username === 'admin' && data.password === 'admin123') {
      const user: User = {
        id: 'user-001',
        username: 'admin',
        email: 'admin@gov.cn',
        roles: ['admin'],
        tenantId: 'gov-tenant',
      };
      return {
        access_token: 'mock-jwt-token-' + generateId(),
        user,
      };
    }
    throw new Error('用户名或密码错误');
  },
  logout: async (): Promise<void> => {
    await delay(200);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  me: async (): Promise<User> => {
    await delay(200);
    return {
      id: 'user-001',
      username: 'admin',
      email: 'admin@gov.cn',
      roles: ['admin'],
      tenantId: 'gov-tenant',
    };
  },
};

// ============ 设备 API ============
export const deviceApi = {
  list: async (params?: PaginationParams): Promise<PaginatedResponse<Device>> => {
    await delay(300);
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: mockDevices.slice(start, end),
      total: mockDevices.length,
      page,
      pageSize,
    };
  },
  get: async (id: string): Promise<Device> => {
    await delay(200);
    const device = mockDevices.find((d) => d.id === id);
    if (!device) throw new Error('设备不存在');
    return device;
  },
  create: async (data: CreateDeviceDto): Promise<Device> => {
    await delay(500);
    const newDevice: Device = {
      id: 'dev-' + generateId(),
      name: data.name,
      status: 'stopped',
      androidVersion: data.androidVersion || '11.0',
      cpuCores: data.cpuCores || 4,
      memoryMB: data.memoryMB || 4096,
      storageMB: data.storageMB || 32768,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: 'user-001',
      tenantId: 'gov-tenant',
    };
    mockDevices.unshift(newDevice);
    return newDevice;
  },
  delete: async (id: string): Promise<void> => {
    await delay(300);
    mockDevices = mockDevices.filter((d) => d.id !== id);
  },
  start: async (id: string): Promise<Device> => {
    await delay(800);
    const device = mockDevices.find((d) => d.id === id);
    if (!device) throw new Error('设备不存在');
    device.status = 'running';
    device.updatedAt = new Date().toISOString();
    device.lastActiveAt = new Date().toISOString();
    device.adbHost = '192.168.1.' + Math.floor(Math.random() * 100 + 100);
    device.adbPort = 5555 + mockDevices.indexOf(device);
    device.containerIp = '172.17.0.' + (mockDevices.indexOf(device) + 2);
    return device;
  },
  stop: async (id: string): Promise<Device> => {
    await delay(500);
    const device = mockDevices.find((d) => d.id === id);
    if (!device) throw new Error('设备不存在');
    device.status = 'stopped';
    device.updatedAt = new Date().toISOString();
    device.adbHost = undefined;
    device.adbPort = undefined;
    device.containerIp = undefined;
    return device;
  },
  reboot: async (id: string): Promise<Device> => {
    await delay(1000);
    const device = mockDevices.find((d) => d.id === id);
    if (!device) throw new Error('设备不存在');
    device.status = 'running';
    device.updatedAt = new Date().toISOString();
    device.lastActiveAt = new Date().toISOString();
    return device;
  },
  stats: async (): Promise<DeviceStats> => {
    await delay(200);
    return {
      total: mockDevices.length,
      running: mockDevices.filter((d) => d.status === 'running').length,
      stopped: mockDevices.filter((d) => d.status === 'stopped').length,
      error: mockDevices.filter((d) => d.status === 'error').length,
    };
  },
  setProxy: async (deviceId: string, proxyId: string): Promise<Device> => {
    await delay(400);
    const device = mockDevices.find((d) => d.id === deviceId);
    if (!device) throw new Error('设备不存在');
    const proxy = mockProxies.find((p) => p.id === proxyId);
    if (!proxy) throw new Error('代理不存在');
    device.proxyId = proxyId;
    device.proxyConfig = proxy;
    proxy.status = 'in_use';
    return device;
  },
  removeProxy: async (deviceId: string): Promise<Device> => {
    await delay(300);
    const device = mockDevices.find((d) => d.id === deviceId);
    if (!device) throw new Error('设备不存在');
    if (device.proxyId) {
      const proxy = mockProxies.find((p) => p.id === device.proxyId);
      if (proxy) proxy.status = 'available';
    }
    device.proxyId = undefined;
    device.proxyConfig = undefined;
    return device;
  },
};

// ============ 代理 API ============
export const proxyApi = {
  list: async (params?: PaginationParams): Promise<PaginatedResponse<ProxyConfig>> => {
    await delay(300);
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: mockProxies.slice(start, end),
      total: mockProxies.length,
      page,
      pageSize,
    };
  },
  stats: async (): Promise<ProxyStats> => {
    await delay(200);
    return {
      total: mockProxies.length,
      active: mockProxies.filter((p) => p.status === 'in_use').length,
      expired: 0,
      totalBandwidthUsed: 12845,
    };
  },
  acquire: async (data: AcquireProxyDto): Promise<ProxyConfig> => {
    await delay(600);
    const newProxy: ProxyConfig = {
      id: 'proxy-' + generateId(),
      host: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      port: Math.floor(Math.random() * 10000 + 1024),
      protocol: data.protocol || 'socks5',
      country: data.country,
      provider: 'IPIDEA',
      quality: Math.floor(Math.random() * 20 + 80),
      latency: Math.floor(Math.random() * 200 + 50),
      status: 'available',
      acquiredAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockProxies.unshift(newProxy);
    return newProxy;
  },
  release: async (id: string): Promise<void> => {
    await delay(300);
    mockProxies = mockProxies.filter((p) => p.id !== id);
  },
  test: async (id: string): Promise<{ latency: number; success: boolean }> => {
    await delay(1000);
    const proxy = mockProxies.find((p) => p.id === id);
    if (!proxy) throw new Error('代理不存在');
    return {
      latency: Math.floor(Math.random() * 200 + 50),
      success: Math.random() > 0.1,
    };
  },
};

// ============ 短信验证码 API ============
export const smsApi = {
  list: async (params?: PaginationParams): Promise<PaginatedResponse<VerificationCode>> => {
    await delay(300);
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      data: mockSMSCodes.slice(start, end),
      total: mockSMSCodes.length,
      page,
      pageSize,
    };
  },
  queryByPhone: async (phone: string): Promise<VerificationCodeQuery> => {
    await delay(400);
    const code = mockSMSCodes.find((c) => c.phone.includes(phone) && !c.used);
    if (code) {
      return {
        phoneNumber: code.phone,
        hasActive: true,
        type: code.codeType,
        remainingSeconds: Math.floor(Math.random() * 300 + 60),
      };
    }
    return {
      phoneNumber: phone,
      hasActive: false,
    };
  },
  markUsed: async (id: string): Promise<void> => {
    await delay(200);
    const code = mockSMSCodes.find((c) => c.id === id);
    if (code) code.used = true;
  },
};

export default {
  auth: authApi,
  device: deviceApi,
  proxy: proxyApi,
  sms: smsApi,
};
