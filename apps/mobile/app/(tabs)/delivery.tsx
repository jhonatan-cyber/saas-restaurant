import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
import { useAuth } from '../../src/lib/auth';
import { api } from '../../src/lib/api';

interface DeliveryOrder {
  id: string;
  customerName?: string;
  type: 'DELIVERY';
  status: string;
  total: string;
  items: Array<{ name: string; qty: number }>;
  createdAt: string;
  deliveryAddress?: string;
}

export default function DeliveryScreen(): ReactNode {
  const { user } = useAuth();
  const branchId = user?.defaultBranchId;

  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    if (!branchId) return;
    try {
      const data = await api<any>(`/orders?type=DELIVERY&status=SENT_TO_KITCHEN,READY,DELIVERED&branchId=${branchId}&pageSize=20`, {
        branchId,
      });
      setOrders(data.data ?? data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateStatus = async (orderId: string, toStatus: string): Promise<void> => {
    try {
      const order = await api<any>(`/orders/${orderId}`, { branchId: branchId! });
      await api<any>(`/orders/${orderId}/transition`, {
        method: 'POST',
        body: { to: toStatus, expectedVersion: order.version },
        branchId: branchId!,
      });
      Alert.alert('✅ Listo', `Orden actualizada a ${toStatus}`);
      loadOrders();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <Text style={s.title}>Órdenes de Delivery</Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadOrders} />}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 40 }}>
            Sin órdenes de delivery activas
          </Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.orderId}>#{item.id.slice(-8).toUpperCase()}</Text>
              <Text style={s.status}>{item.status}</Text>
            </View>
            <Text style={s.total}>Bs {Number(item.total).toFixed(2)}</Text>
            <Text style={s.address}>{item.deliveryAddress ?? 'Sin dirección'}</Text>
            <Text style={s.time}>{new Date(item.createdAt).toLocaleString('es-BO')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {item.status === 'READY' && (
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => updateStatus(item.id, 'DELIVERED')}
                >
                  <Text style={s.actionBtnText}>Entregado ✅</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', padding: 16, paddingBottom: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderId: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  status: { fontSize: 12, fontWeight: '500', color: '#059669' },
  total: { fontSize: 16, fontWeight: '700', color: '#059669', marginTop: 4 },
  address: { fontSize: 12, color: '#64748b', marginTop: 2 },
  time: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  actionBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
