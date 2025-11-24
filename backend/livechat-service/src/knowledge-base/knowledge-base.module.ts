/**
 * 知识库模块
 *
 * 提供知识库文章管理、分类管理、智能搜索和推荐功能
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  KnowledgeCategory,
  KnowledgeArticle,
  KnowledgeUsage,
} from '../entities';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KnowledgeCategory,
      KnowledgeArticle,
      KnowledgeUsage,
    ]),
  ],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
