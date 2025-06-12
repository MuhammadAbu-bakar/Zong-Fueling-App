
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase, SiteId, FuelingTeam } from '../lib/supabase';
import * as Animatable from 'react-native-animatable';

export default function FuelUpliftScreen() {
  const { user } = useAuth();
  const [sites, setSites] = useState<SiteId[]>([]);
  const [teams, setTeams] = useState<FuelingTeam[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [siteData, setSiteData] = useState<SiteId | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  
  // Form fields matching CSV structure
  const [formData, setFormData] = useState({
    fuelerName: '',
    fuelPump: '',
    pumpVendor: '',
    pumpLocation: '',
    fuelCard: '',
    cardCompany: '',
    fuelQuantityCollected: '',
    pumpReadingBefore: '',
    pumpReadingAfter: ''
  });

  useEffect(() => {
    fetchSites();
    fetchTeams();
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

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('Fueling Team')
        .select('*')
        .order('team_name');

      if (error) {
        console.error('Error fetching teams:', error);
        // Create default teams if table doesn't exist
        setTeams([
          { id: '1', team_name: 'LHR-1', location: 'Lahore', created_at: new Date().toISOString() },
          { id: '2', team_name: 'LHR-2', location: 'Lahore', created_at: new Date().toISOString() },
          { id: '3', team_name: 'KHI-1', location: 'Karachi', created_at: new Date().toISOString() }
        ]);
      } else {
        setTeams(data || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
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

      const lastFuelingDate = new Date(data.last_fueling_date);
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - lastFuelingDate.getTime()) / (1000 * 60 * 60 * 24));
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

  const createUpliftRecord = async () => {
    if (!selectedTeam || !formData.fuelerName || !formData.fuelQuantityCollected) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const upliftData = {
        fuel_team: selectedTeam,
        fueler_name: formData.fuelerName,
        user_email: user?.email || '',
        fuel_pump: formData.fuelPump,
        pump_vendor: formData.pumpVendor,
        pump_location: formData.pumpLocation,
        actual_fuel_time: new Date().toISOString(),
        fuel_card: formData.fuelCard,
        card_company: formData.cardCompany,
        fuel_quantity_collected: parseFloat(formData.fuelQuantityCollected),
        transaction: true,
        pump_reading_before: formData.pumpReadingBefore,
        pump_reading_after: formData.pumpReadingAfter,
        status: 'pending'
      };

      const { error } = await supabase
        .from('Uplift')
        .insert(upliftData);

      if (error) throw error;

      // Update fuel history if we have a site selected
      if (selectedSiteId) {
        await supabase
          .from('Fuel History')
          .insert({
            site_id: selectedSiteId,
            fuel_team: selectedTeam,
            fuel_quantity: parseFloat(formData.fuelQuantityCollected),
            fuel_time: new Date().toISOString(),
            pump_vendor: formData.pumpVendor
          });

        // Update site fuel level
        const newFuelLevel = (siteData?.current_fuel_level || 0) + parseFloat(formData.fuelQuantityCollected);
        await supabase
          .from('Site Id')
          .update({ 
            current_fuel_level: newFuelLevel,
            last_fueling_date: new Date().toISOString()
          })
          .eq('site_id', selectedSiteId);
      }

      Alert.alert(
        'Uplift Record Created',
        'Fuel uplift has been recorded successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error) {
      console.error('Error creating uplift record:', error);
      Alert.alert('Error', 'Failed to create uplift record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Animatable.View animation="fadeInUp" style={styles.content}>
        <Text style={styles.title}>⛽ Fuel Uplift</Text>
        <Text style={styles.subtitle}>Record fuel uplift details</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fuel Team *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedTeam}
                onValueChange={setSelectedTeam}
                style={styles.picker}
              >
                <Picker.Item label="Select fuel team..." value="" />
                {teams.map((team) => (
                  <Picker.Item 
                    key={team.id} 
                    label={`${team.team_name} - ${team.location}`} 
                    value={team.team_name} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Site (Optional)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSiteId}
                onValueChange={handleSiteSelect}
                style={styles.picker}
              >
                <Picker.Item label="Select site (optional)..." value="" />
                {sites.map((site) => (
                  <Picker.Item 
                    key={site.id} 
                    label={`${site.site_id} - ${site.fuel_capacity}L capacity`} 
                    value={site.site_id} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fueler Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.fuelerName}
              onChangeText={(text) => setFormData(prev => ({...prev, fuelerName: text}))}
              placeholder="Enter fueler name"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fuel Pump</Text>
            <TextInput
              style={styles.textInput}
              value={formData.fuelPump}
              onChangeText={(text) => setFormData(prev => ({...prev, fuelPump: text}))}
              placeholder="e.g., Ravi Trucking Fueling Station"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pump Vendor</Text>
            <TextInput
              style={styles.textInput}
              value={formData.pumpVendor}
              onChangeText={(text) => setFormData(prev => ({...prev, pumpVendor: text}))}
              placeholder="e.g., Shell, Total, PSO"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Pump Location</Text>
            <TextInput
              style={styles.textInput}
              value={formData.pumpLocation}
              onChangeText={(text) => setFormData(prev => ({...prev, pumpLocation: text}))}
              placeholder="e.g., Shahdara More"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fuel Quantity Collected (Liters) *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.fuelQuantityCollected}
              onChangeText={(text) => setFormData(prev => ({...prev, fuelQuantityCollected: text}))}
              placeholder="Enter fuel quantity"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fuel Card</Text>
            <TextInput
              style={styles.textInput}
              value={formData.fuelCard}
              onChangeText={(text) => setFormData(prev => ({...prev, fuelCard: text}))}
              placeholder="e.g., 7002799-306437-001527"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Card Company</Text>
            <TextInput
              style={styles.textInput}
              value={formData.cardCompany}
              onChangeText={(text) => setFormData(prev => ({...prev, cardCompany: text}))}
              placeholder="Card company name"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Pump Reading Before</Text>
              <TextInput
                style={styles.textInput}
                value={formData.pumpReadingBefore}
                onChangeText={(text) => setFormData(prev => ({...prev, pumpReadingBefore: text}))}
                placeholder="Before reading"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Pump Reading After</Text>
              <TextInput
                style={styles.textInput}
                value={formData.pumpReadingAfter}
                onChangeText={(text) => setFormData(prev => ({...prev, pumpReadingAfter: text}))}
                placeholder="After reading"
                keyboardType="numeric"
              />
            </View>
          </View>

          {siteData && (
            <Animatable.View animation="fadeIn" style={styles.siteDataCard}>
              <Text style={styles.cardTitle}>Site Information</Text>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Site ID:</Text>
                <Text style={styles.dataValue}>{selectedSiteId}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Current Level:</Text>
                <Text style={styles.dataValue}>{siteData.current_fuel_level}L</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>After Uplift:</Text>
                <Text style={styles.dataValue}>
                  {(siteData.current_fuel_level + parseFloat(formData.fuelQuantityCollected || '0')).toFixed(1)}L
                </Text>
              </View>
            </Animatable.View>
          )}

          <Pressable 
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={createUpliftRecord}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Recording Uplift...' : 'Record Fuel Uplift'}
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
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: 'white',
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  createButton: {
    backgroundColor: '#007AFF',
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
