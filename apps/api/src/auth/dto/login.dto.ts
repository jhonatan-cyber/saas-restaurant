import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO para login multi-tenant.
 * El `businessSlug` identifica al tenant; el `email` se busca DENTRO de ese tenant.
 */
export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: '[email protected]',
  })
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email!: string;

  @ApiProperty({
    description: 'Contraseña',
    example: 'Owner123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;

  @ApiProperty({
    description: 'Slug del negocio (tenant). Identifica a cuál restaurante se quiere entrar.',
    example: 'demo',
  })
  @IsString()
  @IsNotEmpty({ message: 'El slug del negocio es obligatorio' })
  @MaxLength(64)
  businessSlug!: string;
}
