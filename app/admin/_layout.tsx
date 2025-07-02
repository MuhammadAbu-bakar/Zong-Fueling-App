import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Text } from 'react-native';
import CustomDrawer from '../../components/CustomDrawer';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

const adminMenuItems = [
  { label: 'Dashboard', route: '/admin/index' },
  { label: 'Coordinator View', route: '/coordinator/coordinator' },
  { label: 'RM View', route: '/rm/index' },
  { label: 'Fueler View', route: '/fueler/index' },
  { label: 'Security View', route: '/security/index' },
  { label: 'GTL View', route: '/gtl/(tabs)' },
  { label: 'Settings', route: '/admin/settings' },
];

export default function AdminLayout() {
  const { user } = useAuth();

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  if (!user || user.role !== 'admin') {
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
        drawerType: 'front',
      }}
      drawerContent={(props) => (
        <CustomDrawer 
          {...props} 
          menuItems={adminMenuItems.map(item => ({
            ...item,
            route: item.route.startsWith('/') ? item.route.slice(1) : item.route
          }))} 
        />
      )}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Admin Dashboard',
          drawerLabel: 'Dashboard',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Admin Dashboard
            </Text>
          ),
        }}
      />
      <Drawer.Screen
        name="gtl/(tabs)"
        options={{
          title: 'GTL View',
          drawerLabel: 'GTL View',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              GTL View
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