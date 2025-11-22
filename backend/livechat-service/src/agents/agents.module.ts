import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { Agent } from '../entities/agent.entity';
import { AgentGroup } from '../entities/agent-group.entity';
import { CannedResponse } from '../entities/canned-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Agent, AgentGroup, CannedResponse])],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
