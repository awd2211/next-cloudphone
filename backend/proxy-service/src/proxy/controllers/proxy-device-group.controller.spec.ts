import { Test, TestingModule } from '@nestjs/testing';
import { ProxyDeviceGroupController } from './proxy-device-group.controller';
import { ProxyDeviceGroupService } from '../services/proxy-device-group.service';
import {
  CreateDeviceGroupDto,
  UpdateDeviceGroupDto,
  AddDeviceToGroupDto,
  BatchAddDevicesDto,
  AssignProxiesToGroupDto,
} from '../dto';

describe('ProxyDeviceGroupController', () => {
  let controller: ProxyDeviceGroupController;
  let deviceGroupService: any;

  const mockDeviceGroupService = {
    createDeviceGroup: jest.fn(),
    getUserGroups: jest.fn(),
    getGroupDetails: jest.fn(),
    updateGroup: jest.fn(),
    deleteGroup: jest.fn(),
    addDeviceToGroup: jest.fn(),
    addDevicesToGroup: jest.fn(),
    removeDeviceFromGroup: jest.fn(),
    getGroupDevices: jest.fn(),
    assignProxiesToGroup: jest.fn(),
    getGroupProxies: jest.fn(),
    getGroupStats: jest.fn(),
    updateGroupStats: jest.fn(),
    autoScaleGroupProxies: jest.fn(),
  };

  const mockRequest = {
    user: {
      sub: 'user-123',
    },
  };

  const mockDeviceGroup = {
    id: 'group-123',
    name: 'Test Group',
    userId: 'user-123',
    description: 'Test device group',
    maxDevices: 100,
    dedicatedProxies: true,
    autoScaling: true,
    createdAt: new Date('2025-01-06T00:00:00.000Z'),
    updatedAt: new Date('2025-01-06T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProxyDeviceGroupController],
      providers: [
        {
          provide: ProxyDeviceGroupService,
          useValue: mockDeviceGroupService,
        },
      ],
    }).compile();

    controller = module.get<ProxyDeviceGroupController>(
      ProxyDeviceGroupController,
    );
    deviceGroupService = module.get(ProxyDeviceGroupService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createDeviceGroup', () => {
    it('should create a device group', async () => {
      const dto: CreateDeviceGroupDto = {
        name: 'Test Group',
        description: 'Test description',
        maxDevices: 100,
        dedicatedProxies: true,
        autoScaling: true,
      };

      mockDeviceGroupService.createDeviceGroup.mockResolvedValue(
        mockDeviceGroup,
      );

      const result = await controller.createDeviceGroup(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDeviceGroup);
      expect(result.message).toBe('Device group created');
      expect(deviceGroupService.createDeviceGroup).toHaveBeenCalledWith({
        ...dto,
        userId: 'user-123',
      });
    });

    it('should create group with minimal config', async () => {
      const dto: CreateDeviceGroupDto = {
        name: 'Minimal Group',
      };

      const mockMinimalGroup = {
        ...mockDeviceGroup,
        name: 'Minimal Group',
      };

      mockDeviceGroupService.createDeviceGroup.mockResolvedValue(
        mockMinimalGroup,
      );

      const result = await controller.createDeviceGroup(mockRequest, dto);

      expect(result.data.name).toBe('Minimal Group');
      expect(deviceGroupService.createDeviceGroup).toHaveBeenCalledWith({
        ...dto,
        userId: 'user-123',
      });
    });

    it('should create group with optional fields', async () => {
      const dto: CreateDeviceGroupDto = {
        name: 'Advanced Group',
        preferredProviders: ['Provider1', 'Provider2'],
        preferredCountries: ['US', 'UK'],
        dailyCostLimit: 100.0,
        minQualityScore: 85.0,
      };

      mockDeviceGroupService.createDeviceGroup.mockResolvedValue({
        ...mockDeviceGroup,
        ...dto,
      });

      const result = await controller.createDeviceGroup(mockRequest, dto);

      expect(result.success).toBe(true);
      expect(deviceGroupService.createDeviceGroup).toHaveBeenCalledWith({
        ...dto,
        userId: 'user-123',
      });
    });
  });

  describe('getUserGroups', () => {
    it('should return user device groups', async () => {
      const mockGroups = [
        { ...mockDeviceGroup, id: 'group-1', name: 'Group 1' },
        { ...mockDeviceGroup, id: 'group-2', name: 'Group 2' },
        { ...mockDeviceGroup, id: 'group-3', name: 'Group 3' },
      ];

      mockDeviceGroupService.getUserGroups.mockResolvedValue(mockGroups);

      const result = await controller.getUserGroups(mockRequest);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(deviceGroupService.getUserGroups).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array for user with no groups', async () => {
      mockDeviceGroupService.getUserGroups.mockResolvedValue([]);

      const result = await controller.getUserGroups(mockRequest);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getGroupDetails', () => {
    it('should return group details', async () => {
      const groupId = 'group-123';
      const mockDetails = {
        group: mockDeviceGroup,
        devices: [],
        proxies: [],
        stats: {
          deviceCount: 50,
          proxyCount: 150,
        },
      };

      mockDeviceGroupService.getGroupDetails.mockResolvedValue(mockDetails);

      const result = await controller.getGroupDetails(groupId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDetails);
      expect(result.data.group).toEqual(mockDeviceGroup);
      expect(deviceGroupService.getGroupDetails).toHaveBeenCalledWith(groupId);
    });

    it('should return details with empty collections', async () => {
      const mockDetails = {
        group: mockDeviceGroup,
        devices: [],
        proxies: [],
        stats: null,
      };

      mockDeviceGroupService.getGroupDetails.mockResolvedValue(mockDetails);

      const result = await controller.getGroupDetails('group-empty');

      expect(result.data.devices).toHaveLength(0);
      expect(result.data.proxies).toHaveLength(0);
    });
  });

  describe('updateGroup', () => {
    it('should update device group', async () => {
      const groupId = 'group-123';
      const dto: UpdateDeviceGroupDto = {
        name: 'Updated Group',
        maxDevices: 200,
        autoScaling: false,
      };

      const mockUpdatedGroup = {
        ...mockDeviceGroup,
        ...dto,
      };

      mockDeviceGroupService.updateGroup.mockResolvedValue(mockUpdatedGroup);

      const result = await controller.updateGroup(groupId, dto);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Group');
      expect(result.data.autoScaling).toBe(false);
      expect(result.message).toBe('Device group updated');
      expect(deviceGroupService.updateGroup).toHaveBeenCalledWith(groupId, dto);
    });

    it('should update single field', async () => {
      const groupId = 'group-123';
      const dto: UpdateDeviceGroupDto = {
        description: 'New description',
      };

      mockDeviceGroupService.updateGroup.mockResolvedValue({
        ...mockDeviceGroup,
        description: 'New description',
      });

      const result = await controller.updateGroup(groupId, dto);

      expect(result.data.description).toBe('New description');
    });

    it('should update status', async () => {
      const groupId = 'group-123';
      const dto: UpdateDeviceGroupDto = {
        status: 'paused',
      };

      mockDeviceGroupService.updateGroup.mockResolvedValue({
        ...mockDeviceGroup,
        status: 'paused',
      });

      const result = await controller.updateGroup(groupId, dto);

      expect(result.data.status).toBe('paused');
    });
  });

  describe('deleteGroup', () => {
    it('should delete device group', async () => {
      const groupId = 'group-123';

      mockDeviceGroupService.deleteGroup.mockResolvedValue(undefined);

      await controller.deleteGroup(groupId);

      expect(deviceGroupService.deleteGroup).toHaveBeenCalledWith(groupId);
    });

    it('should delete multiple groups sequentially', async () => {
      const groupIds = ['group-1', 'group-2', 'group-3'];

      mockDeviceGroupService.deleteGroup.mockResolvedValue(undefined);

      for (const id of groupIds) {
        await controller.deleteGroup(id);
      }

      expect(deviceGroupService.deleteGroup).toHaveBeenCalledTimes(3);
    });
  });

  describe('addDevice', () => {
    it('should add device to group', async () => {
      const groupId = 'group-123';
      const dto: AddDeviceToGroupDto = {
        deviceId: 'device-456',
      };

      const mockGroupDevice = {
        groupId: 'group-123',
        deviceId: 'device-456',
        joinedAt: new Date('2025-01-06T00:00:00.000Z'),
      };

      mockDeviceGroupService.addDeviceToGroup.mockResolvedValue(
        mockGroupDevice,
      );

      const result = await controller.addDevice(groupId, dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGroupDevice);
      expect(result.message).toBe('Device added to group');
      expect(deviceGroupService.addDeviceToGroup).toHaveBeenCalledWith(
        groupId,
        dto.deviceId,
      );
    });

    it('should add device with priority', async () => {
      const groupId = 'group-123';
      const dto: AddDeviceToGroupDto = {
        deviceId: 'device-789',
        priority: 8,
      };

      const mockGroupDevice = {
        groupId: 'group-123',
        deviceId: 'device-789',
        priority: 8,
        joinedAt: new Date(),
      };

      mockDeviceGroupService.addDeviceToGroup.mockResolvedValue(
        mockGroupDevice,
      );

      const result = await controller.addDevice(groupId, dto);

      expect(result.data.priority).toBe(8);
    });
  });

  describe('batchAddDevices', () => {
    it('should batch add devices to group', async () => {
      const groupId = 'group-123';
      const dto: BatchAddDevicesDto = {
        deviceIds: ['device-1', 'device-2', 'device-3'],
      };

      const mockResult = {
        success: 3,
        failed: 0,
        errors: [],
      };

      mockDeviceGroupService.addDevicesToGroup.mockResolvedValue(mockResult);

      const result = await controller.batchAddDevices(groupId, dto);

      expect(result.success).toBe(true);
      expect(result.data.success).toBe(3);
      expect(result.data.failed).toBe(0);
      expect(deviceGroupService.addDevicesToGroup).toHaveBeenCalledWith(
        groupId,
        dto.deviceIds,
      );
    });

    it('should handle partial failures in batch add', async () => {
      const groupId = 'group-123';
      const dto: BatchAddDevicesDto = {
        deviceIds: ['device-1', 'device-2', 'device-invalid'],
      };

      const mockResult = {
        success: 2,
        failed: 1,
        errors: [{ deviceId: 'device-invalid', error: 'Device not found' }],
      };

      mockDeviceGroupService.addDevicesToGroup.mockResolvedValue(mockResult);

      const result = await controller.batchAddDevices(groupId, dto);

      expect(result.data.success).toBe(2);
      expect(result.data.failed).toBe(1);
      expect(result.data.errors).toHaveLength(1);
    });

    it('should handle total failure', async () => {
      const groupId = 'group-invalid';
      const dto: BatchAddDevicesDto = {
        deviceIds: ['device-1', 'device-2'],
      };

      const mockResult = {
        success: 0,
        failed: 2,
        errors: [
          { deviceId: 'device-1', error: 'Group not found' },
          { deviceId: 'device-2', error: 'Group not found' },
        ],
      };

      mockDeviceGroupService.addDevicesToGroup.mockResolvedValue(mockResult);

      const result = await controller.batchAddDevices(groupId, dto);

      expect(result.data.success).toBe(0);
      expect(result.data.failed).toBe(2);
    });
  });

  describe('removeDevice', () => {
    it('should remove device from group', async () => {
      const groupId = 'group-123';
      const deviceId = 'device-456';

      mockDeviceGroupService.removeDeviceFromGroup.mockResolvedValue(undefined);

      await controller.removeDevice(groupId, deviceId);

      expect(deviceGroupService.removeDeviceFromGroup).toHaveBeenCalledWith(
        groupId,
        deviceId,
      );
    });

    it('should remove multiple devices', async () => {
      const groupId = 'group-123';
      const deviceIds = ['device-1', 'device-2', 'device-3'];

      mockDeviceGroupService.removeDeviceFromGroup.mockResolvedValue(undefined);

      for (const deviceId of deviceIds) {
        await controller.removeDevice(groupId, deviceId);
      }

      expect(deviceGroupService.removeDeviceFromGroup).toHaveBeenCalledTimes(3);
    });
  });

  describe('getGroupDevices', () => {
    it('should return group devices', async () => {
      const groupId = 'group-123';
      const mockDevices = [
        { id: 'device-1', name: 'Device 1', status: 'active' },
        { id: 'device-2', name: 'Device 2', status: 'active' },
      ];

      mockDeviceGroupService.getGroupDevices.mockResolvedValue(mockDevices);

      const result = await controller.getGroupDevices(groupId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(deviceGroupService.getGroupDevices).toHaveBeenCalledWith(groupId);
    });

    it('should return empty array for group with no devices', async () => {
      const groupId = 'group-empty';

      mockDeviceGroupService.getGroupDevices.mockResolvedValue([]);

      const result = await controller.getGroupDevices(groupId);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('assignProxies', () => {
    it('should assign proxies to group', async () => {
      const groupId = 'group-123';
      const dto: AssignProxiesToGroupDto = {
        proxyIds: ['proxy-1', 'proxy-2', 'proxy-3'],
        priority: 5,
      };

      const mockResult = {
        assigned: 3,
      };

      mockDeviceGroupService.assignProxiesToGroup.mockResolvedValue(mockResult);

      const result = await controller.assignProxies(groupId, dto);

      expect(result.success).toBe(true);
      expect(result.data.assigned).toBe(3);
      expect(result.message).toBe('Assigned 3 proxies');
      expect(deviceGroupService.assignProxiesToGroup).toHaveBeenCalledWith({
        groupId,
        proxyIds: dto.proxyIds,
        priority: dto.priority,
      });
    });

    it('should handle assignment with default priority', async () => {
      const groupId = 'group-123';
      const dto: AssignProxiesToGroupDto = {
        proxyIds: ['proxy-1'],
      };

      const mockResult = {
        assigned: 1,
      };

      mockDeviceGroupService.assignProxiesToGroup.mockResolvedValue(mockResult);

      const result = await controller.assignProxies(groupId, dto);

      expect(result.data.assigned).toBe(1);
      expect(result.message).toBe('Assigned 1 proxies');
    });

    it('should assign large batch of proxies', async () => {
      const groupId = 'group-123';
      const proxyIds = Array.from({ length: 50 }, (_, i) => `proxy-${i + 1}`);
      const dto: AssignProxiesToGroupDto = {
        proxyIds,
        priority: 7,
      };

      const mockResult = {
        assigned: 50,
      };

      mockDeviceGroupService.assignProxiesToGroup.mockResolvedValue(mockResult);

      const result = await controller.assignProxies(groupId, dto);

      expect(result.data.assigned).toBe(50);
    });
  });

  describe('getGroupProxies', () => {
    it('should return group proxies', async () => {
      const groupId = 'group-123';
      const mockProxies = [
        { id: 'proxy-1', country: 'US', status: 'active' },
        { id: 'proxy-2', country: 'UK', status: 'active' },
      ];

      mockDeviceGroupService.getGroupProxies.mockResolvedValue(mockProxies);

      const result = await controller.getGroupProxies(groupId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(deviceGroupService.getGroupProxies).toHaveBeenCalledWith(groupId);
    });

    it('should return empty array for group with no proxies', async () => {
      mockDeviceGroupService.getGroupProxies.mockResolvedValue([]);

      const result = await controller.getGroupProxies('group-no-proxies');

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getGroupStats', () => {
    it('should return group statistics', async () => {
      const groupId = 'group-123';
      const mockStats = {
        totalDevices: 50,
        activeDevices: 45,
        totalProxies: 150,
        activeProxies: 140,
        avgProxiesPerDevice: 3,
        proxyUsageRate: 0.93,
      };

      mockDeviceGroupService.getGroupStats.mockResolvedValue(mockStats);

      const result = await controller.getGroupStats(groupId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.data.totalDevices).toBe(50);
      expect(result.data.activeDevices).toBe(45);
      expect(deviceGroupService.getGroupStats).toHaveBeenCalledWith(groupId);
    });

    it('should handle zero devices', async () => {
      const mockStats = {
        totalDevices: 0,
        activeDevices: 0,
        totalProxies: 0,
        activeProxies: 0,
        avgProxiesPerDevice: 0,
        proxyUsageRate: 0,
      };

      mockDeviceGroupService.getGroupStats.mockResolvedValue(mockStats);

      const result = await controller.getGroupStats('group-empty');

      expect(result.data.totalDevices).toBe(0);
    });
  });

  describe('refreshGroupStats', () => {
    it('should refresh group statistics', async () => {
      const groupId = 'group-123';
      const mockStats = {
        totalDevices: 52,
        activeDevices: 48,
        totalProxies: 155,
        activeProxies: 145,
        lastUpdated: new Date('2025-01-06T01:00:00.000Z'),
      };

      mockDeviceGroupService.updateGroupStats.mockResolvedValue(mockStats);

      const result = await controller.refreshGroupStats(groupId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
      expect(result.message).toBe('Stats refreshed');
      expect(deviceGroupService.updateGroupStats).toHaveBeenCalledWith(groupId);
    });

    it('should refresh stats multiple times', async () => {
      const groupId = 'group-123';
      const mockStats = {
        totalDevices: 50,
        lastUpdated: new Date(),
      };

      mockDeviceGroupService.updateGroupStats.mockResolvedValue(mockStats);

      await controller.refreshGroupStats(groupId);
      await controller.refreshGroupStats(groupId);

      expect(deviceGroupService.updateGroupStats).toHaveBeenCalledTimes(2);
    });
  });

  describe('triggerAutoScale', () => {
    it('should trigger auto-scale and add proxies', async () => {
      const groupId = 'group-123';
      const mockResult = {
        added: 20,
        reason: 'Added 20 proxies to meet demand (100 devices)',
      };

      mockDeviceGroupService.autoScaleGroupProxies.mockResolvedValue(
        mockResult,
      );

      const result = await controller.triggerAutoScale(groupId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(result.data.added).toBe(20);
      expect(result.data.reason).toContain('Added 20 proxies');
      expect(deviceGroupService.autoScaleGroupProxies).toHaveBeenCalledWith(
        groupId,
      );
    });

    it('should handle no scaling needed', async () => {
      const groupId = 'group-123';
      const mockResult = {
        added: 0,
        reason: 'No scaling needed, current proxy count is sufficient',
      };

      mockDeviceGroupService.autoScaleGroupProxies.mockResolvedValue(
        mockResult,
      );

      const result = await controller.triggerAutoScale(groupId);

      expect(result.data.added).toBe(0);
      expect(result.data.reason).toContain('No scaling needed');
    });

    it('should handle large scale up', async () => {
      const groupId = 'group-large';
      const mockResult = {
        added: 100,
        reason: 'Added 100 proxies for large device group (500 devices)',
      };

      mockDeviceGroupService.autoScaleGroupProxies.mockResolvedValue(
        mockResult,
      );

      const result = await controller.triggerAutoScale(groupId);

      expect(result.data.added).toBe(100);
    });
  });

  describe('Response Format', () => {
    it('should return ProxyApiResponse for all query endpoints', async () => {
      mockDeviceGroupService.getUserGroups.mockResolvedValue([]);
      mockDeviceGroupService.getGroupDetails.mockResolvedValue({
        group: mockDeviceGroup,
        devices: [],
        proxies: [],
        stats: null,
      });
      mockDeviceGroupService.getGroupDevices.mockResolvedValue([]);
      mockDeviceGroupService.getGroupProxies.mockResolvedValue([]);
      mockDeviceGroupService.getGroupStats.mockResolvedValue({});

      const groupsResult = await controller.getUserGroups(mockRequest);
      const detailsResult = await controller.getGroupDetails('group-1');
      const devicesResult = await controller.getGroupDevices('group-1');
      const proxiesResult = await controller.getGroupProxies('group-1');
      const statsResult = await controller.getGroupStats('group-1');

      expect(groupsResult.success).toBe(true);
      expect(detailsResult.success).toBe(true);
      expect(devicesResult.success).toBe(true);
      expect(proxiesResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
    });

    it('should include messages for mutation endpoints', async () => {
      mockDeviceGroupService.createDeviceGroup.mockResolvedValue(
        mockDeviceGroup,
      );
      mockDeviceGroupService.updateGroup.mockResolvedValue(mockDeviceGroup);
      mockDeviceGroupService.addDeviceToGroup.mockResolvedValue({});
      mockDeviceGroupService.assignProxiesToGroup.mockResolvedValue({
        assigned: 5,
      });
      mockDeviceGroupService.updateGroupStats.mockResolvedValue({});

      const createResult = await controller.createDeviceGroup(mockRequest, {
        name: 'Test',
      });
      const updateResult = await controller.updateGroup('group-1', {});
      const addDeviceResult = await controller.addDevice('group-1', {
        deviceId: 'device-1',
      });
      const assignResult = await controller.assignProxies('group-1', {
        proxyIds: ['proxy-1'],
      });
      const refreshResult = await controller.refreshGroupStats('group-1');

      expect(createResult.message).toBeDefined();
      expect(updateResult.message).toBeDefined();
      expect(addDeviceResult.message).toBeDefined();
      expect(assignResult.message).toBeDefined();
      expect(refreshResult.message).toBeDefined();
    });

    it('should have consistent data structure across endpoints', async () => {
      mockDeviceGroupService.getUserGroups.mockResolvedValue([
        mockDeviceGroup,
      ]);
      mockDeviceGroupService.getGroupDetails.mockResolvedValue({
        group: mockDeviceGroup,
        devices: [],
        proxies: [],
        stats: null,
      });

      const groupsResult = await controller.getUserGroups(mockRequest);
      const detailsResult = await controller.getGroupDetails('group-1');

      expect(groupsResult.success).toBeDefined();
      expect(groupsResult.data).toBeDefined();
      expect(detailsResult.success).toBeDefined();
      expect(detailsResult.data).toBeDefined();
    });
  });
});
