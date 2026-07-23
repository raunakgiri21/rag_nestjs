import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import aiConfig from './config/ai.config';
import redisConfig from './config/redis.config';
import { RedisModule } from './redis/redis.module';
import { KbModule } from './kb/kb.module';
import qdrantConfig from './config/qdrant.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        aiConfig,
        qdrantConfig,
      ],
    }),
    PrismaModule,
    AuthModule,
    RedisModule,
    KbModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
