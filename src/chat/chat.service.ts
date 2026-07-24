import { Injectable } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { AskDto } from './chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly agentService: AgentService) {}

  async ask(dto: AskDto) {
    return this.agentService.ask(dto.question);
  }
}
