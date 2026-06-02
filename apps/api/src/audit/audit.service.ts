import { Injectable, Logger } from '@nestjs/common';

/**
 * AuditService (Phase 2: placeholder).
 *
 * Phase 2: solo loggea en stdout. Phase 4 lo reemplazará por una
 * tabla `audit_logs` y un servicio que persista cada acción.
 *
 * Uso típico en los servicios:
 *   await this.audit.log({
 *     businessId: user.businessId,
 *     userId: user.id,
 *     action: 'PRICE_CHANGED',
 *     entity: 'Product',
 *     entityId: product.id,
 *     before: { price: oldPrice },
 *     after: { price: newPrice },
 *   });
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  /**
   * Registra una acción auditable.
   * Phase 2: no rompe el flujo aunque la BD esté caída.
   */
  async log(params: {
    businessId: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.logger.log(
      JSON.stringify({
        msg: 'audit',
        ...params,
      }),
    );
  }
}
