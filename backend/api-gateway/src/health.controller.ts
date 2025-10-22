import { Controller, Get } from "@nestjs/common";
import * as os from "os";

interface HealthCheckResult {
  status: "ok";
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
  system: {
    hostname: string;
    platform: string;
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      cores: number;
      model: string;
    };
  };
}

@Controller("health")
export class HealthController {
  private readonly startTime: number = Date.now();

  @Get()
  check(): HealthCheckResult {
    return {
      status: "ok",
      service: "api-gateway",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || "development",
      system: this.getSystemInfo(),
    };
  }

  private getSystemInfo(): HealthCheckResult["system"] {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      memory: {
        total: Math.floor(totalMemory / 1024 / 1024), // MB
        free: Math.floor(freeMemory / 1024 / 1024), // MB
        used: Math.floor(usedMemory / 1024 / 1024), // MB
        usagePercent: Math.floor((usedMemory / totalMemory) * 100),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || "unknown",
      },
    };
  }
}
