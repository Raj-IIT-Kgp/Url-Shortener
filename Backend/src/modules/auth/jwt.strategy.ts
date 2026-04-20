import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private redis: RedisService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'super-secret-key',
        });
    }

    async validate(payload: { sub: string; email: string; jti?: string }) {
        // Reject tokens that were explicitly revoked at logout (jti blocklist)
        if (payload.jti) {
            const blocked = await this.redis.get(`blocklist:${payload.jti}`);
            if (blocked) throw new UnauthorizedException('Token has been revoked');
        }
        return { id: payload.sub, email: payload.email };
    }
}
