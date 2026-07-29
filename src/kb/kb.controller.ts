import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { IngestionService } from './services/ingestion/ingestion.service';
import { KbService } from './kb.service';

@Controller('kb')
export class KbController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly kbService: KbService,
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

  @Get('documents')
  async getAllDocuments(@Body('userId') userId: string) {
    return await this.kbService.getAllDocumentsByUser(userId);
  }

  @Delete('documents')
  async deleteDocument(@Body('documentId') documentId: string) {
    return await this.kbService.deleteDocumentById(documentId);
  }
}
