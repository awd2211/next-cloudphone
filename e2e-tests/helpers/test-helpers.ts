import { apiGateway, userService, deviceService, billingService } from './api-client';

export interface TestUser {
  id?: string;
  username: string;
  email: string;
  password: string;
  token?: string;
}

export interface TestDevice {
  id?: string;
  name: string;
  status?: string;
  adbPort?: number;
}

/**
 * Create a test user and automatically login
 */
export async function createTestUser(userData?: Partial<TestUser>): Promise<TestUser> {
  const timestamp = Date.now();
  const user: TestUser = {
    username: userData?.username || `e2euser_${timestamp}`,
    email: userData?.email || `e2e_${timestamp}@test.com`,
    password: userData?.password || 'TestPassword123!',
  };

  try {
    // Register user
    const registerResponse = await userService.post<{ user: any }>('/auth/register', {
      username: user.username,
      email: user.email,
      password: user.password,
      fullName: `E2E Test User ${timestamp}`,
    });

    user.id = registerResponse.user?.id;

    // Login to get token
    const loginResponse = await userService.post<{ access_token: string; user: any }>(
      '/auth/login',
      {
        username: user.username,
        password: user.password,
      },
    );

    user.token = loginResponse.access_token;
    user.id = loginResponse.user?.id || user.id;

    // Set token for subsequent requests
    userService.setToken(user.token!);
    deviceService.setToken(user.token!);
    billingService.setToken(user.token!);
    apiGateway.setToken(user.token!);

    return user;
  } catch (error: any) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }
}

/**
 * Login with existing credentials
 */
export async function loginUser(username: string, password: string): Promise<string> {
  const response = await userService.post<{ access_token: string }>('/auth/login', {
    username,
    password,
  });

  const token = response.access_token;

  // Set token for all services
  userService.setToken(token);
  deviceService.setToken(token);
  billingService.setToken(token);
  apiGateway.setToken(token);

  return token;
}

/**
 * Create a test device
 */
export async function createTestDevice(deviceData?: Partial<TestDevice>): Promise<TestDevice> {
  const timestamp = Date.now();
  const device: TestDevice = {
    name: deviceData?.name || `e2e_device_${timestamp}`,
    ...deviceData,
  };

  const response = await deviceService.post<{ id: string; name: string; status: string; adbPort: number }>(
    '/devices',
    {
      name: device.name,
      cpuCores: 2,
      memoryMB: 4096,
      resolution: '1080x1920',
      androidVersion: '11',
    },
  );

  return {
    id: response.id,
    name: response.name,
    status: response.status,
    adbPort: response.adbPort,
  };
}

/**
 * Delete a test device
 */
export async function deleteTestDevice(deviceId: string): Promise<void> {
  try {
    await deviceService.delete(`/devices/${deviceId}`);
  } catch (error) {
    console.warn(`Failed to delete test device ${deviceId}:`, error);
  }
}

/**
 * Delete a test user
 */
export async function deleteTestUser(userId: string): Promise<void> {
  try {
    await userService.delete(`/users/${userId}`);
  } catch (error) {
    console.warn(`Failed to delete test user ${userId}:`, error);
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 10000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate random string
 */
export function randomString(length: number = 8): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}
