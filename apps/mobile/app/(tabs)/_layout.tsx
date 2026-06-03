import { Tabs } from 'expo-router';
import { type ReactNode } from 'react';

export default function TabLayout(): ReactNode {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#059669' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#059669',
        tabBarStyle: { paddingBottom: 4, height: 60 },
      }}
    >
      <Tabs.Screen
        name="mesero"
        options={{
          title: 'Mesero',
          tabBarLabel: 'Mesero',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 20 }}>🍽️</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="delivery"
        options={{
          title: 'Delivery',
          tabBarLabel: 'Delivery',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 20 }}>📦</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: 20 }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}

import { Text } from 'react-native';
