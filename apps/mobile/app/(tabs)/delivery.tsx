import { useCallback, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { LoadingView, ErrorView, EmptyView } from '../../src/components';
import { useAuth } from '../../src/lib/auth';
import {
  useDeliveryOrders,
  useTransitionOrder,
  queryKeys,
} from '../../src/lib/hooks';
import { ApiClientError, apiRequest } from '../../src/lib/api-client';
import type { OrderDTO } from '@saas/shared';
import { useQueryClient } from '@tanstack/react-query';

export default function DeliveryScreen(): ReactNode {
  const { user } = useAuth();
  const branchId = user?.defaultBranchId;
  const queryClient = useQueryClient();

  const {
    data: orders,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useDeliveryOrders(branchId);

  const transitionOrder = useTransitionOrder();
  const [fetchingVersion, setFetchingVersion] = useState<string | null>(null);

  /**
   * Obtiene la orden actual con su versión (fetch único) y ejecuta la
   * transición con optimistic lock para evitar conflictos de concurrencia.
   */
  const updateStatus = useCallback(
    async (orderId: string, toStatus: 'DELIVERED'): Promise<void> => {
      if (!branchId) return;

      setFetchingVersion(orderId);
      try {
        // Hacemos un fetch único de la orden para obtener su version actual
        // Usamos queryClient.fetchQuery en lugar del hook useCurrentOrder
        // porque es un fetch puntual (no queremos suscribirnos a cambios).
        const order = await queryClient.fetchQuery<OrderDTO>({
          queryKey: queryKeys.order(orderId),
          queryFn: () => apiRequest<OrderDTO>(`/orders/${orderId}`),
          staleTime: 0,
        });

        await transitionOrder.mutateAsync({
          branchId,
          orderId,
          to: toStatus,
          // Pasamos la versión real para optimistic lock (evita 409 si otro
          // usuario modificó la orden entre que la cargamos y transicionamos).
          expectedVersion: order.version,
        });

        Alert.alert('✅ Listo', 'Orden marcada como entregada');
        // Refrescar la lista de delivery
        queryClient.invalidateQueries({ queryKey: queryKeys.orders(branchId) });
      } catch (err: unknown) {
        if (err instanceof ApiClientError && err.code === 'staleVersion') {
          Alert.alert(
            'Conflicto',
            'La orden fue modificada por otro usuario. Tiirá de nuevo para recargar.',
          );
        } else {
          const msg =
            err instanceof ApiClientError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Error al actualizar';
          Alert.alert('Error', msg);
        }
      } finally {
        setFetchingVersion(null);
      }
    },
    [branchId, transitionOrder, queryClient],
  );

  // ── Estados ────────────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingView message="Cargando órdenes…" />;
  }

  if (isError) {
    const errMsg =
      error instanceof ApiClientError
        ? error.message
        : 'Error al cargar las órdenes';
    return (
      <ErrorView
        message={errMsg}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Órdenes de Delivery</Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <EmptyView
            icon="📦"
            title="Sin órdenes de delivery activas"
            description="Las órdenes nuevas aparecen automáticamente"
            fullScreen={false}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
              <Text style={[styles.statusBadge, item.status === 'READY' && styles.statusReady]}>
                {item.status === 'SENT_TO_KITCHEN'
                  ? '👨‍🍳 En cocina'
                  : item.status === 'READY'
                    ? '✅ Listo'
                    : item.status === 'DELIVERED'
                      ? '🚚 En camino'
                      : item.status}
              </Text>
            </View>
            <Text style={styles.total}>Bs {Number(item.total).toFixed(2)}</Text>
            <Text style={styles.itemCount}>{item.itemCount} producto(s)</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString('es-BO')}</Text>
            {item.status === 'READY' && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  (transitionOrder.isPending || fetchingVersion === item.id) &&
                    styles.actionBtnDisabled,
                ]}
                onPress={() => updateStatus(item.id, 'DELIVERED')}
                disabled={transitionOrder.isPending || fetchingVersion === item.id}
              >
                {transitionOrder.isPending || fetchingVersion === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Marcar como entregado ✅</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', padding: 16, paddingBottom: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  statusBadge: {
    fontSize: 11,
    fontWeight: '500',
    color: '#059669',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusReady: { color: '#b45309', backgroundColor: '#fffbeb' },
  total: { fontSize: 16, fontWeight: '700', color: '#059669', marginTop: 4 },
  itemCount: { fontSize: 12, color: '#64748b', marginTop: 2 },
  time: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  actionBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
