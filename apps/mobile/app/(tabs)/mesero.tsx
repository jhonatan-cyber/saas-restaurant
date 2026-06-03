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

interface Table {
  id: string;
  number: string;
  status: 'FREE' | 'OCCUPIED' | 'RESERVED';
  capacity: number;
}

interface Product {
  id: string;
  name: string;
  price: string;
  categoryName?: string;
}

export default function MeseroScreen(): ReactNode {
  const { user, token } = useAuth();
  const branchId = user?.defaultBranchId;

  const [tables, setTables] = useState<Table[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<Array<{ product: Product; qty: number }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!branchId) return;
    try {
      const [tablesData, productsData] = await Promise.all([
        api<Table[]>(`/tables/all?branchId=${branchId}`, { branchId }),
        api<Product[]>(`/products/all?isAvailable=true`, { branchId }),
      ]);
      setTables(tablesData);
      setProducts(productsData);
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addToCart = (product: Product): void => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string): void => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const sendOrder = async (): Promise<void> => {
    if (!selectedTable || cart.length === 0) {
      Alert.alert('Aviso', 'Seleccioná una mesa y agregá productos');
      return;
    }

    try {
      const order = await api<any>(
        '/orders',
        {
          method: 'POST',
          body: {
            type: 'DINE_IN',
            channel: 'MOBILE',
            tableId: selectedTable.id,
            items: cart.map((c) => ({
              productId: c.product.id,
              quantity: c.qty,
            })),
          },
        },
        branchId!,
      );

      // Transition to SENT_TO_KITCHEN inmediatamente
      await api<any>(`/orders/${order.id}/transition`, {
        method: 'POST',
        body: { to: 'SENT_TO_KITCHEN', expectedVersion: order.version },
        branchId: branchId!,
      });

      Alert.alert('✅ Enviado', `Orden para Mesa ${selectedTable.number} enviada a cocina`);
      setCart([]);
      setSelectedTable(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear orden';
      Alert.alert('Error', msg);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mesas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedTable
            ? `Mesa ${selectedTable.number} — ${selectedTable.status}`
            : 'Seleccioná una mesa'}
        </Text>
        <FlatList
          horizontal
          data={tables}
          keyExtractor={(t) => t.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tableCard,
                selectedTable?.id === item.id && styles.tableCardSelected,
                item.status === 'OCCUPIED' && styles.tableCardOccupied,
              ]}
              onPress={() => setSelectedTable(item)}
            >
              <Text style={styles.tableNumber}>{item.number}</Text>
              <Text style={styles.tableStatus}>{item.status}</Text>
              <Text style={styles.tableCapacity}>cap. {item.capacity}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        />
      </View>

      {/* Productos */}
      <View style={[styles.section, { flex: 1 }]}>
        <Text style={styles.sectionTitle}>Productos</Text>
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => addToCart(item)}
            >
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>Bs {Number(item.price).toFixed(2)}</Text>
            </TouchableOpacity>
          )}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        />
      </View>

      {/* Cart */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <Text style={styles.cartText}>
            {cart.reduce((s, c) => s + c.qty, 0)} ítems
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setCart([])}
            >
              <Text style={styles.clearBtnText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={sendOrder}
            >
              <Text style={styles.sendBtnText}>
                Enviar a cocina 🚀
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#059669',
    padding: 12,
    paddingBottom: 24,
  },
  cartText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  clearBtn: {
    backgroundColor: '#fff3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: { color: '#fff', fontWeight: '500' },
  sendBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sendBtnText: { color: '#059669', fontWeight: '600' },
});
