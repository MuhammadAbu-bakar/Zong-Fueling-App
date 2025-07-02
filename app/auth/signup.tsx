import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import * as Animatable from 'react-native-animatable';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'fueler' | 'cto' | 'coordinator' | 'rm'>('fueler');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  /*
  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, role);
      Alert.alert(
        'Success', 
        role === 'fueler' 
          ? 'Account created! Please wait for CTO approval.'
          : `${role.toUpperCase()} account created successfully!`,
        [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
      );
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message);
    } finally {
      setLoading(false);
    }
  };
  */

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animatable.View animation="fadeInUp" style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the fuel management system</Text>

        <View style={styles.form}>
          <View style={styles.roleContainer}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleButtons}>
              <Pressable 
                style={[styles.roleButton, role === 'fueler' && styles.roleButtonActive]}
                onPress={() => setRole('fueler')}
              >
                <Text style={[styles.roleButtonText, role === 'fueler' && styles.roleButtonTextActive]}>
                  Fueler
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.roleButton, role === 'cto' && styles.roleButtonActive]}
                onPress={() => setRole('cto')}
              >
                <Text style={[styles.roleButtonText, role === 'cto' && styles.roleButtonTextActive]}>
                  CTO
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.roleButton, role === 'coordinator' && styles.roleButtonActive]}
                onPress={() => setRole('coordinator')}
              >
                <Text style={[styles.roleButtonText, role === 'coordinator' && styles.roleButtonTextActive]}>
                  Coordinator
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.roleButton, role === 'rm' && styles.roleButtonActive]}
                onPress={() => setRole('rm')}
              >
                <Text style={[styles.roleButtonText, role === 'rm' && styles.roleButtonTextActive]}>
                  RM
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
            />
          </View>

          <Pressable 
            style={[styles.button, loading && styles.buttonDisabled]}
            // onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/auth/login')}>
            <Text style={styles.linkText}>
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>
      </Animatable.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  form: {
    gap: 20,
  },
  roleContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  roleButtonTextActive: {
    color: 'white',
  },
  inputContainer: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    textAlign: 'center',
    color: '#007AFF',
    fontSize: 14,
  },
});
