import { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/auth';

export default function SettingsScreen(): ReactNode {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = (): void => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.fullName ?? 'Usuario'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
        <Text style={styles.role}>{user?.role ?? ''}</Text>
        <Text style={styles.branch}>
          Sucursal: {user?.defaultBranchId?.slice(-8) ?? 'Sin asignar'}
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  role: { fontSize: 12, color: '#059669', marginTop: 4, fontWeight: '600' },
  branch: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  logoutBtn: {
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
