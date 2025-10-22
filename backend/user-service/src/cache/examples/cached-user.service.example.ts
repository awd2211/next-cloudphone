import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../entities/user.entity';
import { CacheService, CacheLayer } from '../cache.service';
import { Cacheable, CacheEvict, CachePut } from '../decorators/cacheable.decorator';

/**
 * 示例: 使用缓存的用户服务
 *
 * 这个文件展示了如何在实际服务中使用缓存系统
 */
@Injectable()
export class CachedUserServiceExample {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 示例 1: 使用装饰器缓存
   */
  @Cacheable({
    keyPrefix: 'user',
    ttl: 300, // 5分钟
    keyGenerator: (userId: string) => userId,
  })
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
  }

  /**
   * 示例 2: 手动使用缓存 (更灵活)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:email:${email}`;

    // 使用 getOrSet 方法，自动处理缓存未命中
    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return await this.userRepository.findOne({
          where: { email },
        });
      },
      {
        ttl: 300,
        randomTTL: true, // 防止缓存雪崩
        nullValueCache: true, // 防止缓存穿透
      },
    );
  }

  /**
   * 示例 3: 更新时清除缓存
   */
  @CacheEvict({
    keyPrefix: 'user',
    keyGenerator: (userId: string) => userId,
  })
  async updateUser(userId: string, data: Partial<User>): Promise<User | null> {
    await this.userRepository.update(userId, data);
    return await this.userRepository.findOne({ where: { id: userId } });
  }

  /**
   * 示例 4: 更新并刷新缓存
   */
  @CachePut({
    keyPrefix: 'user',
    ttl: 300,
    keyGenerator: (userId: string) => userId,
  })
  async refreshUserCache(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
  }

  /**
   * 示例 5: 批量清除缓存
   */
  async clearUserCaches(): Promise<void> {
    await this.cacheService.delPattern('user:*');
  }

  /**
   * 示例 6: 延迟双删 (解决缓存一致性)
   */
  async updateUserWithConsistency(userId: string, data: Partial<User>): Promise<User | null> {
    const cacheKey = `user:${userId}`;

    // 延迟双删策略
    await this.cacheService.delayedDoubleDel(cacheKey, 500);

    // 更新数据库
    await this.userRepository.update(userId, data);

    return await this.userRepository.findOne({ where: { id: userId } });
  }

  /**
   * 示例 7: 热点数据 (永不过期)
   */
  async getSystemConfig(key: string): Promise<any> {
    // 系统配置作为热点数据，使用前缀 'config:'
    const cacheKey = `config:${key}`;

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        // 从数据库或配置文件获取
        return { key, value: 'some value' };
      },
      {
        layer: CacheLayer.L1_AND_L2,
        // 热点数据会自动识别前缀 'config:' 并永不过期
      },
    );
  }

  /**
   * 示例 8: 仅使用本地缓存 (高频访问)
   */
  async getActiveUsers(): Promise<User[]> {
    const cacheKey = 'users:active';

    // 对于高频访问的数据，只使用 L1 缓存
    let cached = await this.cacheService.get<User[]>(cacheKey, {
      layer: CacheLayer.L1_ONLY,
    });

    if (cached) {
      return cached;
    }

    // 查询数据库
    const users = await this.userRepository.find({
      where: { status: UserStatus.ACTIVE },
      take: 100,
    });

    // 只缓存到 L1 (本地内存)
    await this.cacheService.set(cacheKey, users, {
      layer: CacheLayer.L1_ONLY,
      ttl: 60, // 1分钟
    });

    return users;
  }

  /**
   * 示例 9: 复杂查询缓存
   */
  async searchUsers(filters: {
    role?: string;
    status?: string;
    keyword?: string;
  }): Promise<User[] | null> {
    // 生成复杂的缓存键
    const cacheKey = `users:search:${JSON.stringify(filters)}`;

    return await this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const query = this.userRepository.createQueryBuilder('user');

        if (filters.role) {
          query.andWhere('user.role = :role', { role: filters.role });
        }

        if (filters.status) {
          query.andWhere('user.status = :status', { status: filters.status });
        }

        if (filters.keyword) {
          query.andWhere(
            '(user.username LIKE :keyword OR user.email LIKE :keyword)',
            { keyword: `%${filters.keyword}%` },
          );
        }

        return await query.getMany();
      },
      {
        ttl: 120, // 2分钟
        randomTTL: true,
      },
    );
  }
}
