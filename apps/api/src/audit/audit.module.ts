import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * AuditModule (global).
 * Phase 2: solo expone AuditService para uso en otros módulos.
 * Phase 4 sumará controller, modelo Prisma y endpoints de consulta.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
