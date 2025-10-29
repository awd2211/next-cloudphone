import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PortManagerService } from "../port-manager.service";
import { Device, DeviceStatus } from "../../entities/device.entity";

describe("PortManagerService", () => {
  let service: PortManagerService;
  let devicesRepository: jest.Mocked<Repository<Device>>;

  const mockDevice: Partial<Device> = {
    id: "device-123",
    name: "Test Device",
    adbPort: 5555,
    status: DeviceStatus.RUNNING,
    metadata: {
      webrtcPort: 8080,
      scrcpyPort: 27183,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortManagerService,
        {
          provide: getRepositoryToken(Device),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PortManagerService>(PortManagerService);
    devicesRepository = module.get(getRepositoryToken(Device));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should initialize port cache from database", async () => {
      const devices = [
        { ...mockDevice, adbPort: 5555 },
        { ...mockDevice, id: "device-2", adbPort: 5556 },
      ] as Device[];

      devicesRepository.find.mockResolvedValue(devices);

      const newService = new PortManagerService(devicesRepository);

      // Allow async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stats = newService.getPortStats();
      expect(stats.adb.used).toBeGreaterThan(0);
    });
  });

  describe("allocatePorts", () => {
    it("should allocate ADB and WebRTC ports", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const allocation = await service.allocatePorts();

      expect(allocation).toHaveProperty("adbPort");
      expect(allocation).toHaveProperty("webrtcPort");
      expect(allocation.adbPort).toBeGreaterThanOrEqual(5555);
      expect(allocation.adbPort).toBeLessThanOrEqual(6554);
      expect(allocation.webrtcPort).toBeGreaterThanOrEqual(8080);
      expect(allocation.webrtcPort).toBeLessThanOrEqual(9079);
    });

    it("should allocate different ports for consecutive calls", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const allocation1 = await service.allocatePorts();
      const allocation2 = await service.allocatePorts();

      expect(allocation1.adbPort).not.toBe(allocation2.adbPort);
      expect(allocation1.webrtcPort).not.toBe(allocation2.webrtcPort);
    });

    it("should skip already used ports", async () => {
      devicesRepository.find.mockResolvedValue([
        { ...mockDevice, adbPort: 5555 } as Device,
      ]);

      const newService = new PortManagerService(devicesRepository);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const allocation = await newService.allocatePorts();

      expect(allocation.adbPort).not.toBe(5555);
      expect(allocation.adbPort).toBeGreaterThan(5555);
    });
  });

  describe("allocateScrcpyPort", () => {
    it("should allocate SCRCPY port", () => {
      const port = service.allocateScrcpyPort();

      expect(port).toBeGreaterThanOrEqual(27183);
      expect(port).toBeLessThanOrEqual(28182);
    });

    it("should allocate different SCRCPY ports for consecutive calls", () => {
      const port1 = service.allocateScrcpyPort();
      const port2 = service.allocateScrcpyPort();

      expect(port1).not.toBe(port2);
    });

    it("should throw error when all SCRCPY ports are used", () => {
      // Allocate all ports (1000 ports in range)
      for (let i = 0; i < 1000; i++) {
        service.allocateScrcpyPort();
      }

      expect(() => service.allocateScrcpyPort()).toThrow(
        "No available SCRCPY ports",
      );
    });
  });

  describe("releasePorts", () => {
    it("should release allocated ADB port", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const allocation = await service.allocatePorts();
      const adbPort = allocation.adbPort;

      service.releasePorts({ adbPort });

      expect(service.isPortAvailable(adbPort, "adb")).toBe(true);
    });

    it("should release allocated WebRTC port", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const allocation = await service.allocatePorts();
      const webrtcPort = allocation.webrtcPort;

      service.releasePorts({ webrtcPort });

      expect(service.isPortAvailable(webrtcPort, "webrtc")).toBe(true);
    });

    it("should release all allocated ports", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const allocation = await service.allocatePorts();
      const scrcpyPort = service.allocateScrcpyPort();

      service.releasePorts({
        adbPort: allocation.adbPort,
        webrtcPort: allocation.webrtcPort,
        scrcpyPort,
      });

      expect(service.isPortAvailable(allocation.adbPort, "adb")).toBe(true);
      expect(service.isPortAvailable(allocation.webrtcPort, "webrtc")).toBe(
        true,
      );
      expect(service.isPortAvailable(scrcpyPort, "scrcpy")).toBe(true);
    });

    it("should handle releasing non-allocated ports gracefully", () => {
      expect(() => {
        service.releasePorts({ adbPort: 9999 });
      }).not.toThrow();
    });
  });

  describe("isPortAvailable", () => {
    it("should return true for available ADB port in range", () => {
      expect(service.isPortAvailable(5555, "adb")).toBe(true);
    });

    it("should return false for port outside ADB range", () => {
      expect(service.isPortAvailable(7000, "adb")).toBe(false);
      expect(service.isPortAvailable(4000, "adb")).toBe(false);
    });

    it("should return false for allocated port", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const allocation = await service.allocatePorts();

      expect(service.isPortAvailable(allocation.adbPort, "adb")).toBe(false);
    });

    it("should return true for WebRTC port in range", () => {
      expect(service.isPortAvailable(8080, "webrtc")).toBe(true);
      expect(service.isPortAvailable(9000, "webrtc")).toBe(true);
    });

    it("should return false for port outside WebRTC range", () => {
      expect(service.isPortAvailable(10000, "webrtc")).toBe(false);
    });

    it("should return true for SCRCPY port in range", () => {
      expect(service.isPortAvailable(27183, "scrcpy")).toBe(true);
      expect(service.isPortAvailable(28000, "scrcpy")).toBe(true);
    });

    it("should return false for invalid port type", () => {
      expect(service.isPortAvailable(5555, "invalid" as any)).toBe(false);
    });
  });

  describe("getPortStats", () => {
    it("should return port usage statistics", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const stats = service.getPortStats();

      expect(stats).toHaveProperty("adb");
      expect(stats).toHaveProperty("webrtc");
      expect(stats).toHaveProperty("scrcpy");
    });

    it("should calculate correct total ports", () => {
      const stats = service.getPortStats();

      expect(stats.adb.total).toBe(1000); // 6554 - 5555 + 1
      expect(stats.webrtc.total).toBe(1000); // 9079 - 8080 + 1
      expect(stats.scrcpy.total).toBe(1000); // 28182 - 27183 + 1
    });

    it("should track used ports correctly", async () => {
      devicesRepository.find.mockResolvedValue([]);

      await service.allocatePorts();
      await service.allocatePorts();

      const stats = service.getPortStats();

      expect(stats.adb.used).toBe(2);
      expect(stats.webrtc.used).toBe(2);
      expect(stats.adb.available).toBe(998);
      expect(stats.webrtc.available).toBe(998);
    });

    it("should include port range in statistics", () => {
      const stats = service.getPortStats();

      expect(stats.adb.range).toBe("5555-6554");
      expect(stats.webrtc.range).toBe("8080-9079");
      expect(stats.scrcpy.range).toBe("27183-28182");
    });

    it("should update statistics after releasing ports", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const allocation = await service.allocatePorts();
      let stats = service.getPortStats();
      const usedBefore = stats.adb.used;

      service.releasePorts(allocation);
      stats = service.getPortStats();

      expect(stats.adb.used).toBe(usedBefore - 1);
      expect(stats.webrtc.used).toBe(usedBefore - 1);
    });
  });

  describe("port exhaustion", () => {
    it("should throw error when all ADB ports are allocated", async () => {
      devicesRepository.find.mockResolvedValue([]);

      // Allocate all 1000 ports
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(service.allocatePorts());
      }
      await Promise.all(promises);

      await expect(service.allocatePorts()).rejects.toThrow(
        "No available ADB ports",
      );
    });

    it("should recover after releasing ports", async () => {
      devicesRepository.find.mockResolvedValue([]);

      const allocation = await service.allocatePorts();
      service.releasePorts(allocation);

      await expect(service.allocatePorts()).resolves.toBeDefined();
    });
  });
});
