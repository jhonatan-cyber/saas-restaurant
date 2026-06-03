import { Module } from '@nestjs/common';
import { CashMovementsService } from './cash-movements.service';
import { CashMovementsController } from './cash-movements.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [CashMovementsService],
  controllers: [CashMovementsController],
  exports: [CashMovementsService],
})
export class CashMovementsModule {}
