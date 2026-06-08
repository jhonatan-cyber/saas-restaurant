import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

export interface LoadingViewProps {
  /** Mensaje opcional (default: "Cargando…") */
  message?: string;
  /** Color del spinner (default: brand verde) */
  color?: string;
  /** Si es true, ocupa toda la pantalla (default: true) */
  fullScreen?: boolean;
}

/**
 * Componente de estado de carga para React Native.
 * Por defecto ocupa toda la pantalla centrado.
 * Si `fullScreen` es false, se renderiza sin flex:1 (útil dentro de un FlatList).
 */
export function LoadingView({
  message = 'Cargando…',
  color = '#059669',
  fullScreen = true,
}: LoadingViewProps): ReactNode {
  return (
    <View style={fullScreen ? styles.full : styles.inline}>
      <ActivityIndicator size="large" color={color} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
});
