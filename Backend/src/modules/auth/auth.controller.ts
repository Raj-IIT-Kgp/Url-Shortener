import { Controller, Post, Body, HttpCode, HttpStatus, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User successfully created.' })
    @ApiResponse({ status: 409, description: 'Email already exists.' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login user' })
    @ApiResponse({ status: 200, description: 'User successfully logged in.' })
    @ApiResponse({ status: 401, description: 'Invalid credentials.' })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Get('api-key')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get current API key' })
    getApiKey(@Req() req: any) {
        return this.authService.getApiKey(req.user.id);
    }

    @Post('api-key/generate')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Generate a new API key (replaces old one)' })
    generateApiKey(@Req() req: any) {
        return this.authService.generateApiKey(req.user.id);
    }
}
