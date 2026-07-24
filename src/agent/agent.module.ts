import { Module } from '@nestjs/common';
import { KbModule } from '../kb/kb.module';
import { LlmService } from './llm/llm.service';
import { AgentService } from './agent.service';

@Module({
  imports: [KbModule],
  providers: [AgentService, LlmService],
  exports: [AgentService],
})
export class AgentModule {}
