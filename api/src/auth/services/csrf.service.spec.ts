import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  let service: CsrfService;

  beforeEach(() => {
    service = new CsrfService();
  });

  // ── generateToken ─────────────────────────────────────────────────────────

  describe('generateToken', () => {
    it('returns a 64-character hex string', () => {
      const token = service.generateToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns different values on consecutive calls', () => {
      const t1 = service.generateToken();
      const t2 = service.generateToken();
      expect(t1).not.toBe(t2);
    });

    it('produces cryptographically random output (32 bytes = 64 hex chars)', () => {
      const token = service.generateToken();
      expect(Buffer.byteLength(token, 'hex')).toBe(32);
    });
  });

  // ── validateRequest ───────────────────────────────────────────────────────

  describe('validateRequest', () => {
    it('returns true when cookie matches header', () => {
      const token = 'abc123';
      expect(service.validateRequest(token, token)).toBe(true);
    });

    it('returns true when header is an array and first element matches', () => {
      const token = 'abc123';
      expect(service.validateRequest(token, [token, 'other'])).toBe(true);
    });

    it('returns false when cookie is undefined', () => {
      expect(service.validateRequest(undefined, 'abc123')).toBe(false);
    });

    it('returns false when header is undefined', () => {
      expect(service.validateRequest('abc123', undefined)).toBe(false);
    });

    it('returns false when both are undefined', () => {
      expect(service.validateRequest(undefined, undefined)).toBe(false);
    });

    it('returns false when values do not match', () => {
      expect(service.validateRequest('cookie-value', 'header-value')).toBe(false);
    });

    it('returns false when header array is empty', () => {
      expect(service.validateRequest('abc123', [])).toBe(false);
    });

    it('returns false when cookie is empty string', () => {
      expect(service.validateRequest('', 'abc123')).toBe(false);
    });

    it('returns false when header is empty string', () => {
      expect(service.validateRequest('abc123', '')).toBe(false);
    });
  });
});
