import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MenusService } from './menus.service';

@Controller('menus')
@UseGuards(JwtAuthGuard)
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  /**
   * 获取当前用户的菜单树
   * 根据用户角色动态返回有权限访问的菜单
   */
  @Get()
  async getUserMenus(@Req() req: any) {
    const userId = req.user.userId;
    return this.menusService.getUserMenus(userId);
  }

  /**
   * 检查用户是否有访问某个路由的权限
   */
  @Get('check-access')
  async checkAccess(@Req() req: any, @Query('path') path: string) {
    const userId = req.user.userId;
    return this.menusService.canAccessMenu(userId, path);
  }
}
