import { useState, useCallback, type ReactNode } from 'react';
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
import { LoadingView, ErrorView } from '../../src/components';
import { useAuth } from '../../src/lib/auth';
import { useTables, useProducts, useCreateOrder, useTransitionOrder } from '../../src/lib/hooks';
import { ApiClientError } from '../../src/lib/api-client';

export default function MeseroScreen(): ReactNode {
  const { user } = useAuth();
  const branchId = user?.defaultBranchId;

  // ── TanStack Query hooks ──────────────────────────────────────────
  const {
    data: tables,
    isLoading: tablesLoading,
    isError: tablesError,
    error: tablesErr,
    refetch: refetchTables,
    isRefetching: tablesRefetching,
  } = useTables(branchId);

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
    error: productsErr,
    refetch: refetchProducts,
    isRefetching: productsRefetching,
  } = useProducts(branchId);

  const createOrder = useCreateOrder();
  const transitionOrder = useTransitionOrder();

  // ── Estado local (UI, no server) ──────────────────────────────────
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [cart, setCart] = useState<Array<{ productId: string; productName: string; price: string; qty: number }>>([]);
  const [sending, setSending] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────
  const addToCart = useCallback(
    (product: { id: string; name: string; price: string }): void => {
      setCart((prev) => {
        const existing = prev.find((c) => c.productId === product.id);
        if (existing) {
          return prev.map((c) =>
            c.productId === product.id ? { ...c, qty: c.qty + 1 } : c,
          );
        }
        return [
          ...prev,
          { productId: product.id, productName: product.name, price: product.price, qty: 1 },
        ];
      });
    },
    [],
  );

  const removeFromCart = useCallback((productId: string): void => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }, []);

  const sendOrder = useCallback(async (): Promise<void> => {
    if (!selectedTable || cart.length === 0 || !branchId) {
      Alert.alert('Aviso', 'Seleccioná una mesa y agregá productos');
      return;
    }

    setSending(true);
    try {
      // 1. Crear la orden
      const order = await createOrder.mutateAsync({
        branchId,
        tableId: selectedTable,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.qty })),
      });

      // 2. Transicionar a SENT_TO_KITCHEN inmediatamente
      await transitionOrder.mutateAsync({
        branchId,
        orderId: order.id,
        to: 'SENT_TO_KITCHEN',
        expectedVersion: order.version,
      });

      Alert.alert('✅ Enviado', 'Orden enviada a cocina');
      setCart([]);
      setSelectedTable(null);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Error al crear orden';
      Alert.alert('Error', msg);
    } finally {
      setSending(false);
    }
  }, [selectedTable, cart, branchId, createOrder, transitionOrder]);

  // ── Estados de carga / error ──────────────────────────────────────
  if (tablesLoading || productsLoading) {
    return <LoadingView message="Cargando datos…" />;
  }

  if (tablesError || productsError) {
    const errMsg =
      (tablesErr as ApiClientError)?.message ??
      (productsErr as ApiClientError)?.message ??
      'Error al cargar datos';
    return (
      <ErrorView
        message={errMsg}
        onRetry={() => {
          refetchTables();
          refetchProducts();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Mesas ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedTable
            ? `Mesa ${tables?.find((t) => t.id === selectedTable)?.number ?? selectedTable}`
            : 'Seleccioná una mesa'}
        </Text>
        <FlatList
          horizontal
          data={tables}
          keyExtractor={(t) => t.id}
          refreshControl={
            <RefreshControl
              refreshing={tablesRefetching || productsRefetching}
              onRefresh={() => {
                refetchTables();
                refetchProducts();
              }}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tableCard,
                selectedTable === item.id && styles.tableCardSelected,
                item.status === 'OCCUPIED' && styles.tableCardOccupied,
              ]}
              onPress={() => setSelectedTable(item.id)}
            >
              <Text style={styles.tableNumber}>{item.number}</Text>
              <Text style={styles.tableStatus}>{item.status}</Text>
              <Text style={styles.tableCapacity}>cap. {item.capacity}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        />
      </View>

      {/* ── Productos ── */}
      <View style={[styles.section, { flex: 1 }]}>
        <Text style={styles.sectionTitle}>Productos</Text>
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          renderItem={({ item: product }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => addToCart({ id: product.id, name: product.name, price: product.price })}
            >
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>
                Bs {Number(product.price).toFixed(2)}
              </Text>
            </TouchableOpacity>
          )}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        />
      </View>

      {/* ── Carrito ── */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cartText}>
              {cart.reduce((s, c) => s + c.qty, 0)} ítems
            </Text>
            {cart.map((c) => (
              <TouchableOpacity
                key={c.productId}
                onPress={() => removeFromCart(c.productId)}
                style={styles.cartItem}
              >
                <Text style={styles.cartItemText}>
                  {c.productName} × {c.qty}
                </Text>
                <Text style={styles.cartItemRemove}>✕</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setCart([])}
            >
              <Text style={styles.clearBtnText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={sendOrder}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#059669" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>Enviar 🚀</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tableCard: {
    width: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  tableCardSelected: { borderColor: '#059669', backgroundColor: '#f0fdf4' },
  tableCardOccupied: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  tableNumber: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  tableStatus: { fontSize: 10, color: '#64748b', marginTop: 2 },
  tableCapacity: { fontSize: 10, color: '#94a3b8' },
  productCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 0,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  productPrice: { fontSize: 12, color: '#059669', marginTop: 4 },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 12,
    paddingBottom: 24,
    gap: 8,
  },
  cartText: { color: '#fff', fontWeight: '600', fontSize: 14, marginBottom: 4 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cartItemText: { color: '#fff', fontSize: 12, opacity: 0.9 },
  cartItemRemove: { color: '#fca5a5', fontSize: 12, fontWeight: '700' },
  clearBtn: {
    backgroundColor: '#ffffff33',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearBtnText: { color: '#fff', fontWeight: '500' },
  sendBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#059669', fontWeight: '600' },
});
