import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * CashFoundationService (Phase 3: read-only).
 *
 * D1=A: el módulo de caja completo (apertura, cierre, arqueo) llega en F4.
 * En F3 este servicio solo expone lookups de sesiones abiertas para que
 * OrdersService valide el guardrail #2 ("Caja Cerrada = No Venta") sin
 * acoplarse a un módulo que aún no existe.
 *
 * F4 va a:
 *  - Agregar CRUD de CashRegister y Shift (apertura, cierre, arqueo).
 *  - Mover toda la lógica transaccional de caja a un módulo dedicado.
 *  - Reemplazar este servicio por el nuevo.
 */
@Injectable()
export class CashFoundationService {
  private readonly logger = new Logger(CashFoundationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca un CashRegister OPEN y un Shift OPEN en la sucursal dada.
   * Devuelve ambos o null si falta alguno (la orden no puede crearse).
   *
   * Por qué dos queries separadas: queremos reportar específicamente
   * cuál falta en el error (mejor UX que un genérico "no hay caja").
   */
  async findOpenCashAndShift(branchId: string): Promise<{
    cashRegisterId: string;
    shiftId: string;
  } | null> {
    const [cashRegister, shift] = await Promise.all([
      this.prisma.cashRegister.findFirst({
        where: { branchId, status: 'OPEN' },
        select: { id: true },
        orderBy: { openedAt: 'desc' },
      }),
      this.prisma.shift.findFirst({
        where: { branchId, status: 'OPEN' },
        select: { id: true },
        orderBy: { openedAt: 'desc' },
      }),
    ]);

    if (!cashRegister || !shift) {
      this.logger.warn(
        `No open cash session in branch ${branchId}: cashRegister=${!!cashRegister} shift=${!!shift}`,
      );
      return null;
    }

    return { cashRegisterId: cashRegister.id, shiftId: shift.id };
  }

  /**
   * Helper para usar dentro de transacciones Prisma. Devuelve los IDs
   * de sesión abierta usando el cliente transaccional (txClient).
   */
  async findOpenCashAndShiftInTx(
    txClient: Prisma.TransactionClient,
    branchId: string,
  ): Promise<{ cashRegisterId: string; shiftId: string } | null> {
    const [cashRegister, shift] = await Promise.all([
      txClient.cashRegister.findFirst({
        where: { branchId, status: 'OPEN' },
        select: { id: true },
        orderBy: { openedAt: 'desc' },
      }),
      txClient.shift.findFirst({
        where: { branchId, status: 'OPEN' },
        select: { id: true },
        orderBy: { openedAt: 'desc' },
      }),
    ]);

    if (!cashRegister || !shift) return null;
    return { cashRegisterId: cashRegister.id, shiftId: shift.id };
  }
}
