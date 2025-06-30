import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { router, useNavigation } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface MenuItem {
  label: string;
  route: string;
  icon?: string;
}

interface DrawerProps {
  menuItems: MenuItem[];
}

export default function CustomDrawer({ menuItems }: DrawerProps) {
  const { signOut, user } = useAuth();
  const navigation = useNavigation();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/' as any);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigation = (route: string) => {
    try {
      console.log('Navigating to route:', route, 'for user role:', user?.role);
      
      // For admin view navigation to other roles
      if (user?.role === 'admin' && route.includes('/')) {
        router.push(route as any);
        return;
      }
      
      // Get the current user's role path
      const rolePath = user?.role ? `/${user.role}` : '';
      
      // For drawer navigation within the same role view
      if (route.includes('(tabs)')) {
        // Handle tabs navigation
        if (route === '(tabs)') {
          // Navigate to the main tabs screen (dashboard)
          const fullPath = `${rolePath}/(tabs)` as any;
          console.log('Navigating to dashboard:', fullPath);
          router.push(fullPath);
        } else {
          // For specific tabs like (tabs)/todo, (tabs)/done
          // Extract the tab name from the route
          const tabName = route.replace('(tabs)/', '');
          const fullPath = `${rolePath}/${tabName}` as any;
          console.log('Navigating to specific tab:', fullPath);
          router.push(fullPath);
        }
      } else {
        // For non-tabs routes like maps
        const fullPath = `${rolePath}/${route}` as any;
        console.log('Navigating to non-tab route:', fullPath);
        router.push(fullPath);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <DrawerContentScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/images/zong-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.userInfo}>
          {user?.email}
        </Text>
        <Text style={styles.roleText}>
          {user?.role?.toUpperCase()}
        </Text>
      </View>

      <ScrollView style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleNavigation(item.route)}
          >
            <Text style={styles.menuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 16,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    color: '#8DC63F',
    fontWeight: 'bold',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 16,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    margin: 16,
    padding: 12,
    backgroundColor: '#dc3545',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 