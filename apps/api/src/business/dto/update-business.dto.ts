import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional({ example: 'Mi Restaurante' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Mi Restaurante SRL' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ example: '123456789012' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ example: 'contacto@ejemplo.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+591 76543210' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'BOB' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'America/La_Paz' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  moduleReports?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  moduleInventory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  modulePosStations?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  moduleDeliveryApp?: boolean;
}
