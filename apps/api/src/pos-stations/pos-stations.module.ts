import { Module } from '@nestjs/common';
import { PosStationsController } from './pos-stations.controller';
import { PosStationsService } from './pos-stations.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [PosStationsController],
  providers: [PosStationsService],
  exports: [PosStationsService],
})
export class PosStationsModule {}
