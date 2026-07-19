import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { Prisma } from 'generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

import { JwtPayloadType } from 'src/auth/types/jwt-payload.types';
import { LoginDto, LogoutDto, RefreshTokenDto, RegisterDto } from './auth.dto';
import { UserType } from 'src/auth/types/user.types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwtService: JwtService,
  ) {}

  private getRefreshTokenExpiresAt(refreshToken: string): Date {
    const decoded = this.jwtService.decode<{ exp?: number }>(refreshToken);

    if (decoded?.exp) {
      return new Date(decoded.exp * 1000);
    }

    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private isRefreshTokenMatch(
    refreshToken: string,
    tokenHash: string,
  ): boolean {
    const incomingHash = Buffer.from(
      this.hashRefreshToken(refreshToken),
      'hex',
    );
    const storedHash = Buffer.from(tokenHash, 'hex');

    if (incomingHash.length !== storedHash.length) {
      return false;
    }

    return timingSafeEqual(incomingHash, storedHash);
  }

  private handleAuthError(error: unknown): never {
    if (
      error instanceof ConflictException ||
      error instanceof UnauthorizedException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }

      throw new InternalServerErrorException('Database operation failed');
    }

    if (
      error instanceof Error &&
      (error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError' ||
        error.name === 'NotBeforeError')
    ) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    throw new InternalServerErrorException('Authentication failed');
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordCorrect = await bcrypt.compare(
        dto.password,
        user.password,
      );

      if (!isPasswordCorrect) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const tokens = await this.generateTokens(user);

      await this.saveRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  async register(dto: RegisterDto) {
    try {
      const existing = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (existing) {
        throw new ConflictException('Email already exists');
      }

      const password = await bcrypt.hash(dto.password, 10);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password,
          isActive: true, // remove this line if you want to implement email verification
        },
      });

      const tokens = await this.generateTokens(user);

      await this.saveRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  async logout(dto: LogoutDto) {
    try {
      const payload: JwtPayloadType = await this.jwtService.verifyAsync(
        dto.refreshToken,
        {
          secret: this.config.getOrThrow('jwt.refreshSecret'),
        },
      );

      const token = await this.prisma.refreshToken.findUnique({
        where: {
          userId: payload.sub,
        },
      });

      if (token) {
        const match = this.isRefreshTokenMatch(
          dto.refreshToken,
          token.tokenHash,
        );

        if (match) {
          await this.prisma.refreshToken.delete({
            where: {
              id: token.id,
            },
          });
        }
      }

      return {
        message: 'Logged out',
      };
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload: JwtPayloadType = await this.jwtService.verifyAsync(
        dto.refreshToken,
        {
          secret: this.config.getOrThrow('jwt.refreshSecret'),
        },
      );

      const token = await this.prisma.refreshToken.findUnique({
        where: {
          userId: payload.sub,
        },
      });

      if (!token) {
        throw new UnauthorizedException();
      }

      const match = this.isRefreshTokenMatch(dto.refreshToken, token.tokenHash);

      if (!match) {
        throw new UnauthorizedException();
      }

      const user: UserType = await this.prisma.user.findUniqueOrThrow({
        where: {
          id: payload.sub,
        },
      });

      if (!user.isActive) {
        throw new UnauthorizedException();
      }

      const newTokens = await this.generateTokens(user);

      await this.saveRefreshToken(user.id, newTokens.refreshToken);
      return newTokens;
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  private async generateTokens(user: UserType) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow('jwt.accessSecret'),
      expiresIn: this.config.getOrThrow('jwt.accessExpiresIn'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow('jwt.refreshSecret'),
      expiresIn: this.config.getOrThrow('jwt.refreshExpiresIn'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const expiresAt = this.getRefreshTokenExpiresAt(refreshToken);

    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: userId,
      },
    });

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: tokenHash,
        userId: userId,
        expiresAt: expiresAt,
      },
    });
  }
}
