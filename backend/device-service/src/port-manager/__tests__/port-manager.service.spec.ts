import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PortManagerService } from "../port-manager.service";
import { Device, DeviceStatus } from "../../entities/device.entity";

describe("PortManagerService", () => {
  let service: PortManagerService;
  let deviceRepository: jest.Mocked<Repository<Device>>;

  const mockDevice: Device = {
    id: "device-123",
    name: "TestDevice",
    userId: "user-123",
    adbPort: 5555,
    status: DeviceStatus.RUNNING,
    metadata: {
      webrtcPort: 8080,
      scrcpyPort: 27183,
    },
  } as Device;

  beforeEach(async () => {
    const mockDeviceRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortManagerService,
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
      ],
    }).compile();

    service = module.get<PortManagerService>(PortManagerService);
    deviceRepository = module.get(getRepositoryToken(Device));

    // Clear port cache before each test
    service["usedAdbPorts"].clear();
    service["usedWebrtcPorts"].clear();
    service["usedScrcpyPorts"].clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize port cache from database", async () => {
      const devices = [
        { ...mockDevice, id: "device-1", adbPort: 5555, metadata: { webrtcPort: 8080 } },
        { ...mockDevice, id: "device-2", adbPort: 5556, metadata: { webrtcPort: 8081 } },
      ];

      deviceRepository.find.mockResolvedValue(devices);

      await service["initializePortCache"]();

      expect(deviceRepository.find).toHaveBeenCalledWith({
        where: [
          { status: DeviceStatus.RUNNING },
          { status: DeviceStatus.STOPPED },
          { status: DeviceStatus.PAUSED },
        ],
      });

      expect(service["usedAdbPorts"].has(5555)).toBe(true);
      expect(service["usedAdbPorts"].has(5556)).toBe(true);
      expect(service["usedWebrtcPorts"].has(8080)).toBe(true);
      expect(service["usedWebrtcPorts"].has(8081)).toBe(true);
    });

    it("should handle initialization errors gracefully", async () => {
      deviceRepository.find.mockRejectedValue(new Error("Database error"));

      await expect(service["initializePortCache"]()).resolves.not.toThrow();
    });

    it("should initialize with scrcpy ports", async () => {
      const devices = [
        { ...mockDevice, adbPort: 5555, metadata: { scrcpyPort: 27183 } },
      ];

      deviceRepository.find.mockResolvedValue(devices);

      await service["initializePortCache"]();

      expect(service["usedScrcpyPorts"].has(27183)).toBe(true);
    });
  });

  describe("Port Allocation", () => {
    it("should allocate ADB and WebRTC ports", async () => {
      const allocation = await service.allocatePorts();

      expect(allocation.adbPort).toBeGreaterThanOrEqual(5555);
      expect(allocation.adbPort).toBeLessThanOrEqual(6554);
      expect(allocation.webrtcPort).toBeGreaterThanOrEqual(8080);
      expect(allocation.webrtcPort).toBeLessThanOrEqual(9079);
    });

    it("should allocate sequential ports when previous are used", async () => {
      // Mark first port as used
      service["usedAdbPorts"].add(5555);

      const allocation = await service.allocatePorts();

      expect(allocation.adbPort).toBe(5556);
    });

    it("should throw error when no ADB ports available", async () => {
      // Fill all ADB ports
      for (let port = 5555; port <= 6554; port++) {
        service["usedAdbPorts"].add(port);
      }

      await expect(service.allocatePorts()).rejects.toThrow(
        "No available ADB ports in range 5555-6554",
      );
    });

    it("should throw error when no WebRTC ports available", async () => {
      // Fill all WebRTC ports
      for (let port = 8080; port <= 9079; port++) {
        service["usedWebrtcPorts"].add(port);
      }

      await expect(service.allocatePorts()).rejects.toThrow(
        "No available WebRTC ports in range 8080-9079",
      );
    });

    it("should allocate scrcpy port", () => {
      const scrcpyPort = service.allocateScrcpyPort();

      expect(scrcpyPort).toBeGreaterThanOrEqual(27183);
      expect(scrcpyPort).toBeLessThanOrEqual(28182);
      expect(service["usedScrcpyPorts"].has(scrcpyPort)).toBe(true);
    });

    it("should throw error when no SCRCPY ports available", () => {
      // Fill all SCRCPY ports
      for (let port = 27183; port <= 28182; port++) {
        service["usedScrcpyPorts"].add(port);
      }

      expect(() => service.allocateScrcpyPort()).toThrow(
        "No available SCRCPY ports in range 27183-28182",
      );
    });

    it("should allocate multiple ports concurrently", async () => {
      const allocation1 = await service.allocatePorts();
      const allocation2 = await service.allocatePorts();
      const allocation3 = await service.allocatePorts();

      // All ports should be unique
      expect(allocation1.adbPort).not.toBe(allocation2.adbPort);
      expect(allocation2.adbPort).not.toBe(allocation3.adbPort);
      expect(allocation1.webrtcPort).not.toBe(allocation2.webrtcPort);
      expect(allocation2.webrtcPort).not.toBe(allocation3.webrtcPort);
    });
  });

  describe("Port Release", () => {
    it("should release ADB port", async () => {
      const allocation = await service.allocatePorts();

      service.releasePorts({ adbPort: allocation.adbPort });

      expect(service["usedAdbPorts"].has(allocation.adbPort)).toBe(false);
    });

    it("should release WebRTC port", async () => {
      const allocation = await service.allocatePorts();

      service.releasePorts({ webrtcPort: allocation.webrtcPort });

      expect(service["usedWebrtcPorts"].has(allocation.webrtcPort)).toBe(false);
    });

    it("should release SCRCPY port", () => {
      const scrcpyPort = service.allocateScrcpyPort();

      service.releasePorts({ scrcpyPort });

      expect(service["usedScrcpyPorts"].has(scrcpyPort)).toBe(false);
    });

    it("should release all ports in allocation", async () => {
      const allocation = await service.allocatePorts();
      const scrcpyPort = service.allocateScrcpyPort();

      service.releasePorts({
        adbPort: allocation.adbPort,
        webrtcPort: allocation.webrtcPort,
        scrcpyPort,
      });

      expect(service["usedAdbPorts"].has(allocation.adbPort)).toBe(false);
      expect(service["usedWebrtcPorts"].has(allocation.webrtcPort)).toBe(false);
      expect(service["usedScrcpyPorts"].has(scrcpyPort)).toBe(false);
    });

    it("should handle releasing non-existent ports gracefully", () => {
      expect(() => service.releasePorts({ adbPort: 9999 })).not.toThrow();
    });

    it("should allow reallocation after release", async () => {
      const allocation1 = await service.allocatePorts();
      service.releasePorts(allocation1);

      const allocation2 = await service.allocatePorts();

      // Should get the same ports back since they were released
      expect(allocation2.adbPort).toBe(allocation1.adbPort);
      expect(allocation2.webrtcPort).toBe(allocation1.webrtcPort);
    });
  });

  describe("Port Availability Check", () => {
    it("should check if ADB port is available", () => {
      expect(service.isPortAvailable(5555, "adb")).toBe(true);

      service["usedAdbPorts"].add(5555);

      expect(service.isPortAvailable(5555, "adb")).toBe(false);
    });

    it("should check if WebRTC port is available", () => {
      expect(service.isPortAvailable(8080, "webrtc")).toBe(true);

      service["usedWebrtcPorts"].add(8080);

      expect(service.isPortAvailable(8080, "webrtc")).toBe(false);
    });

    it("should check if SCRCPY port is available", () => {
      expect(service.isPortAvailable(27183, "scrcpy")).toBe(true);

      service["usedScrcpyPorts"].add(27183);

      expect(service.isPortAvailable(27183, "scrcpy")).toBe(false);
    });

    it("should return false for ports outside range", () => {
      expect(service.isPortAvailable(4000, "adb")).toBe(false);
      expect(service.isPortAvailable(7000, "adb")).toBe(false);
      expect(service.isPortAvailable(7000, "webrtc")).toBe(false);
      expect(service.isPortAvailable(10000, "webrtc")).toBe(false);
    });

    it("should handle invalid port type", () => {
      expect(service.isPortAvailable(5555, "invalid" as any)).toBe(false);
    });
  });

  describe("Port Statistics", () => {
    it("should return port usage statistics", () => {
      service["usedAdbPorts"].add(5555);
      service["usedAdbPorts"].add(5556);
      service["usedWebrtcPorts"].add(8080);

      const stats = service.getPortStats();

      expect(stats.adb.total).toBe(1000); // 6554 - 5555 + 1
      expect(stats.adb.used).toBe(2);
      expect(stats.adb.available).toBe(998);
      expect(stats.adb.range).toBe("5555-6554");

      expect(stats.webrtc.total).toBe(1000); // 9079 - 8080 + 1
      expect(stats.webrtc.used).toBe(1);
      expect(stats.webrtc.available).toBe(999);
      expect(stats.webrtc.range).toBe("8080-9079");
    });

    it("should show all ports available when none used", () => {
      const stats = service.getPortStats();

      expect(stats.adb.used).toBe(0);
      expect(stats.adb.available).toBe(1000);
      expect(stats.webrtc.used).toBe(0);
      expect(stats.webrtc.available).toBe(1000);
      expect(stats.scrcpy.used).toBe(0);
      expect(stats.scrcpy.available).toBe(1000);
    });

    it("should show correct stats after allocations and releases", async () => {
      const allocation1 = await service.allocatePorts();
      const allocation2 = await service.allocatePorts();
      service.allocateScrcpyPort();

      let stats = service.getPortStats();
      expect(stats.adb.used).toBe(2);
      expect(stats.webrtc.used).toBe(2);
      expect(stats.scrcpy.used).toBe(1);

      service.releasePorts(allocation1);

      stats = service.getPortStats();
      expect(stats.adb.used).toBe(1);
      expect(stats.webrtc.used).toBe(1);
    });
  });

  describe("Port Range Validation", () => {
    it("should use correct ADB port range", () => {
      expect(service["ADB_PORT_START"]).toBe(5555);
      expect(service["ADB_PORT_END"]).toBe(6554);
    });

    it("should use correct WebRTC port range", () => {
      expect(service["WEBRTC_PORT_START"]).toBe(8080);
      expect(service["WEBRTC_PORT_END"]).toBe(9079);
    });

    it("should use correct SCRCPY port range", () => {
      expect(service["SCRCPY_PORT_START"]).toBe(27183);
      expect(service["SCRCPY_PORT_END"]).toBe(28182);
    });
  });
});
