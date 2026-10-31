import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KbService } from '../kb/kb.service';
import { LlmService } from './llm/llm.service';
import { ragPrompt } from './prompts/rag.prompt';
import { AnswerSchema } from './schemas/answer.schema';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly kbService: KbService,
    private readonly llmService: LlmService,
    private readonly config: ConfigService,
  ) {}

  async ask(question: string, userId: string) {
    const docs = await this.kbService.retrieve(question, 3, userId);
    if (!docs.length) {
      return {
        answer: "I couldn't find any relevant information.",
        confidence: 0,
        suggestions: [],
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

    let response: Awaited<ReturnType<typeof structuredModel.invoke>>;
    try {
      const timeoutMs = this.config.getOrThrow<number>('ai.requestTimeoutMs');
      let timeout: ReturnType<typeof setTimeout> | undefined;

      try {
        response = await Promise.race([
          structuredModel.invoke(prompt),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () =>
                reject(new Error(`LLM request timed out after ${timeoutMs}ms`)),
              timeoutMs,
            );
          }),
        ]);
      } finally {
        if (timeout) {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`LLM request failed: ${message}`);

      return {
        answer:
          'The AI service is temporarily unavailable. Please try again later.',
        confidence: 0,
        suggestions: [],
        sources: [],
      };
    }

    return {
      ...response,
      sources: docs.map((doc) => ({
        source: doc.source,
        page: doc.page,
        score: doc.score,
        chunkId: doc.chunkId,
        documentId: doc.documentId,
      })),
    };
  }
}
