import { toReportDto, type ReportRow } from './mappers';
import { dateToString } from '../common/mapper';

const mockDate = new Date('2025-06-01T12:00:00Z');

function makeReportRow(overrides: Partial<ReportRow> = {}): ReportRow {
  return {
    id: 'report-1',
    businessId: 'biz-1',
    type: 'SALES_SUMMARY',
    format: 'PDF',
    status: 'COMPLETED',
    params: { dateFrom: '2025-05-01', dateTo: '2025-05-31' },
    resultUrl: 'https://storage.example.com/report-1.pdf',
    resultSize: 1024000,
    errorMessage: null,
    completedAt: mockDate,
    expiresAt: new Date('2025-07-01T12:00:00Z'),
    requestedBy: 'user-1',
    createdAt: mockDate,
    updatedAt: mockDate,
    ...overrides,
  };
}

describe('toReportDto', () => {
  it('maps all fields correctly', () => {
    const row = makeReportRow();
    const result = toReportDto(row);

    expect(result).toEqual({
      id: 'report-1',
      businessId: 'biz-1',
      type: 'SALES_SUMMARY',
      format: 'PDF',
      status: 'COMPLETED',
      params: { dateFrom: '2025-05-01', dateTo: '2025-05-31' },
      resultUrl: 'https://storage.example.com/report-1.pdf',
      resultSize: 1024000,
      errorMessage: null,
      completedAt: dateToString(mockDate),
      expiresAt: dateToString(new Date('2025-07-01T12:00:00Z')),
      requestedBy: 'user-1',
      createdAt: dateToString(mockDate),
      updatedAt: dateToString(mockDate),
    });
  });

  it('handles null resultUrl, resultSize, errorMessage', () => {
    const row = makeReportRow({
      resultUrl: null,
      resultSize: null,
      errorMessage: null,
    });
    const result = toReportDto(row);

    expect(result.resultUrl).toBeNull();
    expect(result.resultSize).toBeNull();
    expect(result.errorMessage).toBeNull();
  });

  it('handles pending status with null completion/expiry dates', () => {
    const row = makeReportRow({
      status: 'PENDING',
      completedAt: null,
      expiresAt: null,
      resultUrl: null,
      resultSize: null,
    });
    const result = toReportDto(row);

    expect(result.status).toBe('PENDING');
    expect(result.completedAt).toBeNull();
    expect(result.expiresAt).toBeNull();
    expect(result.resultUrl).toBeNull();
    expect(result.resultSize).toBeNull();
  });

  it('handles error status with errorMessage', () => {
    const row = makeReportRow({
      status: 'ERROR',
      errorMessage: 'Failed to generate report: timeout',
      completedAt: null,
    });
    const result = toReportDto(row);

    expect(result.status).toBe('ERROR');
    expect(result.errorMessage).toBe('Failed to generate report: timeout');
    expect(result.completedAt).toBeNull();
  });

  it('handles empty params', () => {
    const row = makeReportRow({ params: {} });
    const result = toReportDto(row);

    expect(result.params).toEqual({});
  });

  it('converts dates correctly', () => {
    const row = makeReportRow();
    const result = toReportDto(row);

    expect(result.createdAt).toBe(dateToString(mockDate));
    expect(result.updatedAt).toBe(dateToString(mockDate));
  });
});
