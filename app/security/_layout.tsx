import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Text } from 'react-native';
import CustomDrawer from '../../components/CustomDrawer';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

const securityMenuItems = [
  { label: 'Dashboard', route: 'index' },
  { label: 'History', route: 'history' },
  { label: 'Deviations', route: 'deviations' },
  { label: 'Settings', route: 'settings' },
];

export default function SecurityLayout() {
  const { user } = useAuth();

  if (!user || (user.role !== 'security' && user.role !== 'admin')) {
    router.replace('/auth/login');
    return null;
  }

  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: '#8DC63F',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
      drawerContent={(props) => <CustomDrawer {...props} menuItems={securityMenuItems} />}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Security Dashboard',
          drawerLabel: 'Dashboard',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Security Dashboard
            </Text>
          ),
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          title: 'Fueling History',
          drawerLabel: 'History',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Fueling History
            </Text>
          ),
        }}
      />
      <Drawer.Screen
        name="deviations"
        options={{
          title: 'Deviation Reports',
          drawerLabel: 'Deviations',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Deviation Reports
            </Text>
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerLabel: 'Settings',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Settings
            </Text>
          ),
        }}
      />
    </Drawer>
  );
} 