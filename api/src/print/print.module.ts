import { Module } from '@nestjs/common';
import { PrintService } from './print.service';

/**
 * PrintModule — Fire-and-forget printing integration.
 *
 * Provides PrintService for sending kitchen comandas and other
 * print jobs to the external print-agent microservice.
 *
 * Depends on ConfigService (global) and PrismaService (global).
 */
@Module({
  providers: [PrintService],
  exports: [PrintService],
})
export class PrintModule {}
