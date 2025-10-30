import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { hasAdminRole } from '@cloudphone/shared';

/**
 * 设备访问控制服务
 * 负责验证用户是否有权限访问特定设备
 */
@Injectable()
export class DevicesAccessService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  /**
   * 验证用户是否有权访问设备
   * @param deviceId 设备ID
   * @param user 当前用户
   * @returns 设备实体
   * @throws NotFoundException 设备不存在
   * @throws ForbiddenException 无权访问
   */
  async validateDeviceAccess(deviceId: string, user: any): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      relations: ['user'],
    });

    if (!device) {
      throw new NotFoundException('设备不存在');
    }

    // 管理员可以访问所有设备
    if (hasAdminRole(user.roles || [])) {
      return device;
    }

    // 普通用户只能访问自己的设备
    if (device.userId !== user.id) {
      throw new ForbiddenException('您没有权限访问此设备');
    }

    return device;
  }

  /**
   * 批量验证设备访问权限
   * @param deviceIds 设备ID列表
   * @param user 当前用户
   * @returns 有权访问的设备列表
   * @throws ForbiddenException 部分设备无权访问
   */
  async validateBatchDeviceAccess(deviceIds: string[], user: any): Promise<Device[]> {
    const devices = await this.deviceRepository.find({
      where: deviceIds.map(id => ({ id })),
      relations: ['user'],
    });

    if (devices.length !== deviceIds.length) {
      throw new NotFoundException('部分设备不存在');
    }

    // 管理员可以访问所有设备
    if (hasAdminRole(user.roles || [])) {
      return devices;
    }

    // 检查所有设备是否都属于该用户
    const unauthorizedDevices = devices.filter(device => device.userId !== user.id);

    if (unauthorizedDevices.length > 0) {
      throw new ForbiddenException(
        `您没有权限访问以下设备: ${unauthorizedDevices.map(d => d.id).join(', ')}`
      );
    }

    return devices;
  }

  /**
   * 检查用户是否为设备所有者或管理员
   * @param deviceId 设备ID
   * @param user 当前用户
   * @returns boolean
   */
  async isDeviceOwnerOrAdmin(deviceId: string, user: any): Promise<boolean> {
    // 管理员总是返回 true
    if (hasAdminRole(user.roles || [])) {
      return true;
    }

    const device = await this.deviceRepository.findOne({
      where: { id: deviceId },
      select: ['userId'],
    });

    if (!device) {
      return false;
    }

    return device.userId === user.id;
  }

  /**
   * 根据用户角色构建查询条件
   * @param user 当前用户
   * @returns 查询条件对象
   */
  buildUserScopeFilter(user: any): any {
    // 管理员不需要过滤
    if (hasAdminRole(user.roles || [])) {
      return {};
    }

    // 普通用户只能查看自己的设备
    return { userId: user.id };
  }
}
