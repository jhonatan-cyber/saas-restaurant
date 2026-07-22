import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrintModule } from '../print/print.module';
import { AuditModule } from '../audit/audit.module';
import { CashFoundationModule } from '../cash-foundation/cash-foundation.module';

@Module({
  imports: [AuditModule, CashFoundationModule, PrintModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
