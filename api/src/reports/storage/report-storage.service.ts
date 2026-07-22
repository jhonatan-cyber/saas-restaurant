import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'node:fs/promises';
import path from 'node:path';

@Injectable()
export class ReportStorageService {
  private readonly logger = new Logger(ReportStorageService.name);
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    // Los reportes se guardan en ./uploads/reports/ (relativo al CWD)
    this.baseDir = this.config.get<string>('REPORTS_STORAGE_DIR') ?? path.join(process.cwd(), 'uploads', 'reports');
    this.baseUrl = this.config.get<string>('REPORTS_BASE_URL') ?? '/uploads/reports';
  }

  /**
   * Guarda el buffer en disco y retorna URL + tamaño.
   */
  async store(
    businessId: string,
    reportId: string,
    format: string,
    buffer: Buffer,
  ): Promise<{ url: string; size: number }> {
    const dir = path.join(this.baseDir, businessId);
    await fs.mkdir(dir, { recursive: true });

    const ext = format.toLowerCase() === 'xlsx' ? 'xlsx' : 'pdf';
    const filename = `${reportId}.${ext}`;
    const filepath = path.join(dir, filename);

    await fs.writeFile(filepath, buffer);
    this.logger.log(`Reporte guardado: ${filepath} (${buffer.length} bytes)`);

    return {
      url: `${this.baseUrl}/${businessId}/${filename}`,
      size: buffer.length,
    };
  }
}
