import { Injectable } from '@nestjs/common';
import { KbService } from '../kb/kb.service';
import { LlmService } from './llm/llm.service';
import { ragPrompt } from './prompts/rag.prompt';
import { AnswerSchema } from './schemas/answer.schema';

@Injectable()
export class AgentService {
  constructor(
    private readonly kbService: KbService,
    private readonly llmService: LlmService,
  ) {}

  async ask(question: string, userId: string) {
    const docs = await this.kbService.retrieve(question, 3, userId);
    if (!docs.length) {
      return {
        answer: "I couldn't find any relevant information.",
        confidence: 0,
        sources: [],
      };
    }

    const context = docs
      .map(
        (doc) => `
Source: ${doc.source}
Page: ${doc.page}

${doc.content}
`,
      )
      .join('\n------------------------\n');

    const prompt = await ragPrompt.invoke({
      question,
      context,
    });

    const structuredModel = this.llmService
      .getModel()
      .withStructuredOutput(AnswerSchema);

    const response = await structuredModel.invoke(prompt);

    return {
      ...response,
      sources: docs.map((doc) => ({
        source: doc.source,
        page: doc.page,
        score: doc.score,
        chunkId: doc.chunkId,
      })),
    };
  }
}
