import { DataSource } from "typeorm";
import { Device, DeviceStatus, DeviceType } from "../entities/device.entity";
import {
  DeviceTemplate,
  TemplateCategory,
} from "../entities/device-template.entity";
import { Node, NodeStatus } from "../entities/node.entity";

export async function seedDevices(dataSource: DataSource, userIds: string[]) {
  const deviceRepository = dataSource.getRepository(Device);
  const templateRepository = dataSource.getRepository(DeviceTemplate);
  const nodeRepository = dataSource.getRepository(Node);

  console.log("🌱 Seeding devices, templates, and nodes...");

  // 1. 创建节点
  const nodes = [
    {
      name: "node-beijing-01",
      ip: "192.168.1.101",
      hostname: "node-beijing-01",
      region: "cn-beijing",
      zone: "cn-beijing-a",
      status: NodeStatus.ONLINE,
      cpuTotal: 16,
      cpuUsed: 4,
      memoryTotal: 32768,
      memoryUsed: 8192,
      diskTotal: 500,
      diskUsed: 100,
      gpuCount: 2,
      gpuModel: "NVIDIA Tesla T4",
      labels: { environment: "production", region: "beijing" },
      capacity: {
        maxDevices: 50,
        currentDevices: 12,
      },
    },
    {
      name: "node-shanghai-01",
      ip: "192.168.1.102",
      hostname: "node-shanghai-01",
      region: "cn-shanghai",
      zone: "cn-shanghai-a",
      status: NodeStatus.ONLINE,
      cpuTotal: 32,
      cpuUsed: 8,
      memoryTotal: 65536,
      memoryUsed: 16384,
      diskTotal: 1000,
      diskUsed: 200,
      gpuCount: 4,
      gpuModel: "NVIDIA Tesla T4",
      labels: { environment: "production", region: "shanghai" },
      capacity: {
        maxDevices: 100,
        currentDevices: 25,
      },
    },
  ];

  const createdNodes = [];
  for (const nodeData of nodes) {
    const existing = await nodeRepository.findOne({
      where: { name: nodeData.name },
    });
    if (!existing) {
      const node = nodeRepository.create(nodeData);
      createdNodes.push(await nodeRepository.save(node));
    } else {
      createdNodes.push(existing);
    }
  }
  console.log(`✅ Created ${createdNodes.length} nodes`);

  // 2. 创建设备模板
  const templates = [
    {
      name: "标准手机模板",
      description: "适合日常使用的标准Android手机配置",
      category: TemplateCategory.GENERAL,
      androidVersion: "13",
      cpuCores: 2,
      memoryMB: 4096,
      storageMB: 32768,
      resolution: "1080x2340",
      dpi: 420,
      isPublic: true,
      usageCount: 0,
      preInstalledApps: [],
      metadata: { gpu: "auto", network: "nat" },
    },
    {
      name: "游戏专用模板",
      description: "高性能游戏手机配置，支持GPU加速",
      category: TemplateCategory.GAMING,
      androidVersion: "13",
      cpuCores: 4,
      memoryMB: 8192,
      storageMB: 65536,
      resolution: "1440x3040",
      dpi: 560,
      isPublic: true,
      usageCount: 0,
      enableGpu: true,
      preInstalledApps: [],
      metadata: { gpu: "enabled", network: "nat", performance: "high" },
    },
    {
      name: "测试专用模板",
      description: "轻量级测试环境，快速启动",
      category: TemplateCategory.TESTING,
      androidVersion: "11",
      cpuCores: 1,
      memoryMB: 2048,
      storageMB: 16384,
      resolution: "720x1280",
      dpi: 320,
      isPublic: true,
      usageCount: 0,
      preInstalledApps: [],
      metadata: { gpu: "disabled", network: "nat" },
    },
  ];

  const createdTemplates = [];
  for (const templateData of templates) {
    const existing = await templateRepository.findOne({
      where: { name: templateData.name },
    });
    if (!existing) {
      const template = templateRepository.create(templateData);
      createdTemplates.push(await templateRepository.save(template));
    } else {
      createdTemplates.push(existing);
    }
  }
  console.log(`✅ Created ${createdTemplates.length} templates`);

  // 3. 创建测试设备
  const devices = [];
  for (let i = 0; i < userIds.length && i < 3; i++) {
    const userId = userIds[i];
    const userDevices = [
      {
        name: `测试设备-${i + 1}-手机`,
        description: `用户${i + 1}的测试Android手机`,
        type: DeviceType.PHONE,
        status: i === 0 ? DeviceStatus.RUNNING : DeviceStatus.STOPPED,
        userId,
        cpuCores: 2,
        memoryMB: 4096,
        diskGB: 32,
        resolution: "1080x2340",
        dpi: 420,
        androidVersion: "13",
        adbHost: "localhost",
        adbPort: 5555 + i,
        nodeId: createdNodes[i % createdNodes.length]?.id,
        metadata: { region: i % 2 === 0 ? "beijing" : "shanghai" },
      },
      {
        name: `测试设备-${i + 1}-平板`,
        description: `用户${i + 1}的测试Android平板`,
        type: DeviceType.TABLET,
        status: DeviceStatus.STOPPED,
        userId,
        cpuCores: 4,
        memoryMB: 8192,
        diskGB: 64,
        resolution: "1600x2560",
        dpi: 320,
        androidVersion: "13",
        adbHost: "localhost",
        adbPort: 5600 + i,
        nodeId: createdNodes[(i + 1) % createdNodes.length]?.id,
        metadata: { region: i % 2 === 0 ? "shanghai" : "beijing" },
      },
    ];
    devices.push(...userDevices);
  }

  const createdDevices = [];
  for (const deviceData of devices) {
    const existing = await deviceRepository.findOne({
      where: { name: deviceData.name, userId: deviceData.userId },
    });
    if (!existing) {
      const device = deviceRepository.create(deviceData);
      createdDevices.push(await deviceRepository.save(device));
    } else {
      createdDevices.push(existing);
    }
  }
  console.log(`✅ Created ${createdDevices.length} devices`);

  console.log("\n🎉 Device seed data completed!");
  return {
    devices: createdDevices,
    templates: createdTemplates,
    nodes: createdNodes,
  };
}
