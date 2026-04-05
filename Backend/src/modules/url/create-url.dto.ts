import { IsUrl, IsOptional, IsString, Length, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUrlDto {
    @ApiProperty({
        description: 'The URL to shorten. Must be a valid http or https URL.',
        example: 'https://www.example.com/some/very/long/path',
    })
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: true })
    originalUrl: string;

    @ApiPropertyOptional({
        description: 'Custom short code alias (4–10 characters). Must be unique.',
        example: 'my-link',
        minLength: 4,
        maxLength: 10,
    })
    @IsOptional()
    @IsString()
    @Length(4, 10)
    customAlias?: string;

    @ApiPropertyOptional({
        description: 'ISO 8601 expiry date. Must be a future date.',
        example: '2026-12-31T23:59:59.000Z',
    })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}
