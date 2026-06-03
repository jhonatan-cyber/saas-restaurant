import { Module } from '@nestjs/common';
import { CashFoundationService } from './cash-foundation.service';

/**
 * CashFoundationModule: provee `CashFoundationService` (read-only en F3).
 * Será reemplazado/extendido por el módulo completo de caja en F4.
 */
@Module({
  providers: [CashFoundationService],
  exports: [CashFoundationService],
})
export class CashFoundationModule {}
