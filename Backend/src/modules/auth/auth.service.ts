import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto, LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService
    ) {}

    async register(dto: RegisterDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email }
        });

        if (existingUser) {
            throw new ConflictException('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
            }
        });

        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: user.id, email: user.email }
        };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email }
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(dto.password, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: user.id, email: user.email, apiKey: user.apiKey }
        };
    }

    async generateApiKey(userId: string) {
        const apiKey = `snip_${bcrypt.hashSync(Date.now().toString() + userId, 10).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)}`;
        await this.prisma.user.update({
            where: { id: userId },
            data: { apiKey }
        });
        return { apiKey };
    }

    async getApiKey(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { apiKey: true }
        });
        return { apiKey: user?.apiKey };
    }
}
