/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // Don't wrap file responses in JSON
        if (data instanceof StreamableFile) {
          return data;
        }

        return {
          success: true,
          statusCode: res.statusCode,
          message: data?.message ?? 'Success',
          data: data?.data ?? data,
        };
      }),
    );
  }
}
