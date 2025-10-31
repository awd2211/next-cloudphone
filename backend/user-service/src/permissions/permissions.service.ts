import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    // 检查权限名是否已存在
    const existingPermission = await this.permissionsRepository.findOne({
      where: { name: createPermissionDto.name },
    });

    if (existingPermission) {
      throw new ConflictException(`权限 ${createPermissionDto.name} 已存在`);
    }

    const permission = this.permissionsRepository.create(createPermissionDto);
    return await this.permissionsRepository.save(permission);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    resource?: string
  ): Promise<{
    data: Permission[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (resource) {
      where.resource = resource;
    }

    const [data, total] = await this.permissionsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!permission) {
      throw new NotFoundException(`权限 #${id} 不存在`);
    }

    return permission;
  }

  async findByName(name: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { name },
    });

    if (!permission) {
      throw new NotFoundException(`权限 ${name} 不存在`);
    }

    return permission;
  }

  async update(id: string, updatePermissionDto: UpdatePermissionDto): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`权限 #${id} 不存在`);
    }

    // 检查权限名是否重复
    if (updatePermissionDto.name && updatePermissionDto.name !== permission.name) {
      const existingPermission = await this.permissionsRepository.findOne({
        where: { name: updatePermissionDto.name },
      });
      if (existingPermission) {
        throw new ConflictException(`权限 ${updatePermissionDto.name} 已存在`);
      }
    }

    Object.assign(permission, updatePermissionDto);
    return await this.permissionsRepository.save(permission);
  }

  async remove(id: string): Promise<void> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!permission) {
      throw new NotFoundException(`权限 #${id} 不存在`);
    }

    await this.permissionsRepository.remove(permission);
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return await this.permissionsRepository.find({
      where: { resource },
    });
  }

  async bulkCreate(createPermissionDtos: CreatePermissionDto[]): Promise<Permission[]> {
    const permissions = createPermissionDtos.map((dto) => this.permissionsRepository.create(dto));
    return await this.permissionsRepository.save(permissions);
  }
}
