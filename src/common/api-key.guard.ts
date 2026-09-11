import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly allowedPaths = new Set([
    '/',
    '/auth/google',
    '/auth/google/callback',
  ]);

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { method: string }>();

    if (request.method === 'OPTIONS') {
      return true;
    }

    if (this.allowedPaths.has(request.path)) {
      return true;
    }

    const expected = process.env.API_KEY;
    const provided = request.header('x-api-key');

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('API key is missing or invalid');
    }

    return true;
  }
}
