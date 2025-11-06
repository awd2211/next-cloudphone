import { Controller, Post, Get, Query, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import {
  SearchQueryDto,
  AutocompleteQueryDto,
  SearchHistoryQueryDto,
} from './dto/search-query.dto';
import {
  SearchResultDto,
  AutocompleteResultDto,
  SearchHistoryDto,
  TrendingSearchDto,
} from './dto/search-result.dto';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(private readonly searchService: SearchService) {}

  @Post('global')
  @ApiOperation({
    summary: '全局搜索',
    description: '跨服务搜索用户、设备、应用、模板、工单、订单等',
  })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    type: SearchResultDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权，需要登录',
  })
  async globalSearch(@Body() query: SearchQueryDto, @Req() req: any): Promise<SearchResultDto> {
    const userId = req.user?.sub || req.user?.userId;
    this.logger.log(`[POST /search/global] keyword="${query.keyword}", user=${userId}`);
    return this.searchService.globalSearch(query, userId);
  }

  @Get('autocomplete')
  @ApiOperation({
    summary: '搜索自动补全',
    description: '根据输入前缀提供搜索建议',
  })
  @ApiResponse({
    status: 200,
    description: '获取建议成功',
    type: AutocompleteResultDto,
  })
  async autocomplete(@Query() query: AutocompleteQueryDto, @Req() req: any): Promise<AutocompleteResultDto> {
    const userId = req.user?.sub || req.user?.userId;
    this.logger.log(`[GET /search/autocomplete] prefix="${query.prefix}", user=${userId}`);
    return this.searchService.autocomplete(query, userId);
  }

  @Get('history')
  @ApiOperation({
    summary: '获取搜索历史',
    description: '获取当前用户的搜索历史记录',
  })
  @ApiResponse({
    status: 200,
    description: '获取历史成功',
    type: SearchHistoryDto,
  })
  async getHistory(@Query() query: SearchHistoryQueryDto, @Req() req: any): Promise<SearchHistoryDto> {
    const userId = req.user?.sub || req.user?.userId;
    this.logger.log(`[GET /search/history] user=${userId}`);
    return this.searchService.getSearchHistory(query, userId);
  }

  @Get('trending')
  @ApiOperation({
    summary: '获取热门搜索',
    description: '获取平台热门搜索关键词',
  })
  @ApiResponse({
    status: 200,
    description: '获取热门搜索成功',
    type: TrendingSearchDto,
  })
  async getTrending(): Promise<TrendingSearchDto> {
    this.logger.log('[GET /search/trending]');
    return this.searchService.getTrendingSearches();
  }
}
