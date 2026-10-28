import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import { OptionalAuthRequest } from './authenticated-request';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthRequest>();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey || typeof apiKey !== 'string') return true;

    // Compare SHA-256 hash of incoming key against stored hash — plaintext never hits the DB
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const user = await this.prisma.user.findUnique({ where: { apiKey: hash } });
    if (!user) throw new UnauthorizedException('Invalid API key');

    request.user = { id: user.id, email: user.email };
    return true;
  }
}
