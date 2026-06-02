import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * UsersModule: provee UsersService para AuthModule.
 * En Phase 2+ se le añadirá controller con endpoints de gestión de usuarios.
 */
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
