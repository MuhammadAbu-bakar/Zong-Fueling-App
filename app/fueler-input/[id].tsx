
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Ticket, Site } from '../../lib/supabase';
import * as Animatable from 'react-native-animatable';

export default function FuelerInputScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchTicketData();
    fetchSites();
  }, []);

  const fetchTicketData = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data.status !== 'approved') {
        Alert.alert('Error', 'This ticket is not approved for input');
        router.back();
        return;
      }

      setTicket(data);
      setSelectedSiteId(data.site_id);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      Alert.alert('Error', 'Failed to load ticket data');
    }
  };

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .order('site_id');

      if (error) throw error;
      setSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSiteId || !fuelQuantity || !vehicleNumber || !driverName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const inputData = {
        site_id: selectedSiteId,
        fuel_quantity: parseFloat(fuelQuantity),
        vehicle_number: vehicleNumber,
        driver_name: driverName,
        start_time: startTime,
        end_time: endTime,
        remarks: remarks,
        submitted_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tickets')
        .update({ 
          fueler_input: inputData,
          status: 'closed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Update site fuel level if it's an uplift
      if (ticket?.ticket_type === 'uplift') {
        const site = sites.find(s => s.site_id === selectedSiteId);
        if (site) {
          const newFuelLevel = site.current_fuel_level + parseFloat(fuelQuantity);
          await supabase
            .from('sites')
            .update({ 
              current_fuel_level: Math.min(newFuelLevel, site.fuel_capacity),
              last_fueling_date: new Date().toISOString()
            })
            .eq('site_id', selectedSiteId);
        }
      }

      // Update site fuel level if it's a dispersion
      if (ticket?.ticket_type === 'dispersion') {
        const site = sites.find(s => s.site_id === selectedSiteId);
        if (site) {
          const newFuelLevel = Math.max(0, site.current_fuel_level - parseFloat(fuelQuantity));
          await supabase
            .from('sites')
            .update({ 
              current_fuel_level: newFuelLevel,
              last_fueling_date: new Date().toISOString()
            })
            .eq('site_id', selectedSiteId);
        }
      }

      Alert.alert(
        'Success',
        'Fuel operation completed and ticket closed',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error) {
      console.error('Error submitting input:', error);
      Alert.alert('Error', 'Failed to submit fuel operation data');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const selectedSite = sites.find(site => site.site_id === selectedSiteId);

  return (
    <ScrollView style={styles.container}>
      <Animatable.View animation="fadeInUp" style={styles.content}>
        <Text style={styles.title}>
          {ticket?.ticket_type === 'uplift' ? '⛽' : '🚛'} {ticket?.ticket_type?.toUpperCase()} Input
        </Text>
        <Text style={styles.subtitle}>Complete the fuel operation details</Text>

        {ticket && (
          <View style={styles.ticketInfo}>
            <Text style={styles.infoTitle}>Ticket Information</Text>
            <Text style={styles.infoText}>Site: {ticket.site_id}</Text>
            <Text style={styles.infoText}>Type: {ticket.ticket_type.toUpperCase()}</Text>
            <Text style={styles.infoText}>Consumption: {ticket.consumption_percentage?.toFixed(1)}%</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Site ID *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSiteId}
                onValueChange={setSelectedSiteId}
                style={styles.picker}
              >
                {sites.map((site) => (
                  <Picker.Item 
                    key={site.id} 
                    label={`${site.site_id} - ${site.fuel_capacity}L`} 
                    value={site.site_id} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          {selectedSite && (
            <Animatable.View animation="fadeIn" style={styles.siteInfo}>
              <Text style={styles.siteInfoTitle}>Site Details</Text>
              <View style={styles.siteInfoRow}>
                <Text style={styles.siteInfoLabel}>Current Level:</Text>
                <Text style={styles.siteInfoValue}>{selectedSite.current_fuel_level}L</Text>
              </View>
              <View style={styles.siteInfoRow}>
                <Text style={styles.siteInfoLabel}>Capacity:</Text>
                <Text style={styles.siteInfoValue}>{selectedSite.fuel_capacity}L</Text>
              </View>
              <View style={styles.siteInfoRow}>
                <Text style={styles.siteInfoLabel}>Available Space:</Text>
                <Text style={styles.siteInfoValue}>
                  {(selectedSite.fuel_capacity - selectedSite.current_fuel_level).toFixed(1)}L
                </Text>
              </View>
            </Animatable.View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fuel Quantity (Liters) *</Text>
            <TextInput
              style={styles.input}
              value={fuelQuantity}
              onChangeText={setFuelQuantity}
              placeholder="Enter fuel quantity"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Vehicle Number *</Text>
            <TextInput
              style={styles.input}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              placeholder="Enter vehicle number"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Driver Name *</Text>
            <TextInput
              style={styles.input}
              value={driverName}
              onChangeText={setDriverName}
              placeholder="Enter driver name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              style={styles.input}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="e.g., 09:30 AM"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              style={styles.input}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="e.g., 10:15 AM"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Remarks</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Any additional notes or observations"
              multiline
              numberOfLines={3}
            />
          </View>

          <Pressable 
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Complete Operation'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
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
    marginBottom: 20,
  },
  ticketInfo: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 2,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
  siteInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  siteInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  siteInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  siteInfoLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  siteInfoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
