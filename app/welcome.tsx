import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Route based on user role
      switch (user.role) {
        case 'fueler':
          router.replace('/fueler/index' as any);
          break;
        case 'rm':
          router.replace('/rm/(tabs)' as any);
          break;
        case 'coordinator':
          router.replace('/coordinator/coordinator' as any);
          break;
        case 'cto':
          router.replace('/cto/index' as any);
          break;
        case 'security':
          router.replace('/security' as any);
          break;
        default:
          // If no role or unknown role, stay on welcome screen
          break;
      }
    }
  }, [user]);

  return (
    <LinearGradient
      colors={['#8CC63E', '#8CC63E', '#ffffff']}
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      <Animatable.View 
        animation="fadeInDown" 
        duration={1500}
        style={styles.content}
      >
        <Animatable.View 
          animation="bounceIn"
          duration={1500}
          style={styles.logoContainer}
        >
          <Image
            source={require('../../Fueling-App/assets/images/zong-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animatable.View>

        <Animatable.Text 
          animation="pulse" 
          iterationCount="infinite"
          style={styles.title}
        >
          Fuel Management App
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
  logoContainer: {
    
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 3,
    borderRadius: 7,
    width: 200,
    height: 100,
  },
  logo: {
    marginTop:-23,
    width: 250,
    height: 150,
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
    color: '#8CC63E',
  },
  outlineButtonText: {
    color: 'white',
  },
});
