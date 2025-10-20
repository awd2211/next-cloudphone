import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserStatus } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.usersRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 获取角色
    let roles: Role[] = [];
    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      roles = await this.rolesRepository.find({
        where: { id: In(createUserDto.roleIds) },
      });
    } else {
      // 默认分配 'user' 角色
      const defaultRole = await this.rolesRepository.findOne({
        where: { name: 'user' },
      });
      if (defaultRole) {
        roles = [defaultRole];
      }
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      roles,
    });

    return await this.usersRepository.save(user);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    tenantId?: string,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const [data, total] = await this.usersRepository.findAndCount({
      where,
      skip,
      take: limit,
      relations: ['roles'],
      order: { createdAt: 'DESC' },
    });

    // 移除密码字段
    data.forEach((user) => delete user.password);

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`用户 #${id} 不存在`);
    }

    delete user.password;
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { username },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`用户 ${username} 不存在`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new NotFoundException(`邮箱 ${email} 对应的用户不存在`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`用户 #${id} 不存在`);
    }

    // 检查邮箱是否重复
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('该邮箱已被使用');
      }
    }

    // 更新角色
    if (updateUserDto.roleIds) {
      const roles = await this.rolesRepository.find({
        where: { id: In(updateUserDto.roleIds) },
      });
      user.roles = roles;
    }

    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`用户 #${id} 不存在`);
    }

    // 验证旧密码
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('旧密码不正确');
    }

    // 设置新密码
    user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`用户 #${id} 不存在`);
    }

    // 软删除：更新状态为已删除
    user.status = UserStatus.DELETED;
    await this.usersRepository.save(user);
  }

  async updateLoginInfo(id: string, ip: string): Promise<void> {
    await this.usersRepository.update(id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip,
      loginAttempts: 0,
    });
  }

  async incrementLoginAttempts(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (user) {
      user.loginAttempts += 1;

      // 如果登录失败次数超过 5 次，锁定账户 15 分钟
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await this.usersRepository.save(user);
    }
  }

  async resetLoginAttempts(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      loginAttempts: 0,
      lockedUntil: null,
    });
  }

  async isAccountLocked(id: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user || !user.lockedUntil) {
      return false;
    }

    if (user.lockedUntil > new Date()) {
      return true;
    }

    // 锁定时间已过，重置登录尝试次数
    await this.resetLoginAttempts(id);
    return false;
  }
}
