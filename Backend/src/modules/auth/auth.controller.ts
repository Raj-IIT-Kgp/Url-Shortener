import {
    Controller, Post, Body, HttpCode, HttpStatus,
    Get, Req, Res, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({ summary: 'Register — returns access token in body; refresh token set as httpOnly cookie' })
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 409, description: 'Email already exists.' })
    async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.register(dto);
        res.cookie('refresh_token', result.refresh_token, this.authService.refreshCookieOptions);
        const { refresh_token, ...body } = result;
        return body;
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login — returns access token in body; refresh token set as httpOnly cookie' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 401, description: 'Invalid credentials.' })
    @ApiResponse({ status: 429, description: 'Account locked after 5 failed attempts.' })
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(dto);
        res.cookie('refresh_token', result.refresh_token, this.authService.refreshCookieOptions);
        const { refresh_token, ...body } = result;
        return body;
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Rotate refresh token (read from cookie) and issue a new access token' })
    @ApiResponse({ status: 200 })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken: string | undefined = (req as any).cookies?.['refresh_token'];
        if (!refreshToken) throw new Error('No refresh token cookie');
        const result = await this.authService.refresh(refreshToken);
        res.cookie('refresh_token', result.refresh_token, this.authService.refreshCookieOptions);
        const { refresh_token, ...body } = result;
        return body;
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout — invalidates refresh token cookie and blocklists access token jti' })
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken: string | undefined = (req as any).cookies?.['refresh_token'];
        const authHeader = req.headers.authorization;
        const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
        res.cookie('refresh_token', '', this.authService.clearCookieOptions);
        return this.authService.logout(refreshToken, accessToken);
    }

    @Get('api-key')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Returns whether the user has an active API key (never exposes hash)' })
    getApiKey(@Req() req: any) {
        return this.authService.getApiKey(req.user.id);
    }

    @Post('api-key/generate')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Generate a new API key — plaintext returned ONCE; stored as SHA-256 hash' })
    generateApiKey(@Req() req: any) {
        return this.authService.generateApiKey(req.user.id);
    }
}
