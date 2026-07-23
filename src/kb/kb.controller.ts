import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { IngestionService } from './services/ingestion/ingestion.service';
import { RetrieverService } from './services/retriever/retriever.service';
import { RetrieveDto } from './kb.dto';

@Controller('kb')
export class KbController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly retrieverService: RetrieverService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Please upload a file before proceeding.',
      );
    }

    return await this.ingestionService.ingest({
      namespace: 'default',
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
  }

  @Post('retrieve')
  retrieve(@Body() dto: RetrieveDto) {
    return this.retrieverService.retrieve(dto.query, dto.limit);
  }
}
