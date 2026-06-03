import path from 'node:path';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import ExcelJS from 'exceljs';
import type { ReportContext } from './report-generator.interface';

let printer: PdfPrinter | null = null;

function resolvePdfmakeFontsDir(): string {
  // Busca pdfmake en node_modules (hoisted o local)
  const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
  return path.join(pdfmakeDir, 'fonts');
}

function getPrinter(): PdfPrinter {
  if (!printer) {
    const fontsDir = resolvePdfmakeFontsDir();
    // Usamos Roboto incluido con pdfmake
    const fonts = {
      Roboto: {
        normal: path.join(fontsDir, 'Roboto', 'Roboto-Regular.ttf'),
        bold: path.join(fontsDir, 'Roboto', 'Roboto-Medium.ttf'),
        italics: path.join(fontsDir, 'Roboto', 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsDir, 'Roboto', 'Roboto-MediumItalic.ttf'),
      },
    };
    printer = new PdfPrinter(fonts);
  }
  return printer;
}

export abstract class BaseReportGenerator {
  abstract readonly type: string;

  abstract generate(ctx: ReportContext): Promise<Buffer>;

  /**
   * Genera un PDF a partir de una definición de documento pdfmake.
   */
  protected async buildPdf(docDef: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const p = getPrinter();
      const pdfDoc: any = p.createPdfKitDocument(docDef);
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  /**
   * Construye un XLSX llamando a buildSheet que recibe el workbook.
   */
  protected async buildXlsx(
    buildSheet: (workbook: ExcelJS.Workbook) => void,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SaaS Restaurant';
    buildSheet(workbook);
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /**
   * Renderiza el buffer final según el formato solicitado.
   * Cada subclase implementa generate() y usa este helper.
   */
  protected async render(
    ctx: ReportContext,
    pdfDef: TDocumentDefinitions,
    buildSheet: (workbook: ExcelJS.Workbook) => void,
  ): Promise<Buffer> {
    if (ctx.format === 'XLSX') {
      return this.buildXlsx(buildSheet);
    }
    return this.buildPdf(pdfDef);
  }

  /**
   * Estilos base compartidos entre reportes.
   */
  protected baseStyles = {
    header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] as [number, number, number, number] },
    subheader: { fontSize: 12, bold: true, margin: [0, 16, 0, 6] as [number, number, number, number] },
    tableHeader: { fontSize: 9, bold: true, fillColor: '#e2e8f0' as string },
    cell: { fontSize: 9 },
    small: { fontSize: 8, color: '#64748b' as string },
    title: { fontSize: 20, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
  };
}
