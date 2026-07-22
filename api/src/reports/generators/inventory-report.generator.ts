import { Injectable } from '@nestjs/common';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type ExcelJS from 'exceljs';
import type { ReportContext } from './report-generator.interface';
import { BaseReportGenerator } from './base.generator';

@Injectable()
export class InventoryReportGenerator extends BaseReportGenerator {
  readonly type = 'INVENTORY';

  async generate(ctx: ReportContext): Promise<Buffer> {
    // Filtro opcional por branchId
    const where: Record<string, unknown> = {
      businessId: ctx.businessId,
      trackStock: true,
    };
    if (ctx.params.branchId) {
      where.branchId = ctx.params.branchId;
    }

    const products = await ctx.prisma.product.findMany({
      where: where as any,
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minStock: true,
        cost: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const totalValue = products.reduce((s, p) => s + Number(p.currentStock) * Number(p.cost ?? 0), 0);
    const lowStockItems = products.filter((p) => p.minStock !== null && Number(p.currentStock) <= p.minStock!);

    const tableBody = [
      ['Producto', 'SKU', 'Categoría', 'Stock Actual', 'Stock Mín.', 'Costo Prom.', 'Valor Total'],
      ...products.map((p) => [
        p.name,
        p.sku ?? '—',
        p.category?.name ?? '—',
        String(Number(p.currentStock).toFixed(2)),
        p.minStock !== null ? String(p.minStock) : '—',
        p.cost ? `$${Number(p.cost).toFixed(2)}` : '—',
        `$${(Number(p.currentStock) * Number(p.cost ?? 0)).toFixed(2)}`,
      ]),
    ];

    const pdfDef: TDocumentDefinitions = {
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      styles: this.baseStyles,
      content: [
        { text: 'Valorización de inventario', style: 'title' },
        { text: `Productos: ${products.length} | Stock bajo: ${lowStockItems.length} | Valor total: $${totalValue.toFixed(2)}`, style: 'small', margin: [0, 0, 0, 12] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
          layout: 'lightHorizontalLines',
        },
        ...(lowStockItems.length > 0
          ? [
              { text: '\n⚠️ Productos con stock bajo', style: 'subheader' },
              {
                ul: lowStockItems.map(
                  (p) => `${p.name} — Stock: ${Number(p.currentStock).toFixed(2)} / Mín: ${p.minStock}`,
                ),
              },
            ]
          : [{ text: '\n✅ Todos los productos tienen stock suficiente', style: 'small' }]),
      ],
    };

    const buildSheet = (wb: ExcelJS.Workbook): void => {
      const ws = wb.addWorksheet('Inventario');
      ws.columns = [
        { header: 'Producto', key: 'name', width: 35 },
        { header: 'SKU', key: 'sku', width: 14 },
        { header: 'Categoría', key: 'category', width: 16 },
        { header: 'Stock Actual', key: 'stock', width: 14 },
        { header: 'Stock Mín.', key: 'minStock', width: 12 },
        { header: 'Costo Prom.', key: 'cost', width: 14 },
        { header: 'Valor Total', key: 'value', width: 14 },
      ];
      products.forEach((p) =>
        ws.addRow({
          name: p.name,
          sku: p.sku ?? '—',
          category: p.category?.name ?? '—',
          stock: Number(p.currentStock),
          minStock: p.minStock ?? '—',
          cost: p.cost ? Number(p.cost) : '—',
          value: Number(p.currentStock) * Number(p.cost ?? 0),
        }),
      );
      ws.addRow({});
      ws.addRow({ name: 'VALOR TOTAL', value: totalValue });
    };

    return this.render(ctx, pdfDef, buildSheet);
  }
}
