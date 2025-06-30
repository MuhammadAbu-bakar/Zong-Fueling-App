import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Text } from 'react-native';
import CustomDrawer from '../../components/CustomDrawer';
import { useAuth } from '../../contexts/AuthContext';

const rmMenuItems = [
  { label: 'Dashboard', route: 'rm/index' },
  { label: 'To Do Tickets', route: 'rm/todo' },
  { label: 'Done Tickets', route: 'rm/done' },
  { label: 'Maps', route: 'rm/maps' },
];

export default function RMLayout() {
  const { user } = useAuth();

  if (!user || (user.role !== 'rm' && user.role !== 'admin')) {
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
      drawerContent={() => <CustomDrawer menuItems={rmMenuItems} />}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Dashboard',
          drawerLabel: 'Dashboard',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Dashboard
            </Text>
          ),
        }}
      />
      <Drawer.Screen
        name="todo"
        options={{
          title: 'To Do Tickets',
          drawerLabel: 'To Do Tickets',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              To Do Tickets
            </Text>
          ),
        }}
      />
      <Drawer.Screen
        name="done"
        options={{
          title: 'Done Tickets',
          drawerLabel: 'Done Tickets',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Done Tickets
            </Text>
          ),
        }}
      />
      <Drawer.Screen
        name="maps"
        options={{
          title: 'Maps',
          drawerLabel: 'Maps',
          headerTitle: () => (
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Maps
            </Text>
          ),
        }}
      />
    </Drawer>
  );
} 