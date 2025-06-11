
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import * as Animatable from 'react-native-animatable';

export default function WaitingApprovalScreen() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/welcome');
  };

  return (
    <View style={styles.container}>
      <Animatable.View animation="fadeInUp" style={styles.content}>
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite"
          style={styles.iconContainer}
        >
          <Text style={styles.icon}>⏳</Text>
        </Animatable.View>
        
        <Text style={styles.title}>Account Pending Approval</Text>
        <Text style={styles.message}>
          Your fueler account has been created and is awaiting approval from a CTO. 
          You will be able to access the app once your account is approved.
        </Text>
        
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </Animatable.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 30,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  signOutText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
