import { useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/lib/auth';
import { apiRequest, ApiClientError } from '../src/lib/api-client';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    defaultBranchId: string | null;
  };
}

export default function LoginScreen(): ReactNode {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessSlug, setBusinessSlug] = useState('demo');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Completá email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: {
          email: email.trim(),
          password,
          businessSlug: businessSlug.trim(),
        },
        skipAuth: true,
      });
      // Guardar accessToken + refreshToken para auto-refresh
      await signIn(data.accessToken, data.refreshToken, data.user);
      router.replace('/(tabs)/mesero');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        Alert.alert('Error de login', err.message);
      } else if (err instanceof Error) {
        Alert.alert('Error de login', err.message);
      } else {
        Alert.alert('Error de login', 'Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>SaaS Restaurant</Text>
        <Text style={styles.subtitle}>Iniciar sesión</Text>

        <TextInput
          style={styles.input}
          placeholder="Business slug"
          value={businessSlug}
          onChangeText={setBusinessSlug}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#059669',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
