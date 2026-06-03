import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CashFoundationModule } from '../cash-foundation/cash-foundation.module';
import { AuditModule } from '../audit/audit.module';

/**
 * OrdersModule: expone controller + service.
 *
 * Dependencias:
 *  - CashFoundationModule: para validar OPEN cash + OPEN shift.
 *  - AuditModule: para loggear cambios de estado.
 *  - RealtimeModule (global): inyecta RealtimeGateway para emitir eventos.
 */
@Module({
  imports: [CashFoundationModule, AuditModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
