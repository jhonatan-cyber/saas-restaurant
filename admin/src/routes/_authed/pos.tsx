import { useState } from 'react';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ProductGrid, type AddableProduct } from '~/components/product-grid';
import { OrderCartPanel } from '~/components/order-cart-panel';
import { PosActiveOrders } from '~/components/pos-active-orders';
import { PaymentModal } from '~/components/payment-modal';
import { useAuthStore } from '~/lib/auth-store';
import { useOrdersCartStore } from '~/lib/orders-store';
import type { OrderListItem } from '~/lib/api';

/**
 * Página de POS (Point of Sale).
 * - Layout split: grid de productos a la izquierda, cart + órdenes activas a la derecha.
 * - Role guard: solo CAJERO, MESERO, ADMIN, OWNER.
 * - Default branch: user.defaultBranchId ?? user.branches[0]?.id.
 * - El cart es DRAFT-only (Zustand, sin persist). Al "Enviar a cocina" se
 *   crea la orden en el backend y se limpia el cart.
 * - Las órdenes activas aparecen debajo del cart con refetch cada 15s.
 * - Las órdenes en DELIVERED tienen botón "Cobrar" que abre el PaymentModal.
 */
export const Route = createFileRoute('/_authed/pos')({
  component: PosPage,
});

const ALLOWED_POS_ROLES = ['CAJERO', 'MESERO', 'ADMIN', 'OWNER'] as const;

function PosPage(): ReactNode {
  const user = useAuthStore((s) => s.user);
  const addItem = useOrdersCartStore((s) => s.addItem);
  const queryClient = useQueryClient();

  const [payOrder, setPayOrder] = useState<OrderListItem | null>(null);

  const onAdd = useCallback(
    (p: AddableProduct) => {
      // F5-01: Si es un combo, incluir items en notes (el backend recalcula
      // precios desde Product, así que NO expandimos items separados — eso
      // duplicaría el cobro. En su lugar, el KDS ve los componentes en notes.)
      if (p.productType === 'COMBO' && p.comboItems && p.comboItems.length > 0) {
        const itemsDesc = p.comboItems
          .map((item) => `${item.quantity}x ${item.productName}`)
          .join(', ');
        addItem({
          productId: p.id,
          productName: `${p.name} (${itemsDesc})`,
          unitPrice: p.price,
          taxRate: p.taxRate,
          preparationAreaId: p.preparationAreaId,
          preparationAreaName: p.preparationAreaName,
          quantity: 1,
          notes: `Incluye: ${itemsDesc}`,
        });
      } else {
        addItem({
          productId: p.id,
          productName: p.name,
          unitPrice: p.price,
          taxRate: p.taxRate,
          preparationAreaId: p.preparationAreaId,
          preparationAreaName: p.preparationAreaName,
          quantity: 1,
          notes: null,
        });
      }
    },
    [addItem],
  );

  const handlePaid = (): void => {
    setPayOrder(null);
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  if (!ALLOWED_POS_ROLES.includes(user.role as (typeof ALLOWED_POS_ROLES)[number])) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Acceso denegado</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu rol ({user.role}) no tiene acceso al POS.
        </p>
        <Link to="/dashboard" className="btn-primary mt-4 inline-block">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const branchId = user.defaultBranchId ?? user.branches[0]?.id ?? null;

  if (!branchId) {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900">Sin sucursal</h1>
        <p className="mt-2 text-sm text-slate-600">
          Necesitás al menos una sucursal configurada para tomar órdenes.
          Pedile a un administrador que te asigne una.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">POS</h1>
          <p className="text-sm text-slate-500">
            Tocá un producto para agregarlo al cart. Cuando esté listo, envialo a cocina.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_400px]">
        {/* Left: Product Grid */}
        <div>
          <ProductGrid branchId={branchId} onAdd={onAdd} />
        </div>

        {/* Right: Cart + Active Orders */}
        <div className="space-y-4">
          <div className="sticky top-4">
            <OrderCartPanel branchId={branchId} />
          </div>
          <PosActiveOrders
            branchId={branchId}
            onPayOrder={(order) => setPayOrder(order)}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {payOrder && (
        <PaymentModal
          open={!!payOrder}
          order={payOrder as any}
          branchId={branchId}
          onClose={() => setPayOrder(null)}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
