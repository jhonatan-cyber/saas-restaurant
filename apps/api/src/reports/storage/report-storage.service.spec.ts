import { Test, TestingModule } from '@nestjs/testing';
import { ReportStorageService } from './report-storage.service';
import { ConfigService } from '@nestjs/config';
import fs from 'node:fs/promises';
import path from 'node:path';

jest.mock('node:fs/promises');

describe('ReportStorageService', () => {
  let service: ReportStorageService;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(async () => {
    mockFs = jest.mocked(fs);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REPORTS_STORAGE_DIR') return '/tmp/reports';
              if (key === 'REPORTS_BASE_URL') return '/uploads/reports';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ReportStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('store', () => {
    it('creates directory and writes file', async () => {
      const buffer = Buffer.from('PDF content');

      const result = await service.store('biz-1', 'rep-1', 'PDF', buffer);

      // Usar path.join para comparación cross-platform
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join('/tmp/reports', 'biz-1'),
        { recursive: true },
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/tmp/reports', 'biz-1', 'rep-1.pdf'),
        buffer,
      );
      expect(result).toEqual({
        url: '/uploads/reports/biz-1/rep-1.pdf',
        size: 11, // 'PDF content' length
      });
    });

    it('uses .xlsx extension for XLSX format', async () => {
      const buffer = Buffer.from('spreadsheet');

      const result = await service.store('biz-1', 'rep-2', 'XLSX', buffer);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/tmp/reports', 'biz-1', 'rep-2.xlsx'),
        buffer,
      );
      expect(result.url).toContain('rep-2.xlsx');
    });

    it('uses configurable base dir and URL', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReportStorageService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'REPORTS_STORAGE_DIR') return '/custom/path';
                if (key === 'REPORTS_BASE_URL') return 'https://cdn.example.com/reports';
                return null;
              }),
            },
          },
        ],
      }).compile();
      const customService = module.get(ReportStorageService);

      const result = await customService.store('biz-1', 'rep-1', 'PDF', Buffer.from('data'));

      expect(result.url).toBe('https://cdn.example.com/reports/biz-1/rep-1.pdf');
    });
  });
});
