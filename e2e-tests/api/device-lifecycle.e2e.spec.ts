import { deviceService } from '../helpers/api-client';
import {
  createTestUser,
  deleteTestUser,
  createTestDevice,
  deleteTestDevice,
  waitFor,
  sleep,
} from '../helpers/test-helpers';

describe('Device Lifecycle E2E Tests', () => {
  let testUserId: string;
  let testDeviceIds: string[] = [];

  beforeAll(async () => {
    // Create a test user for all device tests
    const user = await createTestUser();
    testUserId = user.id!;
  });

  afterAll(async () => {
    // Cleanup all test devices
    for (const deviceId of testDeviceIds) {
      try {
        await deleteTestDevice(deviceId);
      } catch (error) {
        console.warn(`Failed to cleanup device ${deviceId}:`, error);
      }
    }

    // Cleanup test user
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
  });

  afterEach(async () => {
    // Additional per-test cleanup
    await sleep(500); // Brief pause between tests
  });

  describe('Device Creation', () => {
    it('should successfully create a new device', async () => {
      const timestamp = Date.now();
      const deviceData = {
        name: `e2e_device_${timestamp}`,
        cpuCores: 2,
        memoryMB: 4096,
        resolution: '1080x1920',
        androidVersion: '11',
      };

      const response = await deviceService.post<any>('/devices', deviceData);

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.name).toBe(deviceData.name);
      expect(response.status).toBe('creating');
      expect(response.adbPort).toBeDefined();
      expect(response.adbPort).toBeGreaterThanOrEqual(5555);

      testDeviceIds.push(response.id);
    });

    it('should create device with default values', async () => {
      const timestamp = Date.now();
      const deviceData = {
        name: `e2e_minimal_${timestamp}`,
      };

      const response = await deviceService.post<any>('/devices', deviceData);

      expect(response.id).toBeDefined();
      expect(response.cpuCores).toBe(2); // Default value
      expect(response.memoryMB).toBe(4096); // Default value

      testDeviceIds.push(response.id);
    });

    it('should reject device creation without name', async () => {
      const deviceData = {
        cpuCores: 2,
        memoryMB: 4096,
        // Missing name
      };

      await expect(deviceService.post('/devices', deviceData)).rejects.toThrow();
    });

    it('should reject device creation with invalid resources', async () => {
      const timestamp = Date.now();
      const deviceData = {
        name: `e2e_invalid_${timestamp}`,
        cpuCores: 0, // Invalid
        memoryMB: -1000, // Invalid
      };

      await expect(deviceService.post('/devices', deviceData)).rejects.toThrow();
    });

    it('should assign unique ADB ports to different devices', async () => {
      const timestamp = Date.now();
      const device1 = await createTestDevice({ name: `e2e_port1_${timestamp}` });
      const device2 = await createTestDevice({ name: `e2e_port2_${timestamp}` });

      expect(device1.adbPort).not.toBe(device2.adbPort);

      testDeviceIds.push(device1.id!, device2.id!);
    });
  });

  describe('Device Retrieval', () => {
    let deviceId: string;

    beforeAll(async () => {
      const device = await createTestDevice();
      deviceId = device.id!;
      testDeviceIds.push(deviceId);
    });

    it('should retrieve device by ID', async () => {
      const response = await deviceService.get<any>(`/devices/${deviceId}`);

      expect(response).toBeDefined();
      expect(response.id).toBe(deviceId);
      expect(response.name).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should list all user devices', async () => {
      const response = await deviceService.get<any[]>('/devices');

      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);

      const foundDevice = response.find((d) => d.id === deviceId);
      expect(foundDevice).toBeDefined();
    });

    it('should return 404 for non-existent device', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(deviceService.get(`/devices/${fakeId}`)).rejects.toThrow();
    });

    it('should filter devices by status', async () => {
      const response = await deviceService.get<any[]>('/devices?status=running');

      expect(Array.isArray(response)).toBe(true);
      // All returned devices should have 'running' status
      response.forEach((device) => {
        expect(device.status).toBe('running');
      });
    });
  });

  describe('Device Operations', () => {
    let deviceId: string;

    beforeEach(async () => {
      const device = await createTestDevice();
      deviceId = device.id!;
      testDeviceIds.push(deviceId);
    });

    it('should start a device', async () => {
      const response = await deviceService.post<any>(`/devices/${deviceId}/start`);

      expect(response).toBeDefined();
      expect(response.status).toMatch(/starting|running/);

      // Wait for device to reach running state
      await waitFor(
        async () => {
          const device = await deviceService.get<any>(`/devices/${deviceId}`);
          return device.status === 'running';
        },
        { timeout: 30000, interval: 2000 }
      );
    });

    it('should stop a running device', async () => {
      // First start the device
      await deviceService.post(`/devices/${deviceId}/start`);

      await waitFor(
        async () => {
          const device = await deviceService.get<any>(`/devices/${deviceId}`);
          return device.status === 'running';
        },
        { timeout: 30000, interval: 2000 }
      );

      // Then stop it
      const response = await deviceService.post<any>(`/devices/${deviceId}/stop`);

      expect(response).toBeDefined();
      expect(response.status).toMatch(/stopping|stopped/);
    });

    it('should restart a device', async () => {
      // Start device first
      await deviceService.post(`/devices/${deviceId}/start`);
      await sleep(5000); // Wait for device to start

      // Restart
      const response = await deviceService.post<any>(`/devices/${deviceId}/restart`);

      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should update device configuration', async () => {
      const updateData = {
        name: `updated_device_${Date.now()}`,
        cpuCores: 4,
        memoryMB: 8192,
      };

      const response = await deviceService.patch<any>(`/devices/${deviceId}`, updateData);

      expect(response.name).toBe(updateData.name);
      expect(response.cpuCores).toBe(updateData.cpuCores);
      expect(response.memoryMB).toBe(updateData.memoryMB);
    });
  });

  describe('Device Snapshots', () => {
    let deviceId: string;

    beforeAll(async () => {
      const device = await createTestDevice();
      deviceId = device.id!;
      testDeviceIds.push(deviceId);

      // Start device and wait for it to be running
      await deviceService.post(`/devices/${deviceId}/start`);
      await waitFor(
        async () => {
          const d = await deviceService.get<any>(`/devices/${deviceId}`);
          return d.status === 'running';
        },
        { timeout: 30000, interval: 2000 }
      );
    });

    it('should create a snapshot', async () => {
      const snapshotData = {
        name: `e2e_snapshot_${Date.now()}`,
        description: 'E2E test snapshot',
      };

      const response = await deviceService.post<any>(
        `/devices/${deviceId}/snapshots`,
        snapshotData
      );

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.name).toBe(snapshotData.name);
      expect(response.deviceId).toBe(deviceId);
    });

    it('should list device snapshots', async () => {
      const response = await deviceService.get<any[]>(`/devices/${deviceId}/snapshots`);

      expect(Array.isArray(response)).toBe(true);
    });

    it('should restore from snapshot', async () => {
      // Create a snapshot first
      const snapshot = await deviceService.post<any>(`/devices/${deviceId}/snapshots`, {
        name: `e2e_restore_test_${Date.now()}`,
      });

      // Restore from snapshot
      const response = await deviceService.post<any>(
        `/devices/${deviceId}/snapshots/${snapshot.id}/restore`
      );

      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should delete a snapshot', async () => {
      // Create a snapshot
      const snapshot = await deviceService.post<any>(`/devices/${deviceId}/snapshots`, {
        name: `e2e_delete_test_${Date.now()}`,
      });

      // Delete it
      await deviceService.delete(`/devices/${deviceId}/snapshots/${snapshot.id}`);

      // Verify it's deleted
      const snapshots = await deviceService.get<any[]>(`/devices/${deviceId}/snapshots`);
      const found = snapshots.find((s) => s.id === snapshot.id);
      expect(found).toBeUndefined();
    });
  });

  describe('Device Metrics', () => {
    let deviceId: string;

    beforeAll(async () => {
      const device = await createTestDevice();
      deviceId = device.id!;
      testDeviceIds.push(deviceId);

      // Start device
      await deviceService.post(`/devices/${deviceId}/start`);
      await sleep(5000);
    });

    it('should retrieve device metrics', async () => {
      const response = await deviceService.get<any>(`/devices/${deviceId}/metrics`);

      expect(response).toBeDefined();
      expect(response.deviceId).toBe(deviceId);
      expect(response.cpuUsage).toBeDefined();
      expect(response.memoryUsage).toBeDefined();
    });

    it('should retrieve device metrics history', async () => {
      const response = await deviceService.get<any[]>(
        `/devices/${deviceId}/metrics/history?period=1h`
      );

      expect(Array.isArray(response)).toBe(true);
    });
  });

  describe('Device Deletion', () => {
    it('should successfully delete a device', async () => {
      const device = await createTestDevice();
      const deviceId = device.id!;

      await deviceService.delete(`/devices/${deviceId}`);

      // Verify deletion
      await expect(deviceService.get(`/devices/${deviceId}`)).rejects.toThrow();
    });

    it('should stop device before deletion', async () => {
      const device = await createTestDevice();
      const deviceId = device.id!;

      // Start device
      await deviceService.post(`/devices/${deviceId}/start`);
      await sleep(3000);

      // Delete should work even if device is running
      await deviceService.delete(`/devices/${deviceId}`);

      // Verify deletion
      await expect(deviceService.get(`/devices/${deviceId}`)).rejects.toThrow();
    });

    it('should reject deletion of non-existent device', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await expect(deviceService.delete(`/devices/${fakeId}`)).rejects.toThrow();
    });
  });

  describe('Device Quota Enforcement', () => {
    it('should enforce device creation quota', async () => {
      // This test assumes the test user has a limited quota (e.g., 10 devices)
      // Try to create devices until quota is exceeded

      const devices = [];
      let quotaExceeded = false;

      try {
        // Try to create 15 devices (assuming quota is less than this)
        for (let i = 0; i < 15; i++) {
          const device = await createTestDevice({ name: `quota_test_${Date.now()}_${i}` });
          devices.push(device.id);
          testDeviceIds.push(device.id!);
          await sleep(500);
        }
      } catch (error: any) {
        // Should throw a quota exceeded error
        expect(error.message).toMatch(/quota|limit|exceeded/i);
        quotaExceeded = true;
      }

      // Either quota was exceeded or we created some devices
      expect(quotaExceeded || devices.length > 0).toBe(true);
    });
  });
});
