import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
        if (err || !user) {
            throw err || new UnauthorizedException();
        }
        return user;
    }
}

// Optional guard that doesn't throw if no token is provided (for anonymous URL creation)
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
        return user || null;
    }
}
