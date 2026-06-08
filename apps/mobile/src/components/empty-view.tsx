import { View, Text, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';

export interface EmptyViewProps {
  /** Título principal (default: "Sin datos") */
  title?: string;
  /** Descripción opcional */
  description?: string;
  /** Emoji / icono (default: 📦) */
  icon?: string;
  /** Acción opcional nodo React (ej. botón "Crear primero") */
  action?: ReactNode;
  /** Si es true, ocupa toda la pantalla (default: true) */
  fullScreen?: boolean;
}

/**
 * Componente de estado vacío para React Native.
 * Muestra un icono, título, descripción y acción opcional.
 */
export function EmptyView({
  title = 'Sin datos',
  description,
  icon = '📦',
  action,
  fullScreen = true,
}: EmptyViewProps): ReactNode {
  return (
    <View style={fullScreen ? styles.full : styles.inline}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.action}>{action}</View>}
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
    paddingVertical: 48,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  action: {
    marginTop: 16,
  },
});
