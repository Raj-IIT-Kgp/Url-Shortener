import { IsUrl, IsOptional, IsString, Length, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

    @ApiPropertyOptional({
        description: 'Self-destruct after this many clicks (1–1,000,000).',
        example: 10,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(1_000_000)
    maxClicks?: number;

    @ApiPropertyOptional({
        description: 'Password to protect the link. Min 4 characters.',
        example: 'secret123',
    })
    @IsOptional()
    @IsString()
    @Length(4, 100)
    password?: string;
    @ApiPropertyOptional({
        description: 'Webhook URL to hit when the link is clicked.',
        example: 'https://webhook.site/xxx',
    })
    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    webhookUrl?: string;
}
