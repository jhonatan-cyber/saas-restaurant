import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

export interface ErrorViewProps {
  /** Mensaje de error principal */
  message?: string;
  /** Callback opcional para botón de reintentar */
  onRetry?: () => void;
  /** Texto del botón reintentar (default: "Reintentar") */
  retryLabel?: string;
  /** Color del botón (default: brand verde) */
  buttonColor?: string;
  /** Si es true, ocupa toda la pantalla (default: true) */
  fullScreen?: boolean;
}

/**
 * Componente de estado de error para React Native.
 * Muestra icono de error, mensaje y botón opcional de reintentar.
 */
export function ErrorView({
  message = 'Ocurrió un error',
  onRetry,
  retryLabel = 'Reintentar',
  buttonColor = '#059669',
  fullScreen = true,
}: ErrorViewProps): ReactNode {
  return (
    <View style={fullScreen ? styles.full : styles.inline}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: buttonColor }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.retryBtnText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
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
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#dc2626',
  },
  message: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
