import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        if (!apiKey) {
            return false;
        }

        const user = await this.prisma.user.findUnique({
            where: { apiKey },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid API Key');
        }

        request.user = user;
        return true;
    }
}
