
import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <Animatable.View 
        animation="fadeInDown" 
        duration={1500}
        style={styles.content}
      >
        <Animatable.Text 
          animation="pulse" 
          iterationCount="infinite"
          style={styles.title}
        >
          Fuel Management
        </Animatable.Text>
        
        <Animatable.Text 
          animation="fadeInUp" 
          delay={500}
          style={styles.subtitle}
        >
          Streamline your fuel operations with smart tracking and approval workflows
        </Animatable.Text>

        <Animatable.View 
          animation="slideInUp" 
          delay={1000}
          style={styles.buttonContainer}
        >
          <Pressable 
            style={styles.button}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>

          <Pressable 
            style={[styles.button, styles.outlineButton]}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={[styles.buttonText, styles.outlineButtonText]}>Create Account</Text>
          </Pressable>
        </Animatable.View>
      </Animatable.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'white',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  outlineButtonText: {
    color: 'white',
  },
});
