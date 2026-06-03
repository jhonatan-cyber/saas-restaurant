import { Module } from '@nestjs/common';
import { PosStationsController } from './pos-stations.controller';
import { PosStationsService } from './pos-stations.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [PosStationsController],
  providers: [PosStationsService],
  exports: [PosStationsService],
})
export class PosStationsModule {}
