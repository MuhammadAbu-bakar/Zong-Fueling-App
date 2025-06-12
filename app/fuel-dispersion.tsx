
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Site } from '../lib/supabase';
import * as Animatable from 'react-native-animatable';

export default function FuelDispersionScreen() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [siteData, setSiteData] = useState<Site | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('Site Id')
        .select('*')
        .order('site_id');

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoadingSites(false);
    }
  };

  const handleSiteSelect = async (siteId: string) => {
    setSelectedSiteId(siteId);
    if (!siteId) {
      setSiteData(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Site Id')
        .select('*')
        .eq('site_id', siteId)
        .single();

      if (error) throw error;

      // Calculate fuel consumption
      const lastFuelingDate = new Date(data.last_fueling_date);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - lastFuelingDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate consumption percentage based on current fuel level vs capacity
      const consumptionPercentage = ((data.fuel_capacity - data.current_fuel_level) / data.fuel_capacity) * 100;
      
      setSiteData({
        ...data,
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
    if (!siteData) {
      Alert.alert('Error', 'Please select a site first');
      return;
    }

    setLoading(true);
    try {
      const initiated = siteData.consumptionPercentage >= 85;
      
      const { error } = await supabase
        .from('Uplift')
        .insert({
          site_id: selectedSiteId,
          fueler_id: user?.id,
          ticket_type: 'dispersion',
          status: 'pending',
          initiated,
          fuel_consumption: siteData.consumptionPercentage,
          consumption_percentage: siteData.consumptionPercentage
        });

      if (error) throw error;

      Alert.alert(
        'Ticket Created',
        initiated 
          ? 'Dispersion ticket initiated and sent for approval'
          : 'Dispersion ticket created but not initiated (consumption < 85%). Sent for CTO review.',
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
        <Text style={styles.title}>🚛 Fuel Dispersion</Text>
        <Text style={styles.subtitle}>Select a site to create a dispersion ticket</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Select Site</Text>
            {loadingSites ? (
              <ActivityIndicator style={styles.loader} />
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedSiteId}
                  onValueChange={handleSiteSelect}
                  style={styles.picker}
                >
                  <Picker.Item label="Choose a site..." value="" />
                  {sites.map((site) => (
                    <Picker.Item 
                      key={site.id} 
                      label={`${site.site_id} - ${site.fuel_capacity}L capacity`} 
                      value={site.site_id} 
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Loading site data...</Text>
            </View>
          )}

          {siteData && (
            <Animatable.View animation="fadeIn" style={styles.siteDataCard}>
              <Text style={styles.cardTitle}>Site Information</Text>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Site ID:</Text>
                <Text style={styles.dataValue}>{selectedSiteId}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Last Fueling:</Text>
                <Text style={styles.dataValue}>
                  {siteData.daysSinceLastFueling} days ago ({new Date(siteData.last_fueling_date).toLocaleDateString()})
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Fuel Capacity:</Text>
                <Text style={styles.dataValue}>{siteData.fuel_capacity}L</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Current Level:</Text>
                <Text style={styles.dataValue}>{siteData.current_fuel_level}L</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Available for Dispersion:</Text>
                <Text style={styles.dataValue}>
                  {siteData.current_fuel_level.toFixed(1)}L
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Consumption:</Text>
                <Text style={[
                  styles.dataValue,
                  { color: siteData.consumptionPercentage >= 85 ? '#28a745' : '#dc3545' }
                ]}>
                  {siteData.consumptionPercentage.toFixed(1)}%
                </Text>
              </View>
              <Text style={[
                styles.statusText,
                { color: siteData.consumptionPercentage >= 85 ? '#28a745' : '#dc3545' }
              ]}>
                {siteData.consumptionPercentage >= 85 
                  ? '✅ Ticket will be INITIATED' 
                  : '⚠️ Ticket will NOT be initiated (< 85%)'}
              </Text>
            </Animatable.View>
          )}

          <Pressable 
            style={[styles.createButton, (!siteData || loading) && styles.createButtonDisabled]}
            onPress={createTicket}
            disabled={!siteData || loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating Ticket...' : 'Create Dispersion Ticket'}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  loader: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  siteDataCard: {
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
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  createButton: {
    backgroundColor: '#FF6B35',
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
