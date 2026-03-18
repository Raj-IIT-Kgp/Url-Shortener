import { IsUrl, IsOptional, IsString, Length, IsDateString } from 'class-validator';

export class CreateUrlDto {
    @IsUrl()
    originalUrl: string;

    @IsOptional()
    @IsString()
    @Length(4, 10)
    customAlias?: string;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}