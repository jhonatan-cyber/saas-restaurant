import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule global.
 * Importar PrismaService en cualquier módulo para tener acceso al cliente.
 * El servicio maneja el ciclo de vida de la conexión (OnModuleInit/Destroy).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
