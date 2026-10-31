/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('storage.bucket');

    this.client = new S3Client({
      endpoint: this.config.getOrThrow<string>('storage.endpoint'),
      region: this.config.getOrThrow<string>('storage.region'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('storage.accessKey'),
        secretAccessKey: this.config.getOrThrow<string>('storage.secretKey'),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error: any) {
      const code = error?.Code ?? error?.name;

      if (
        code !== 'BucketAlreadyOwnedByYou' &&
        code !== 'BucketAlreadyExists'
      ) {
        throw new ServiceUnavailableException(
          `Could not initialize storage bucket: ${code}`,
        );
      }
    }
  }

  async save(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
  ): Promise<string> {
    const extension = extname(originalName).toLowerCase();
    const storageKey = `${userId}/${randomUUID()}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return storageKey;
  }

  async get(storageKey: string) {
    return await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
  }
}
