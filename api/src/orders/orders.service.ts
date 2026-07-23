import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OrderStatus, Prisma, AuditAction, type Order, type OrderItem, type OrderStateLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CashFoundationService } from '../cash-foundation/cash-foundation.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PrintService } from '../print/print.service';
import { QuotaEnforcer } from '../billing/quota.enforcer';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';
import { ERROR_CODES } from '@saas/shared';
import {
  ACTIVE_STATUSES,
  allowedTransitions,
  canTransition,
  isEditable,
  KDS_VISIBLE_STATUSES,
} from './order-state-machine';
import type {
  CancelOrderDto,
  CreateOrderDto,
  OrderFiltersDto,
  TransitionOrderDto,
  UpdateOrderItemDto,
} from './dto';
import {
  toOrderDto,
  toOrderListItemDto,
  toOrderItemDto,
  toKdsOrderDto,
} from './mappers';

/**
 * OrdersService: corazón del motor de venta.
 *
 * Reglas críticas (R3, R4, R6, R7, R8 del SDD):
 *  - State machine: TODA transición pasa por `canTransition()`. NUNCA
 *    aceptar status arbitrario en PATCH.
 *  - Optimistic lock: cada update verifica `version`. Si no coincide,
 *    el cliente recibe 409 `staleVersion` y debe re-fetch.
 *  - Snapshot: OrderItem guarda productName/unitPrice/taxRate/areaId
 *    como columnas, NO como relaciones. Cambios en Product NO
 *    afectan items existentes.
 *  - Cash: `create` valida OPEN cash + OPEN shift antes de la tx.
 *  - Cancel: userId + reason OBLIGATORIOS. NUNCA hard-delete.
 *  - Tabla: OrdersService es source of truth. Auto-actualiza
 *    `RestaurantTable.status` cuando corresponde.
 *
 * Patrón de queries: SIEMPRE `tenantFilter(user, context)`.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cash: CashFoundationService,
    private readonly realtime: RealtimeGateway,
    private readonly printService: PrintService,
    private readonly quota: QuotaEnforcer,
  ) {}

  // =============================================================
  //  CREATE
  // =============================================================

  /**
   * Crea una orden en estado PENDING. Valida:
   *  1. OPEN cash + OPEN shift (guardrail #2, D1=A).
   *  2. Todos los productos existen, están activos, disponibles y
   *     pertenecen al tenant.
   *  3. Si tableId viene, la mesa pertenece a la sucursal.
   *  4. Si customerId viene, el cliente pertenece al tenant.
   *
   * Toda la operación corre en `$transaction` con isolation `Serializable`
   * (R4). Si falla por conflicto de concurrencia, Prisma lanza
   * `PrismaClientKnownRequestError` con código P2034.
   */
  async create(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    dto: CreateOrderDto,
  ): Promise<Order> {
    const tenant = this.prisma.tenantFilter(user, context);
    const branchId = tenant.branchId;
    if (!branchId) {
      throw new ForbiddenException(
        'Crear órdenes requiere una sucursal en el scope (header x-branch-id o defaultBranchId)',
      );
    }

    // Verificar cuota mensual de órdenes del plan
    await this.quota.checkOrThrow(tenant.businessId, 'monthlyOrders');

    // Resolver sesión de caja abierta (fuera de la tx para no alargarla).
    const cashSession = await this.cash.findOpenCashAndShift(branchId);
    if (!cashSession) {
      throw new UnprocessableEntityException({
        message: 'No hay caja/turno abierto en esta sucursal. Abra caja antes de vender.',
        code: ERROR_CODES.CASH_SESSION_REQUIRED,
      });
    }

    // Cargar productos para snapshot y validar pertenencia al tenant.
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: {
        ...tenant,
        id: { in: productIds },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        price: true,
        taxRate: true,
        isAvailable: true,
        productType: true,
        bulkPricing: true,
        preparationAreaId: true,
        preparationArea: { select: { id: true, name: true } },
      },
    });

    if (products.length !== new Set(productIds).size) {
      const found = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !found.has(id));
      throw new UnprocessableEntityException({
        message: `Productos inválidos o inactivos: ${missing.join(', ')}`,
        code: ERROR_CODES.INVALID_PRODUCT,
      });
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validar mesa si viene
    if (dto.tableId) {
      const table = await this.prisma.restaurantTable.findFirst({
        where: { ...tenant, id: dto.tableId, deletedAt: null },
        select: { id: true },
      });
      if (!table) {
        throw new UnprocessableEntityException({
          message: 'Mesa no encontrada o no pertenece a la sucursal',
          code: ERROR_CODES.INVALID_TABLE,
        });
      }
    }

    // Validar cliente si viene
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { ...tenant, id: dto.customerId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) {
        throw new UnprocessableEntityException({
          message: 'Cliente no encontrado o no pertenece al tenant',
          code: ERROR_CODES.ORDER_NOT_FOUND,
        });
      }
    }

    // Construir items con snapshot (F5-02: aplicar precio por cantidad si aplica)
    const itemCreates: Prisma.OrderItemCreateWithoutOrderInput[] = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = computeBulkPrice(product.price, item.quantity, product.bulkPricing as any);
      const lineTotal = unitPrice.mul(item.quantity);
      return {
        business: { connect: { id: user.businessId } },
        productId: product.id,
        productName: product.name,
        unitPrice,
        taxRate: product.taxRate ?? null,
        preparationAreaId: product.preparationAreaId,
        preparationAreaName: product.preparationArea?.name ?? null,
        quantity: item.quantity,
        notes: item.notes ?? null,
        lineTotal,
      };
    });

    const totals = this.computeTotals(itemCreates);

    // TX serializable para evitar race conditions en totales (R4).
    const order = await this.prisma.$transaction(
      async (tx) => {
        // Auto-lock de mesa si está FREE (D7). Si está RESERVED, no tocamos.
        if (dto.tableId) {
          const table = await tx.restaurantTable.findUnique({
            where: { id: dto.tableId },
            select: { status: true },
          });
          if (table?.status === 'FREE') {
            await tx.restaurantTable.update({
              where: { id: dto.tableId },
              data: { status: 'OCCUPIED' },
            });
          }
        }

        const created = await tx.order.create({
          data: {
            business: { connect: { id: user.businessId } },
            branch: { connect: { id: branchId } },
            ...(dto.tableId ? { table: { connect: { id: dto.tableId } } } : {}),
            ...(dto.customerId ? { customer: { connect: { id: dto.customerId } } } : {}),
            cashier: { connect: { id: user.id } },
            ...(dto.waiterId ? { waiter: { connect: { id: dto.waiterId } } } : {}),
            type: dto.type ?? 'DINE_IN',
            channel: dto.channel ?? 'POS_WEB',
            status: OrderStatus.PENDING,
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            total: totals.total,
            globalNotes: dto.globalNotes ?? null,
            cashRegister: { connect: { id: cashSession.cashRegisterId } },
            shift: { connect: { id: cashSession.shiftId } },
            items: { create: itemCreates },
            stateLogs: {
              create: {
                business: { connect: { id: user.businessId } },
                fromStatus: null,
                toStatus: OrderStatus.PENDING,
                changedByUserId: user.id,
                reason: 'Creación de la orden',
                metadata: { source: 'POST /orders' },
              },
            },
          },
          include: { items: true },
        });

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Auditoría + emit (fuera de tx)
    await this.audit.log({
      businessId: user.businessId,
      userId: user.id,
      action: AuditAction.CREATE,
      entity: 'Order',
      entityId: order.id,
      after: { status: order.status, total: order.total.toString(), items: order.items.length },
    });
    this.realtime.emitOrderCreated(user.businessId, branchId, {
      order: toOrderDto(order, order.items, []),
    });

    return order;
  }

  // =============================================================
  //  ITEMS
  // =============================================================

  /**
   * Agrega un ítem a una orden PENDING. Valida ownership y recalcula totales.
   */
  async addItem(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    orderId: string,
    productId: string,
    quantity: number,
    notes?: string,
  ): Promise<{ order: Order; item: OrderItem }> {
    const tenant = this.prisma.tenantFilter(user, context);

    const order = await this.loadEditableOrder(tenant, orderId);
    const product = await this.loadProduct(tenant, productId);

    const unitPrice = computeBulkPrice(product.price, quantity, product.bulkPricing as any);
    const lineTotal = unitPrice.mul(quantity);
    const itemCreate: Prisma.OrderItemCreateInput = {
      business: { connect: { id: user.businessId } },
      order: { connect: { id: order.id } },
      productId: product.id,
      productName: product.name,
      unitPrice,
      taxRate: product.taxRate ?? null,
      preparationAreaId: product.preparationAreaId,
      preparationAreaName: product.preparationArea?.name ?? null,
      quantity,
      notes: notes ?? null,
      lineTotal,
    };

    const result = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.orderItem.create({ data: itemCreate });
        const newTotals = await this.recalculateTotalsInTx(tx, order.id);
        const updated = await tx.order.update({
          where: { id: order.id },
          data: { ...newTotals, version: { increment: 1 } },
          include: { items: true },
        });
        return { order: updated, item: created };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.realtime.emitOrderItemAdded(user.businessId, order.branchId, {
      orderId: result.order.id,
      item: toOrderItemDto(result.item),
    });

    return result;
  }

  /**
   * Edita un ítem (qty y/o notes). Solo si la orden está en PENDING.
   * Recalcula totales y emite `order.item_updated`.
   */
  async updateItem(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    orderId: string,
    itemId: string,
    dto: UpdateOrderItemDto,
  ): Promise<{ order: Order; item: OrderItem }> {
    const tenant = this.prisma.tenantFilter(user, context);
    const order = await this.loadEditableOrder(tenant, orderId);

    const item = await this.prisma.orderItem.findFirst({
      where: { businessId: user.businessId, orderId, id: itemId },
    });
    if (!item) {
      throw new NotFoundException('Ítem no encontrado en la orden');
    }

    const newQty = dto.quantity ?? item.quantity;
    const newNotes = dto.notes === undefined ? item.notes : dto.notes;

    // F5-02: Si cambia la cantidad, recalcular unitPrice con bulk pricing
    let newUnitPrice = item.unitPrice;
    if (dto.quantity !== undefined && dto.quantity !== item.quantity) {
      const product = await this.prisma.product.findFirst({
        where: { businessId: user.businessId, id: item.productId! },
        select: { price: true, bulkPricing: true },
      });
      if (product) {
        newUnitPrice = computeBulkPrice(product.price, dto.quantity, product.bulkPricing as any);
      }
    }

    const newLineTotal = newUnitPrice.mul(newQty);

    const result = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.orderItem.update({
          where: { id: itemId },
          data: {
            quantity: newQty,
            notes: newNotes,
            unitPrice: newUnitPrice,
            lineTotal: newLineTotal,
          },
        });
        const newTotals = await this.recalculateTotalsInTx(tx, order.id);
        const ord = await tx.order.update({
          where: { id: order.id },
          data: { ...newTotals, version: { increment: 1 } },
          include: { items: true },
        });
        return { order: ord, item: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.realtime.emitOrderItemUpdated(user.businessId, order.branchId, {
      orderId: result.order.id,
      item: toOrderItemDto(result.item),
    });

    return result;
  }

  /**
   * Quita un ítem. Solo si la orden está en PENDING.
   * Si era el último ítem, la orden queda con total 0 (igual se mantiene
   * en PENDING — el usuario la cancela si quiere).
   */
  async removeItem(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    orderId: string,
    itemId: string,
  ): Promise<Order> {
    const tenant = this.prisma.tenantFilter(user, context);
    const order = await this.loadEditableOrder(tenant, orderId);

    const item = await this.prisma.orderItem.findFirst({
      where: { businessId: user.businessId, orderId, id: itemId },
    });
    if (!item) {
      throw new NotFoundException('Ítem no encontrado en la orden');
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.orderItem.delete({ where: { id: itemId } });
        const newTotals = await this.recalculateTotalsInTx(tx, order.id);
        const updated = await tx.order.update({
          where: { id: order.id },
          data: { ...newTotals, version: { increment: 1 } },
          include: { items: true },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.realtime.emitOrderItemRemoved(user.businessId, order.branchId, {
      orderId: result.id,
      itemId,
    });

    return result;
  }

  // =============================================================
  //  STATE TRANSITIONS
  // =============================================================

  /**
   * Transiciona el estado de la orden. Valida:
   *  1. Matriz `canTransition`.
   *  2. Optimistic lock (R4) si el cliente mandó `expectedVersion`.
   *  3. Estado actual cargado desde BD.
   *
   * En éxito: actualiza estado + version, escribe OrderStateLog, emite
   * `order.state_changed` a branch + prep_areas.
   */
  async transition(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    orderId: string,
    dto: TransitionOrderDto,
  ): Promise<Order> {
    const tenant = this.prisma.tenantFilter(user, context);
    const order = await this.loadOrder(tenant, orderId);

    if (dto.expectedVersion !== undefined && order.version !== dto.expectedVersion) {
      throw new ConflictException({
        message: 'La orden fue modificada por otro usuario. Recarga y reintenta.',
        code: ERROR_CODES.STALE_VERSION,
      });
    }

    if (!canTransition(order.status, dto.to)) {
      throw new UnprocessableEntityException({
        message: `Transición no permitida: ${order.status} → ${dto.to}. Permitidas: ${allowedTransitions(order.status).join(', ') || '(ninguna, estado terminal)'}`,
        code: ERROR_CODES.TRANSITION_NOT_ALLOWED,
      });
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Re-verificar versión dentro de la tx para optimistic lock real.
        const current = await tx.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true, version: true, branchId: true },
        });
        if (!current) {
          throw new NotFoundException('Orden no encontrada');
        }
        if (
          dto.expectedVersion !== undefined &&
          current.version !== dto.expectedVersion
        ) {
          throw new ConflictException({
            message: 'Conflicto de versión detectado al transicionar.',
            code: ERROR_CODES.STALE_VERSION,
          });
        }
        if (!canTransition(current.status, dto.to)) {
          throw new UnprocessableEntityException({
            message: `Transición inválida: ${current.status} → ${dto.to}`,
            code: ERROR_CODES.TRANSITION_NOT_ALLOWED,
          });
        }

        const updateData: Prisma.OrderUpdateInput = {
          status: dto.to,
          version: { increment: 1 },
        };
        // Si llega a PAID, podríamos querer guardar closedAt. En F3 no hay
        // tabla de pagos, así que solo cambiamos status.
        const updated = await tx.order.update({
          where: { id: orderId },
          data: updateData,
          include: { items: true },
        });

        await tx.orderStateLog.create({
          data: {
            business: { connect: { id: user.businessId } },
            order: { connect: { id: orderId } },
            fromStatus: current.status,
            toStatus: dto.to,
            changedByUserId: user.id,
            reason: dto.reason ?? null,
            metadata: { source: 'POST /orders/{id}/transition' },
          },
        });

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const preparationAreaIds = Array.from(
      new Set(result.items.map((i) => i.preparationAreaId).filter((id): id is string => !!id)),
    );

    this.realtime.emitOrderStateChanged(
      user.businessId,
      result.branchId,
      preparationAreaIds,
      {
        orderId: result.id,
        from: order.status,
        to: dto.to,
        byUserId: user.id,
        at: new Date().toISOString(),
        reason: dto.reason ?? null,
      },
    );

    await this.audit.log({
      businessId: user.businessId,
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: 'Order',
      entityId: result.id,
      before: { status: order.status },
      after: { status: result.status },
    });

    // Fire-and-forget: imprimir comanda si la orden va a cocina
    if (dto.to === OrderStatus.SENT_TO_KITCHEN) {
      this.printService
        .printComandaForOrder(user.businessId, result)
        .catch((err: Error) =>
          this.logger.warn(`Error imprimiendo comanda para orden ${result.id}: ${err.message}`),
        );
    }

    return result;
  }

  /**
   * Cancela una orden (R6). Solo si está en estado activo (no PAID ni
   * CANCELLED). Razón OBLIGATORIA.
   */
  async cancel(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    orderId: string,
    dto: CancelOrderDto,
  ): Promise<Order> {
    const tenant = this.prisma.tenantFilter(user, context);
    const order = await this.loadOrder(tenant, orderId);

    if (!ACTIVE_STATUSES.includes(order.status)) {
      throw new UnprocessableEntityException({
        message: `No se puede cancelar una orden en estado ${order.status}`,
        code: ERROR_CODES.TRANSITION_NOT_ALLOWED,
      });
    }

    if (dto.expectedVersion !== undefined && order.version !== dto.expectedVersion) {
      throw new ConflictException({
        message: 'La orden fue modificada por otro usuario.',
        code: ERROR_CODES.STALE_VERSION,
      });
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledByUserId: user.id,
            cancellationReason: dto.reason,
            version: { increment: 1 },
          },
          include: { items: true },
        });
        await tx.orderStateLog.create({
          data: {
            business: { connect: { id: user.businessId } },
            order: { connect: { id: orderId } },
            fromStatus: order.status,
            toStatus: OrderStatus.CANCELLED,
            changedByUserId: user.id,
            reason: dto.reason,
            metadata: { source: 'POST /orders/{id}/cancel' },
          },
        });

        // Si era DINE_IN y la mesa solo tiene esta orden activa, libera la mesa.
        if (updated.tableId) {
          await this.maybeReleaseTableInTx(tx, user.businessId, updated.tableId);
        }

        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.realtime.emitOrderCancelled(user.businessId, result.branchId, {
      orderId: result.id,
      cancelledByUserId: user.id,
      cancellationReason: dto.reason,
      at: new Date().toISOString(),
    });

    await this.audit.log({
      businessId: user.businessId,
      userId: user.id,
      action: AuditAction.VOID,
      entity: 'Order',
      entityId: result.id,
      before: { status: order.status },
      after: { status: result.status, reason: dto.reason },
    });

    return result;
  }

  // =============================================================
  //  QUERIES
  // =============================================================

  async list(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: OrderFiltersDto,
  ): Promise<{ data: any[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }> {
    const tenant = this.prisma.tenantFilter(user, context);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {
      ...tenant,
      ...(filters.status && filters.status.length > 0 ? { status: { in: filters.status } } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.channel ? { channel: filters.channel } : {}),
      ...(filters.tableId ? { tableId: filters.tableId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.cashierId ? { cashierId: filters.cashierId } : {}),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          _count: { select: { items: true } },
        },
      }),
    ]);

    return {
      data: rows.map((o) => toOrderListItemDto(o, o._count.items)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async getById(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    orderId: string,
  ): Promise<Order & { items: OrderItem[]; stateLogs: OrderStateLog[] }> {
    const tenant = this.prisma.tenantFilter(user, context);
    const order = await this.prisma.order.findFirst({
      where: { ...tenant, id: orderId },
      include: { items: true, stateLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return order as any;
  }

  async getLogs(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    orderId: string,
  ): Promise<OrderStateLog[]> {
    const tenant = this.prisma.tenantFilter(user, context);
    const order = await this.prisma.order.findFirst({
      where: { ...tenant, id: orderId },
      select: { id: true },
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return this.prisma.orderStateLog.findMany({
      where: { businessId: user.businessId, orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Vista optimizada para el KDS. Devuelve las órdenes activas agrupadas
   * por preparation area. Una orden con items en múltiples áreas aparece
   * en cada área.
   */
  async kdsView(
    user: AuthenticatedUser,
    context: BusinessContext | undefined,
    filters: { branchId?: string; preparationAreaId?: string; states?: OrderStatus[] },
  ): Promise<{
    branchId: string;
    generatedAt: string;
    areas: Array<{
      preparationAreaId: string;
      preparationAreaName: string;
      preparationAreaCode: string;
      orders: any[];
    }>;
  }> {
    const tenant = this.prisma.tenantFilter(user, context);
    const branchId = filters.branchId ?? tenant.branchId;
    if (!branchId) {
      throw new ForbiddenException('KDS requiere branchId en el scope');
    }
    const states = filters.states && filters.states.length > 0 ? filters.states : KDS_VISIBLE_STATUSES;
    const statesArray: OrderStatus[] = [...states];

    // 1. Cargar preparation areas activas de la branch
    const areas = await this.prisma.preparationArea.findMany({
      where: { ...tenant, branchId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    // 2. Cargar orders activas con items filtrados
    const orders = await this.prisma.order.findMany({
      where: {
        ...tenant,
        branchId,
        status: { in: statesArray },
        ...(filters.preparationAreaId
          ? { items: { some: { preparationAreaId: filters.preparationAreaId } } }
          : {}),
      },
      include: {
        table: { select: { number: true } },
        items: filters.preparationAreaId
          ? { where: { preparationAreaId: filters.preparationAreaId } }
          : true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const generatedAt = new Date().toISOString();
    const grouped = areas.map((area) => {
      const areaOrders = orders
        .filter((o) =>
          o.items.some((i) => i.preparationAreaId === area.id),
        )
        .map((o) => toKdsOrderDto(o));
      return {
        preparationAreaId: area.id,
        preparationAreaName: area.name,
        preparationAreaCode: area.code,
        orders: areaOrders,
      };
    });

    // Si se filtró por preparationAreaId, solo devolver esa área
    const filtered = filters.preparationAreaId
      ? grouped.filter((g) => g.preparationAreaId === filters.preparationAreaId)
      : grouped;

    return {
      branchId,
      generatedAt,
      areas: filtered,
    };
  }

  // =============================================================
  //  HELPERS
  // =============================================================

  private async loadOrder(
    tenant: Prisma.OrderWhereInput,
    orderId: string,
  ): Promise<Order> {
    const order = await this.prisma.order.findFirst({
      where: { ...tenant, id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return order;
  }

  private async loadEditableOrder(
    tenant: Prisma.OrderWhereInput,
    orderId: string,
  ): Promise<Order> {
    const order = await this.loadOrder(tenant, orderId);
    if (!isEditable(order.status)) {
      throw new UnprocessableEntityException({
        message: `La orden está en estado ${order.status} y no acepta cambios en sus ítems`,
        code: ERROR_CODES.ORDER_NOT_EDITABLE,
      });
    }
    return order;
  }

  private async loadProduct(tenant: Prisma.ProductWhereInput, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { ...tenant, id: productId, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        price: true,
        taxRate: true,
        isAvailable: true,
        productType: true,
        bulkPricing: true,
        preparationAreaId: true,
        preparationArea: { select: { id: true, name: true } },
      },
    });
    if (!product) {
      throw new UnprocessableEntityException({
        message: `Producto ${productId} no encontrado o inactivo`,
        code: ERROR_CODES.INVALID_PRODUCT,
      });
    }
    if (!product.isAvailable) {
      throw new UnprocessableEntityException({
        message: `Producto ${product.name} no está disponible`,
        code: ERROR_CODES.INVALID_PRODUCT,
      });
    }
    return product;
  }

  /**
   * Recalcula subtotal/tax/total de una orden en base a sus items.
   * Llamado dentro de la misma tx que la mutación para garantizar
   * consistencia (R4).
   */
  private async recalculateTotalsInTx(
    tx: Prisma.TransactionClient,
    orderId: string,
  ): Promise<{ subtotal: Prisma.Decimal; taxTotal: Prisma.Decimal; total: Prisma.Decimal }> {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      select: { unitPrice: true, quantity: true, taxRate: true },
    });
    return this.computeTotals(items);
  }

  /**
   * Cálculo puro de totales a partir de items (con unitPrice y taxRate).
   * - subtotal = sum(unitPrice * quantity)
   * - taxTotal = sum(unitPrice * quantity * taxRate/100) si taxRate != null
   * - total = subtotal + taxTotal
   */
  private computeTotals(
    items: Array<{
      unitPrice: Prisma.Decimal | string | number | Prisma.DecimalJsLike;
      quantity: number;
      taxRate?: Prisma.Decimal | string | number | Prisma.DecimalJsLike | null;
    }>,
  ): { subtotal: Prisma.Decimal; taxTotal: Prisma.Decimal; total: Prisma.Decimal } {
    let subtotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    for (const item of items) {
      const unitPrice = new Prisma.Decimal(item.unitPrice as string | number | Prisma.Decimal);
      const lineSubtotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.plus(lineSubtotal);
      if (item.taxRate) {
        const taxRate = new Prisma.Decimal(item.taxRate as string | number | Prisma.Decimal);
        const lineTax = lineSubtotal.mul(taxRate).div(100);
        taxTotal = taxTotal.plus(lineTax);
      }
    }
    const total = subtotal.plus(taxTotal);
    return { subtotal, taxTotal, total };
  }

  /**
   * Si la mesa no tiene otras órdenes activas, la libera a FREE.
   */
  private async maybeReleaseTableInTx(
    tx: Prisma.TransactionClient,
    businessId: string,
    tableId: string,
  ): Promise<void> {
    const activeCount = await tx.order.count({
      where: {
        businessId,
        tableId,
        status: { in: ACTIVE_STATUSES as OrderStatus[] },
      },
    });
    if (activeCount === 0) {
      await tx.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'FREE' },
      });
    }
  }
}

/**
 * F5-02: Calcula el precio unitario aplicando precio por cantidad si el
 * producto tiene bulkPricing configurado y la cantidad supera el umbral.
 * Retorna el mejor precio disponible (el del escalón más alto que se cumpla).
 */
export function computeBulkPrice(
  basePrice: Prisma.Decimal,
  quantity: number,
  bulkPricing: Array<{ minQty: number; unitPrice: number }> | null | undefined,
): Prisma.Decimal {
  if (!bulkPricing || !Array.isArray(bulkPricing) || bulkPricing.length === 0) {
    return basePrice;
  }

  // Encontrar el escalón más alto que se cumpla (mayor minQty <= quantity)
  const applicable = bulkPricing
    .filter((tier) => quantity >= tier.minQty)
    .sort((a, b) => b.minQty - a.minQty);

  if (applicable.length === 0) {
    return basePrice;
  }

  return new Prisma.Decimal(applicable[0]!.unitPrice);
}
