import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisModule } from '../../redis/redis.module';

@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'super-secret-key',
            signOptions: { expiresIn: '15m' },
        }),
        RedisModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, PrismaService],
    exports: [AuthService],
})
export class AuthModule {}
