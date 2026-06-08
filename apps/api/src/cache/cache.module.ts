import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';

/**
 * Módulo global de caché.
 *
 * Expone `CacheService` a todos los módulos sin necesidad de importarlo
 * explícitamente. El servicio detecta automáticamente si Redis está
 * disponible y cae a memoria si no.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
