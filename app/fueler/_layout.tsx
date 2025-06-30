import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Text } from 'react-native';
import CustomDrawer from '../../components/CustomDrawer';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

const fuelerMenuItems = [
  { label: 'Dashboard', route: 'index' },
  { label: 'Dispersion Form', route: 'dispersion-form' },
  { label: 'History', route: 'history' },
];

export default function FuelerLayout() {
  const { user } = useAuth();

  if (!user || (user.role !== 'fueler' && user.role !== 'admin')) {
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
      drawerContent={(props) => <CustomDrawer {...props} menuItems={fuelerMenuItems} />}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Fueler Dashboard',
          drawerLabel: 'Dashboard',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Fueler Dashboard
            </Text>
          ),
        }}
      />
      <Drawer.Screen
        name="dispersion-form"
        options={{
          title: 'Dispersion Form',
          drawerLabel: 'Dispersion Form',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Dispersion Form
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
    </Drawer>
  );
} 