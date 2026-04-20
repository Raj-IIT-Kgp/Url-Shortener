import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { RegisterDto, LoginDto } from './auth.dto';

const REFRESH_TTL = 7 * 24 * 60 * 60;   // 7 days (seconds)
const FAMILY_TTL  = 7 * 24 * 60 * 60;   // same lifetime as refresh tokens
const LOGIN_WINDOW = 15 * 60;            // 15-minute sliding window for attempts
const MAX_ATTEMPTS = 5;                  // lockout after this many failures
const LOCKOUT_TTL  = 15 * 60;           // 15-minute lockout

interface RefreshPayload {
    userId: string;
    familyId: string;
}

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private redis: RedisService,
    ) {}

    // ── Token helpers ────────────────────────────────────────────────────────

    private async generateTokens(userId: string, email: string, existingFamilyId?: string) {
        // jti allows the access token to be individually revoked (blocklist)
        const jti = crypto.randomUUID();
        const access_token = this.jwtService.sign(
            { sub: userId, email, jti },
            { expiresIn: '15m' },
        );

        // Refresh tokens belong to a family so replay attacks can be detected
        const familyId = existingFamilyId ?? crypto.randomBytes(16).toString('hex');
        const refresh_token = crypto.randomBytes(32).toString('hex');
        const payload: RefreshPayload = { userId, familyId };
        await this.redis.set(`refresh:${refresh_token}`, JSON.stringify(payload), REFRESH_TTL);

        return { access_token, refresh_token };
    }

    private buildCookieOptions(maxAge: number) {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            path: '/auth',
            maxAge,
        };
    }

    get refreshCookieOptions() {
        return this.buildCookieOptions(REFRESH_TTL * 1000);
    }

    get clearCookieOptions() {
        return this.buildCookieOptions(0);
    }

    // ── Brute-force helpers ──────────────────────────────────────────────────

    private async checkBruteForce(email: string) {
        const locked = await this.redis.get(`login_locked:${email}`);
        if (locked) {
            throw new HttpException(
                'Too many failed attempts. Account locked for 15 minutes.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    private async recordFailedAttempt(email: string) {
        const key = `login_attempts:${email}`;
        const count = await this.redis.incr(key);
        if (count === 1) await this.redis.expire(key, LOGIN_WINDOW);
        if (count >= MAX_ATTEMPTS) {
            await this.redis.set(`login_locked:${email}`, '1', LOCKOUT_TTL);
            await this.redis.del(key);
        }
    }

    private async clearLoginAttempts(email: string) {
        await this.redis.del(`login_attempts:${email}`);
        await this.redis.del(`login_locked:${email}`);
    }

    // ── Auth flows ───────────────────────────────────────────────────────────

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) throw new ConflictException('Email already in use');

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const user = await this.prisma.user.create({
            data: { email: dto.email, password: hashedPassword },
        });

        const tokens = await this.generateTokens(user.id, user.email);
        return { ...tokens, user: { id: user.id, email: user.email } };
    }

    async login(dto: LoginDto) {
        await this.checkBruteForce(dto.email);

        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) {
            // Record attempt even for unknown emails to prevent timing-based enumeration
            await this.recordFailedAttempt(dto.email);
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) {
            await this.recordFailedAttempt(dto.email);
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.clearLoginAttempts(dto.email);
        const tokens = await this.generateTokens(user.id, user.email);
        return { ...tokens, user: { id: user.id, email: user.email, hasApiKey: !!user.apiKey } };
    }

    async refresh(refreshToken: string) {
        const stored = await this.redis.get(`refresh:${refreshToken}`);

        if (!stored) {
            // Token not in Redis — it was already used or never existed.
            // Check if this is a known familyId by trying to find it in revoked families.
            // (We can't determine the family without the payload, so just reject.)
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const { userId, familyId }: RefreshPayload = JSON.parse(stored);

        // Detect replay: if family is revoked, a stolen token is being replayed
        const familyRevoked = await this.redis.get(`revoked_family:${familyId}`);
        if (familyRevoked) {
            throw new UnauthorizedException(
                'Session invalidated due to suspicious activity. Please log in again.',
            );
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('User not found');

        // Rotation: delete the used token, issue a new one in the same family
        await this.redis.del(`refresh:${refreshToken}`);
        const tokens = await this.generateTokens(user.id, user.email, familyId);
        return { ...tokens, user: { id: user.id, email: user.email } };
    }

    async logout(refreshToken: string | undefined, accessToken?: string) {
        if (refreshToken) {
            const stored = await this.redis.get(`refresh:${refreshToken}`);
            if (stored) {
                const { familyId }: RefreshPayload = JSON.parse(stored);
                // Revoke the whole family — any sibling tokens become invalid too
                await this.redis.set(`revoked_family:${familyId}`, '1', FAMILY_TTL);
                await this.redis.del(`refresh:${refreshToken}`);
            }
        }

        // Blocklist the access token by its jti so it can't be used for up to 15 more minutes
        if (accessToken) {
            try {
                const decoded = this.jwtService.decode(accessToken) as { jti?: string; exp?: number } | null;
                if (decoded?.jti && decoded?.exp) {
                    const remainingTtl = decoded.exp - Math.floor(Date.now() / 1000);
                    if (remainingTtl > 0) {
                        await this.redis.set(`blocklist:${decoded.jti}`, '1', remainingTtl);
                    }
                }
            } catch {
                // Malformed token — safe to ignore
            }
        }

        return { success: true };
    }

    // ── API keys (SHA-256 hashed) ────────────────────────────────────────────

    async generateApiKey(userId: string) {
        const plain = `snip_${crypto.randomBytes(24).toString('hex')}`;
        const hash = crypto.createHash('sha256').update(plain).digest('hex');
        await this.prisma.user.update({ where: { id: userId }, data: { apiKey: hash } });
        // Return plaintext ONCE — it can never be recovered from the stored hash
        return { apiKey: plain };
    }

    async getApiKey(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { apiKey: true },
        });
        // Never expose the hash — return only whether a key exists
        return { hasApiKey: !!user?.apiKey };
    }
}
