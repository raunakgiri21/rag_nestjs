import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { IngestionService } from './services/ingestion/ingestion.service';
import { KbService } from './kb.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { type UserType } from 'src/auth/types/user.types';

@Controller('kb')
export class KbController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly kbService: KbService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserType,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Please upload a file before proceeding.',
      );
    }

    return await this.ingestionService.ingest(
      {
        namespace: 'default',
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
      },
      user.id,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('documents')
  async getAllDocuments(@CurrentUser() user: UserType) {
    return await this.kbService.getAllDocumentsByUser(user.id);
  }

  @Delete('documents')
  async deleteDocument(@Body('documentId') documentId: string) {
    return await this.kbService.deleteDocumentById(documentId);
  }
}
