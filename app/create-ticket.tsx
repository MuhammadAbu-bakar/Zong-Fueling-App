
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import * as Animatable from 'react-native-animatable';

export default function CreateTicketScreen() {
  const { user } = useAuth();
  const [siteId, setSiteId] = useState('');
  const [ticketType, setTicketType] = useState<'uplift' | 'dispersion'>('uplift');
  const [loading, setLoading] = useState(false);
  const [fuelData, setFuelData] = useState<any>(null);

  const fetchSiteData = async () => {
    if (!siteId.trim()) {
      Alert.alert('Error', 'Please enter a Site ID');
      return;
    }

    setLoading(true);
    try {
      // Fetch site fuel history
      const { data: siteData, error } = await supabase
        .from('sites')
        .select('*')
        .eq('site_id', siteId.trim())
        .single();

      if (error) {
        Alert.alert('Error', 'Site not found');
        return;
      }

      // Calculate fuel consumption
      const lastFuelingDate = new Date(siteData.last_fueling_date);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - lastFuelingDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Simulate fuel consumption calculation (this would be based on actual consumption data)
      const dailyConsumptionRate = 0.05; // 5% per day (example)
      const consumptionPercentage = Math.min(daysDiff * dailyConsumptionRate * 100, 100);
      
      setFuelData({
        ...siteData,
        consumptionPercentage,
        daysSinceLastFueling: daysDiff
      });

    } catch (error) {
      console.error('Error fetching site data:', error);
      Alert.alert('Error', 'Failed to fetch site data');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!fuelData) {
      Alert.alert('Error', 'Please fetch site data first');
      return;
    }

    setLoading(true);
    try {
      const initiated = fuelData.consumptionPercentage >= 85;
      
      const { error } = await supabase
        .from('tickets')
        .insert({
          site_id: siteId,
          fueler_id: user?.id,
          ticket_type: ticketType,
          status: 'pending',
          initiated,
          fuel_consumption: fuelData.consumptionPercentage,
          consumption_percentage: fuelData.consumptionPercentage
        });

      if (error) throw error;

      Alert.alert(
        'Ticket Created',
        initiated 
          ? 'Ticket initiated and sent for approval'
          : 'Ticket created but not initiated (consumption < 85%). Sent for CTO review.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Animatable.View animation="fadeInUp" style={styles.content}>
        <Text style={styles.title}>Create New Ticket</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Site ID</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={siteId}
                onChangeText={setSiteId}
                placeholder="Enter Site ID"
                autoCapitalize="characters"
              />
              <Pressable 
                style={styles.fetchButton}
                onPress={fetchSiteData}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.fetchButtonText}>Fetch</Text>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.typeContainer}>
            <Text style={styles.label}>Ticket Type</Text>
            <View style={styles.typeButtons}>
              <Pressable 
                style={[styles.typeButton, ticketType === 'uplift' && styles.typeButtonActive]}
                onPress={() => setTicketType('uplift')}
              >
                <Text style={[styles.typeButtonText, ticketType === 'uplift' && styles.typeButtonTextActive]}>
                  Uplift
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.typeButton, ticketType === 'dispersion' && styles.typeButtonActive]}
                onPress={() => setTicketType('dispersion')}
              >
                <Text style={[styles.typeButtonText, ticketType === 'dispersion' && styles.typeButtonTextActive]}>
                  Dispersion
                </Text>
              </Pressable>
            </View>
          </View>

          {fuelData && (
            <Animatable.View animation="fadeIn" style={styles.fuelDataCard}>
              <Text style={styles.cardTitle}>Site Information</Text>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Last Fueling:</Text>
                <Text style={styles.dataValue}>
                  {fuelData.daysSinceLastFueling} days ago
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Fuel Capacity:</Text>
                <Text style={styles.dataValue}>{fuelData.fuel_capacity}L</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Current Level:</Text>
                <Text style={styles.dataValue}>{fuelData.current_fuel_level}L</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Consumption:</Text>
                <Text style={[
                  styles.dataValue,
                  { color: fuelData.consumptionPercentage >= 85 ? '#28a745' : '#dc3545' }
                ]}>
                  {fuelData.consumptionPercentage.toFixed(1)}%
                </Text>
              </View>
              <Text style={[
                styles.statusText,
                { color: fuelData.consumptionPercentage >= 85 ? '#28a745' : '#dc3545' }
              ]}>
                {fuelData.consumptionPercentage >= 85 
                  ? 'Ticket will be INITIATED' 
                  : 'Ticket will NOT be initiated (< 85%)'}
              </Text>
            </Animatable.View>
          )}

          <Pressable 
            style={[styles.createButton, (!fuelData || loading) && styles.createButtonDisabled]}
            onPress={createTicket}
            disabled={!fuelData || loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating...' : 'Create Ticket'}
            </Text>
          </Pressable>
        </View>
      </Animatable.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  fetchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  fetchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  typeContainer: {
    gap: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  fuelDataCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dataLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  createButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
