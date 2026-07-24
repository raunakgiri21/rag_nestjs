import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGroq } from '@langchain/groq';

@Injectable()
export class LlmService {
  private readonly model: ChatGoogleGenerativeAI | ChatGroq;

  constructor(private readonly config: ConfigService) {
    const defaultProvider =
      this.config.getOrThrow<string>('ai.defaultProvider');

    const geminiApiKey = this.config.getOrThrow<string>('ai.gemini.apiKey');
    const geminiModel = this.config.getOrThrow<string>('ai.gemini.model');

    const groqApiKey = this.config.getOrThrow<string>('ai.groq.apiKey');
    const groqModel = this.config.getOrThrow<string>('ai.groq.model');

    if (defaultProvider === 'gemini') {
      this.model = new ChatGoogleGenerativeAI({
        model: geminiModel,
        temperature: 0.2,
        apiKey: geminiApiKey,
      });
    } else if (defaultProvider === 'groq') {
      this.model = new ChatGroq({
        model: groqModel,
        temperature: 0.2,
        apiKey: groqApiKey,
      });
    } else {
      throw new Error(`Unsupported AI provider: ${defaultProvider}`);
    }
  }

  getModel() {
    return this.model;
  }
}
