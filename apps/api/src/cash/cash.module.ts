import { Module } from '@nestjs/common';
import { CashService } from './cash.service';
import { CashController } from './cash.controller';
import { AuditModule } from '../audit/audit.module';

/**
 * CashModule (FASE 4).
 *
 * - CRUD de CashRegister.
 * - Apertura/cierre de Shift con arqueo.
 * - Cálculo de expectedAmount basado en payments + movements.
 *
 * Reemplaza la funcionalidad read-only de CashFoundationModule. Este módulo
 * NO elimina cash-foundation: ese sigue siendo usado por OrdersService para
 * validar OPEN cash+shift antes de crear una orden. Ambos coexisten (cash
 * hace el CRUD, cash-foundation hace el lookup).
 */
@Module({
  imports: [AuditModule],
  providers: [CashService],
  controllers: [CashController],
  exports: [CashService],
})
export class CashModule {}
