import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { RolesModule } from '../roles/roles.module';
import { CacheService } from '../cache/cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    RolesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, CacheService],
  exports: [UsersService],
})
export class UsersModule {}
