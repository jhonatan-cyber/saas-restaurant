import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsProcessor } from './reports.processor';
import { ReportGeneratorFactory } from './generators/report-generator.factory';
import { SalesDailyGenerator } from './generators/sales-daily.generator';
import { SalesRangeGenerator } from './generators/sales-range.generator';
import { TopProductsGenerator } from './generators/top-products.generator';
import { InventoryReportGenerator } from './generators/inventory-report.generator';
import { ReportStorageService } from './storage/report-storage.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'reports' }),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsProcessor,
    ReportGeneratorFactory,
    SalesDailyGenerator,
    SalesRangeGenerator,
    TopProductsGenerator,
    InventoryReportGenerator,
    ReportStorageService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
