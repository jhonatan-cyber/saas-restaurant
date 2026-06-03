import { Injectable } from '@nestjs/common';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type ExcelJS from 'exceljs';
import type { ReportContext } from './report-generator.interface';
import { BaseReportGenerator } from './base.generator';

@Injectable()
export class SalesDailyGenerator extends BaseReportGenerator {
  readonly type = 'SALES_DAILY';

  async generate(ctx: ReportContext): Promise<Buffer> {
    const dateStr = (ctx.params.date as string) ?? new Date().toISOString().slice(0, 10);
    const startDate = new Date(`${dateStr}T00:00:00Z`);
    const endDate = new Date(`${dateStr}T23:59:59Z`);

    const rawOrders = await ctx.prisma.order.findMany({
      where: {
        businessId: ctx.businessId,
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'CANCELLED'] },
      },
      include: {
        cashier: { select: { fullName: true } },
        payments: { select: { method: true, amount: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const orders = rawOrders.map((o) => ({
      createdAt: o.createdAt,
      status: o.status,
      total: Number(o.total),
      cashier: o.cashier,
      type: o.type,
    }));

    const totalRevenue = orders
      .filter((o) => o.status === 'PAID')
      .reduce((s, o) => s + o.total, 0);
    const totalCancelled = orders
      .filter((o) => o.status === 'CANCELLED')
      .reduce((s, o) => s + o.total, 0);

    const tableBody = [
      ['#', 'Hora', 'Cajero', 'Tipo', 'Estado', 'Total'],
      ...orders.map((o, i) => [
        String(i + 1),
        o.createdAt.toISOString().slice(11, 19),
        o.cashier?.fullName ?? '—',
        String(o.type),
        o.status,
        `$${o.total.toFixed(2)}`,
      ]),
    ];

    const pdfDef: TDocumentDefinitions = {
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      styles: this.baseStyles,
      content: [
        { text: `Ventas del día — ${dateStr}`, style: 'title' },
        { text: `Órdenes: ${orders.length} | Ingresos: $${totalRevenue.toFixed(2)} | Cancelado: $${totalCancelled.toFixed(2)}`, style: 'small', margin: [0, 0, 0, 12] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
          layout: 'lightHorizontalLines',
        },
      ],
    };

    const buildSheet = (wb: ExcelJS.Workbook): void => {
      const ws = wb.addWorksheet('Ventas del día');
      ws.columns = [
        { header: '#', key: 'num', width: 6 },
        { header: 'Hora', key: 'time', width: 10 },
        { header: 'Cajero', key: 'cashier', width: 20 },
        { header: 'Tipo', key: 'type', width: 12 },
        { header: 'Estado', key: 'status', width: 14 },
        { header: 'Total', key: 'total', width: 12 },
      ];
      orders.forEach((o, i) =>
        ws.addRow({
          num: i + 1,
          time: o.createdAt.toISOString().slice(11, 19),
          cashier: o.cashier?.fullName ?? '—',
          type: String(o.type),
          status: o.status,
          total: o.total,
        }),
      );
      ws.addRow({});
      ws.addRow({ num: 'TOTAL', total: totalRevenue });
    };

    return this.render(ctx, pdfDef, buildSheet);
  }
}
