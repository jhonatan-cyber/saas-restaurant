import { Injectable } from '@nestjs/common';
import { ReportType } from '@saas/shared';
import type { IReportGenerator } from './report-generator.interface';
import { SalesDailyGenerator } from './sales-daily.generator';
import { SalesRangeGenerator } from './sales-range.generator';
import { TopProductsGenerator } from './top-products.generator';
import { InventoryReportGenerator } from './inventory-report.generator';

@Injectable()
export class ReportGeneratorFactory {
  private readonly generators: Map<string, IReportGenerator>;

  constructor(
    private readonly salesDaily: SalesDailyGenerator,
    private readonly salesRange: SalesRangeGenerator,
    private readonly topProducts: TopProductsGenerator,
    private readonly inventoryReport: InventoryReportGenerator,
  ) {
    this.generators = new Map(
      [salesDaily, salesRange, topProducts, inventoryReport].map((g) => [g.type, g]),
    );
  }

  getGenerator(type: string): IReportGenerator {
    const gen = this.generators.get(type);
    if (!gen) {
      throw new Error(`No hay generador para el tipo de reporte: ${type}`);
    }
    return gen;
  }

  getSupportedTypes(): string[] {
    return Array.from(this.generators.keys());
  }
}
