import { Injectable } from '@nestjs/common';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type ExcelJS from 'exceljs';
import type { ReportContext } from './report-generator.interface';
import { BaseReportGenerator } from './base.generator';

@Injectable()
export class TopProductsGenerator extends BaseReportGenerator {
  readonly type = 'TOP_PRODUCTS';

  async generate(ctx: ReportContext): Promise<Buffer> {
    const dateFrom = (ctx.params.dateFrom as string) ?? new Date().toISOString().slice(0, 10);
    const dateTo = (ctx.params.dateTo as string) ?? dateFrom;
    const limit = (ctx.params.limit as number) ?? 20;

    const startDate = new Date(`${dateFrom}T00:00:00Z`);
    const endDate = new Date(`${dateTo}T23:59:59Z`);

    // Top products by quantity sold
    const items = await ctx.prisma.orderItem.groupBy({
      by: ['productName'],
      where: {
        businessId: ctx.businessId,
        createdAt: { gte: startDate, lte: endDate },
        order: { status: 'PAID' },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const tableBody = [
      ['#', 'Producto', 'Cantidad', 'Total', '%'],
      ...items.map((item, i) => [
        String(i + 1),
        item.productName,
        String(item._sum.quantity ?? 0),
        `$${Number(item._sum.lineTotal ?? 0).toFixed(2)}`,
        '', // percentage
      ]),
    ];

    const totalQty = items.reduce((s, item) => s + (item._sum.quantity ?? 0), 0);

    // Recalculate percentages
    if (items.length > 1 && totalQty > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const qty = Number(item._sum?.quantity ?? 0);
        const row = tableBody[i + 1];
        if (row) row[4] = `${((qty / totalQty) * 100).toFixed(1)}%`;
      }
    }

    const pdfDef: TDocumentDefinitions = {
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      styles: this.baseStyles,
      content: [
        { text: 'Productos más vendidos', style: 'title' },
        { text: `${dateFrom} — ${dateTo}`, style: 'small', margin: [0, 0, 0, 12] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
          layout: 'lightHorizontalLines',
        },
      ],
    };

    const buildSheet = (wb: ExcelJS.Workbook): void => {
      const ws = wb.addWorksheet('Top productos');
      ws.columns = [
        { header: '#', key: 'num', width: 6 },
        { header: 'Producto', key: 'product', width: 40 },
        { header: 'Cantidad', key: 'qty', width: 10 },
        { header: 'Total', key: 'total', width: 14 },
        { header: '%', key: 'pct', width: 8 },
      ];
      items.forEach((item, i) => {
        const qty = Number(item._sum.quantity ?? 0);
        ws.addRow({
          num: i + 1,
          product: item.productName,
          qty,
          total: Number(item._sum.lineTotal ?? 0),
          pct: totalQty > 0 ? `${((qty / totalQty) * 100).toFixed(1)}%` : '0%',
        });
      });
    };

    return this.render(ctx, pdfDef, buildSheet);
  }
}
