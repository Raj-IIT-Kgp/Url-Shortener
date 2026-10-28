import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private redis: RedisService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
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
