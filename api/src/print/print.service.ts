import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { Order, OrderItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Payload for the print-agent's comanda endpoint.
 */
interface ComandaItem {
  name: string;
  qty: number;
  notes?: string;
  preparationAreaName?: string;
  /** Items incluidos en un combo (F5-01) — se expanden en la comanda */
  subItems?: Array<{ name: string; qty: number }>;
}

interface ComandaPayload {
  businessName: string;
  branchName: string;
  orderCode: string;
  tableNumber?: string;
  waiterName?: string;
  areaName: string;
  areaTag: string;
  items: ComandaItem[];
  globalNotes?: string;
  createdAt: string;
  priority?: 'NORMAL' | 'URGENTE';
}

/**
 * Payload for the print-agent's ticket endpoint.
 */
interface TicketItem {
  name: string;
  qty: number;
  total: string;
  notes?: string;
  subItems?: Array<{ name: string; qty: number }>;
}

interface TicketPayload {
  businessName: string;
  branchName: string;
  orderCode: string;
  tableNumber?: string;
  cashierName: string;
  items: TicketItem[];
  subtotal: string;
  taxTotal: string;
  total: string;
  payments: Array<{
    method: string;
    amount: string;
    change?: string;
  }>;
  changeTotal?: string;
  createdAt: string;
  footer?: string;
}

/**
 * PrintService — Fire-and-forget printing of kitchen comandas and sale tickets.
 *
 * Sends structured data to the external print-agent microservice,
 * which renders ESC/POS and sends to thermal printers.
 *
 * All methods are designed to never throw — errors are logged and absorbed.
 */
@Injectable()
export class PrintService {
  private readonly logger = new Logger(PrintService.name);
  private readonly agentUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.agentUrl = this.config.get<string>('PRINT_AGENT_URL', 'http://localhost:3100');
  }

  /**
   * Print kitchen comandas for an order that was just sent to the kitchen.
   * Groups items by preparation area and sends one comanda per area.
   *
   * F5-01: For COMBO products, expands sub-items (comboItems) as indented
   * entries under the parent item so the kitchen sees what to prepare.
   *
   * This is fire-and-forget: errors are logged but never propagated.
   */
  async printComandaForOrder(businessId: string, order: Order & { items: OrderItem[] }): Promise<void> {
    try {
      // Fetch business and branch names
      const [businessName, branchName, tableInfo, comboProducts] = await Promise.all([
        this.prisma.business
          .findUnique({ where: { id: businessId }, select: { name: true } })
          .then((b) => b?.name ?? ''),
        this.prisma.branch
          .findUnique({ where: { id: order.branchId }, select: { name: true } })
          .then((b) => b?.name ?? ''),
        order.tableId
          ? this.prisma.restaurantTable
              .findUnique({ where: { id: order.tableId }, select: { number: true } })
              .then((t) => t?.number ?? null)
          : Promise.resolve(null),
        // F5-01: Fetch combo products to expand their sub-items
        this.prisma.product.findMany({
          where: {
            businessId,
            id: { in: order.items.map((i) => i.productId).filter((id): id is string => !!id) },
            productType: 'COMBO',
            deletedAt: null,
          },
          select: {
            id: true,
            comboItems: true,
          },
        }),
      ]);

      // Build a map of productId → comboItems for quick lookup
      const comboMap = new Map<string, Array<{ productId: string; productName: string; quantity: number }>>();
      for (const p of comboProducts) {
        const items = p.comboItems as Array<{ productId: string; productName: string; quantity: number }> | null;
        if (items && Array.isArray(items)) {
          comboMap.set(p.id, items);
        }
      }

      const orderCode = order.id.slice(-8).toUpperCase();
      const createdAt = order.createdAt.toISOString();

      // Group items by preparation area
      const areaMap = new Map<string, OrderItem[]>();
      for (const item of order.items) {
        const areaName = item.preparationAreaName ?? 'General';
        const existing = areaMap.get(areaName) ?? [];
        existing.push(item);
        areaMap.set(areaName, existing);
      }

      // Send one comanda per preparation area
      const results = await Promise.allSettled(
        Array.from(areaMap.entries()).map(([areaName, items]) => {
          const payload: ComandaPayload = {
            businessName,
            branchName,
            orderCode,
            tableNumber: tableInfo ?? undefined,
            areaName,
            areaTag: 'comanda',
            items: items.map((i) => {
              const comboItem = i.productId ? comboMap.get(i.productId) : undefined;
              const subItems = comboItem
                ? comboItem.map((ci) => ({
                    name: ci.productName,
                    qty: ci.quantity * i.quantity,
                  }))
                : undefined;

              return {
                name: i.productName,
                qty: i.quantity,
                notes: i.notes ?? undefined,
                preparationAreaName: i.preparationAreaName ?? undefined,
                subItems,
              };
            }),
            globalNotes: order.globalNotes ?? undefined,
            createdAt,
          };

          return this.sendToPrintAgent('/print/comanda', payload);
        }),
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          this.logger.warn(`Comanda print failed: ${result.reason}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Error preparing comanda for order ${order.id}: ${(err as Error).message}`);
    }
  }

  /**
   * Print a sale ticket for an order that was just paid.
   * Fire-and-forget: errors are logged, never propagated.
   */
  async printTicketForOrder(
    businessId: string,
    order: Order & { items: OrderItem[] },
    payments: Array<{ method: string; amount: Prisma.Decimal; change: Prisma.Decimal | null }>,
    cashierName: string,
  ): Promise<void> {
    try {
      const [businessName, branchName, tableInfo, comboProducts] = await Promise.all([
        this.prisma.business
          .findUnique({ where: { id: businessId }, select: { name: true } })
          .then((b) => b?.name ?? ''),
        this.prisma.branch
          .findUnique({ where: { id: order.branchId }, select: { name: true } })
          .then((b) => b?.name ?? ''),
        order.tableId
          ? this.prisma.restaurantTable
              .findUnique({ where: { id: order.tableId }, select: { number: true } })
              .then((t) => t?.number ?? null)
          : Promise.resolve(null),
        // F5-01: Fetch combo products to expand sub-items
        this.prisma.product.findMany({
          where: {
            businessId,
            id: { in: order.items.map((i) => i.productId).filter((id): id is string => !!id) },
            productType: 'COMBO',
            deletedAt: null,
          },
          select: { id: true, comboItems: true },
        }),
      ]);

      const comboMap = new Map<string, Array<{ productId: string; productName: string; quantity: number }>>();
      for (const p of comboProducts) {
        const items = p.comboItems as Array<{ productId: string; productName: string; quantity: number }> | null;
        if (items && Array.isArray(items)) {
          comboMap.set(p.id, items);
        }
      }

      const orderCode = order.id.slice(-8).toUpperCase();
      const createdAt = order.createdAt.toISOString();
      const fmt = (v: Prisma.Decimal) => v.toFixed(2);

      // Calculate totals from items
      let subtotal = new Prisma.Decimal(0);
      let taxTotal = new Prisma.Decimal(0);
      for (const item of order.items) {
        subtotal = subtotal.plus(item.unitPrice.mul(item.quantity));
        if (item.taxRate) {
          taxTotal = taxTotal.plus(item.unitPrice.mul(item.quantity).mul(item.taxRate).div(100));
        }
      }

      // Determine total change
      const totalChange = payments.reduce(
        (acc, p) => (p.change ? acc.plus(p.change) : acc),
        new Prisma.Decimal(0),
      );

      const payload: TicketPayload = {
        businessName,
        branchName,
        orderCode,
        tableNumber: tableInfo ?? undefined,
        cashierName,
        items: order.items.map((i) => {
          const comboItem = i.productId ? comboMap.get(i.productId) : undefined;
          const subItems = comboItem
            ? comboItem.map((ci) => ({ name: ci.productName, qty: ci.quantity * i.quantity }))
            : undefined;
          return {
            name: i.productName,
            qty: i.quantity,
            total: fmt(i.unitPrice.mul(i.quantity)),
            notes: i.notes ?? undefined,
            subItems,
          };
        }),
        subtotal: fmt(subtotal),
        taxTotal: fmt(taxTotal),
        total: fmt(order.total),
        payments: payments.map((p) => {
          const entry: { method: string; amount: string; change?: string } = {
            method: p.method,
            amount: fmt(p.amount),
          };
          if (p.change && p.change.greaterThan(0)) {
            entry.change = fmt(p.change);
          }
          return entry;
        }),
        changeTotal: totalChange.greaterThan(0) ? fmt(totalChange) : undefined,
        createdAt,
      };

      await this.sendToPrintAgent('/print/ticket', payload);
    } catch (err) {
      this.logger.warn(`Error printing ticket for order ${order.id}: ${(err as Error).message}`);
    }
  }

  /**
   * Send a payload to the print-agent HTTP endpoint.
   * Uses native fetch (Node 18+/Bun).
   */
  private async sendToPrintAgent(path: string, payload: unknown): Promise<void> {
    const url = `${this.agentUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Print-agent responded ${response.status} for ${path}: ${body}`);
    }
  }
}
