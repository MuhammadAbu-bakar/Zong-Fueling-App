import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

export default function GTLTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide tab bar since we're using drawer navigation
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          href: null, // This prevents the tab from being accessible via URL
        }}
      />
      <Tabs.Screen
        name="todo"
        options={{
          title: 'To Do Tickets',
          href: null, // This prevents the tab from being accessible via URL
        }}
      />
      <Tabs.Screen
        name="done"
        options={{
          title: 'Done Tickets',
          href: null, // This prevents the tab from being accessible via URL
        }}
      />
    </Tabs>
  );
} 