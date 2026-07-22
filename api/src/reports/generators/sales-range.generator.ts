import { Injectable } from '@nestjs/common';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type ExcelJS from 'exceljs';
import type { ReportContext } from './report-generator.interface';
import { BaseReportGenerator } from './base.generator';

@Injectable()
export class SalesRangeGenerator extends BaseReportGenerator {
  readonly type = 'SALES_RANGE';

  async generate(ctx: ReportContext): Promise<Buffer> {
    const dateFrom = (ctx.params.dateFrom as string) ?? new Date().toISOString().slice(0, 10);
    const dateTo = (ctx.params.dateTo as string) ?? dateFrom;

    const startDate = new Date(`${dateFrom}T00:00:00Z`);
    const endDate = new Date(`${dateTo}T23:59:59Z`);

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
    }));

    const paidOrders = orders.filter((o) => o.status === 'PAID');
    const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
    const totalCancelled = orders
      .filter((o) => o.status === 'CANCELLED')
      .reduce((s, o) => s + o.total, 0);
    const orderCount = paidOrders.length;
    const averageTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

    const tableBody = [
      ['Fecha', '# Órdenes', 'Ingresos', 'Cancelado', 'Ticket Prom.'],
      ...this.groupByDate(orders).map((g) => [
        g.date,
        String(g.count),
        `$${g.revenue.toFixed(2)}`,
        `$${g.cancelled.toFixed(2)}`,
        `$${g.average.toFixed(2)}`,
      ]),
      [
        { text: 'TOTAL', bold: true },
        { text: String(orderCount), bold: true },
        { text: `$${totalRevenue.toFixed(2)}`, bold: true },
        { text: `$${totalCancelled.toFixed(2)}`, bold: true },
        { text: `$${averageTicket.toFixed(2)}`, bold: true },
      ],
    ];

    const pdfDef: TDocumentDefinitions = {
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      styles: this.baseStyles,
      content: [
        { text: 'Ventas por rango', style: 'title' },
        { text: `${dateFrom} — ${dateTo}`, style: 'small', margin: [0, 0, 0, 4] },
        { text: `Total órdenes: ${orderCount} | Ingresos: $${totalRevenue.toFixed(2)} | Ticket prom.: $${averageTicket.toFixed(2)}`, style: 'small', margin: [0, 0, 0, 12] },
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
          layout: 'lightHorizontalLines',
        },
      ],
    };

    const buildSheet = (wb: ExcelJS.Workbook): void => {
      const ws = wb.addWorksheet('Ventas por rango');
      ws.columns = [
        { header: 'Fecha', key: 'date', width: 14 },
        { header: 'Órdenes', key: 'count', width: 12 },
        { header: 'Ingresos', key: 'revenue', width: 14 },
        { header: 'Cancelado', key: 'cancelled', width: 14 },
        { header: 'Ticket Prom.', key: 'average', width: 14 },
      ];
      this.groupByDate(orders).forEach((g) => ws.addRow(g));
      ws.addRow({ date: 'TOTAL', count: orderCount, revenue: totalRevenue, cancelled: totalCancelled, average: averageTicket });
    };

    return this.render(ctx, pdfDef, buildSheet);
  }

  private groupByDate(
    orders: Array<{ createdAt: Date; status: string; total: number }>,
  ): Array<{ date: string; count: number; revenue: number; cancelled: number; average: number }> {
    type GroupData = { count: number; revenue: number; cancelled: number };
    const map = new Map<string, { count: number; revenue: number; cancelled: number }>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const prev = map.get(key) ?? { count: 0, revenue: 0, cancelled: 0 };
      prev.count++;
      if (o.status === 'PAID') prev.revenue += Number(o.total);
      else prev.cancelled += Number(o.total);
      map.set(key, prev);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        count: data.count,
        revenue: data.revenue,
        cancelled: data.cancelled,
        average: data.count > 0 ? data.revenue / data.count : 0,
      }));
  }
}
