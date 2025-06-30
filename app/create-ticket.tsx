import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  FlatList,
  TouchableOpacity
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import * as Animatable from 'react-native-animatable';

interface SiteId2 {
  "Site ID": string;
  "Grid": string | null;
  "Address": string | null;
}

interface FuelingHistory {
  "Ticket Category": string | null;
  "Ticket No": string | null;
  "Request Title": string | null;
  "Create Time": string | null;
  "Current Node": string | null;
  "Site ID Name": string | null;
  "Manager Approval": string | null;
  "RCTO Approval": string | null;
  "Site in Manual Approval List": string | null;
  "Site in Auto Approval List": string | null;
  "Created By": string | null;
  "Auto Approval": string | null;
  "Only Need Manager Approval": string | null;
  "Fuel Prediction (With No. of Days) (Ltrs)": string | null;
  "Available Fuel in Tank (Ltrs)": number | null;
  "Fueling Team Name": string | null;
  "Fueling Team (Before)": string | null;
  "Fueler Name": string | null;
  "Fueler Phone": number | null;
  "Refueling Time": string | null;
  "Refueling Time (Before)": string | null;
  "Left Fuel in Vehicle": string | null;
  "Current DG Meter Status": string | null;
  "DG Label No.": string | null;
  "DG Capacity (KVA)": number | null;
  "Internal Tank Capacity (L)": string | null;
  "External Tank Capacity (L)": string | null;
  "DG Hour Meter Reading": string | null;
  "DG Hour Meter Reading (Before)": string | null;
  "Before Filling Fuel Quantity": string | null;
  "Before Filling Fuel Quantity (Before)": string | null;
  "Fuel Quantity Filled": number | null;
  "Fuel Quantity Filled (Before)": number | null;
  "Remark": string | null;
  "CDR Status": string | null;
  "CDR Site": number | null;
  "Region": string | null;
  "Current Site Status": string | null;
  "NE in Core Location": string | null;
  "Request Fuel Quantity": string | null;
  "Fueling Required Date": string | null;
  "Approve Fuel Quantity": string | null;
  "Refueling Date": string | null;
  "Total Fuel": number | null;
  "Site ID + Date": string;
}

export default function CreateTicketScreen() {
  const { user } = useAuth();
  const [siteId, setSiteId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sites, setSites] = useState<SiteId2[]>([]);
  const [filteredSites, setFilteredSites] = useState<SiteId2[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [ticketType, setTicketType] = useState<'uplift' | 'dispersion'>('uplift');
  const [loading, setLoading] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [fuelData, setFuelData] = useState<any>(null);

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = sites.filter(site => 
        site["Site ID"].toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSites(filtered);
    } else {
      setFilteredSites(sites);
    }
  }, [searchQuery, sites]);

  const fetchSites = async () => {
    try {
      const { data, error } = await supabase
        .from('site_id2')
        .select('*')
        .order('"Site ID"');

      if (error) throw error;
      setSites(data || []);
      setFilteredSites(data || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
      Alert.alert('Error', 'Failed to fetch sites');
    } finally {
      setLoadingSites(false);
    }
  };

  const fetchSiteData = async (selectedSiteId: string) => {
    try {
      console.log('Fetching data for site:', selectedSiteId);
      
      // First, verify the site exists in site_id2 table
      const { data: siteData, error: siteError } = await supabase
        .from('site_id2')
        .select('*')
        .eq('Site ID', selectedSiteId.trim());

      if (siteError) {
        console.error('Error fetching site data:', siteError);
        throw siteError;
      }

      if (!siteData || siteData.length === 0) {
        console.log('Site not found in site_id2 table');
        Alert.alert('Error', 'Site ID not found in the database');
        return;
      }

      console.log('Site found in site_id2:', siteData[0]);

      // Try multiple search strategies for fueling history
      let fuelingData = null;
      let searchAttempts = [
        // Attempt 1: Direct match
        {
          query: selectedSiteId,
          result: await supabase
            .from('fueling_history')
            .select('*')
            .eq('Site ID Name', selectedSiteId)
            .order('Refueling Time', { ascending: false })
        },
        // Attempt 2: Trimmed match
        {
          query: selectedSiteId.trim(),
          result: await supabase
            .from('fueling_history')
            .select('*')
            .eq('Site ID Name', selectedSiteId.trim())
            .order('Refueling Time', { ascending: false })
        },
        // Attempt 3: Case-insensitive match
        {
          query: selectedSiteId.toLowerCase(),
          result: await supabase
            .from('fueling_history')
            .select('*')
            .ilike('Site ID Name', selectedSiteId)
            .order('Refueling Time', { ascending: false })
        }
      ];

      // Log all search attempts for debugging
      searchAttempts.forEach((attempt, index) => {
        console.log(`Search attempt ${index + 1}:`, {
          query: attempt.query,
          data: attempt.result.data,
          error: attempt.result.error
        });
      });

      // Find the first successful attempt
      for (let attempt of searchAttempts) {
        if (attempt.result.error) {
          console.error('Error in search attempt:', attempt.result.error);
          continue;
        }
        
        if (attempt.result.data && attempt.result.data.length > 0) {
          fuelingData = attempt.result.data;
          console.log('Found matching data using query:', attempt.query);
          break;
        }
      }

      if (!fuelingData) {
        // If no data found, create a new entry with basic info from site_id2
        console.log('No fueling history found, creating initial entry');
        const newEntry = {
          "Site ID Name": selectedSiteId.trim(),
          "Site ID + Date": `${selectedSiteId.trim()}_${new Date().toISOString().split('T')[0]}`,
          "Region": siteData[0].Grid || null,
          "Current Site Status": "New",
          "Available Fuel in Tank (Ltrs)": 0,
          "Total Fuel": 0,
          "Refueling Time": null
        };

        const { data: insertData, error: insertError } = await supabase
          .from('fueling_history')
          .insert([newEntry])
          .select();

        if (insertError) {
          console.error('Error creating initial entry:', insertError);
          Alert.alert('Error', 'Failed to create initial fueling record');
          return;
        }

        fuelingData = insertData;
        console.log('Created initial fueling record:', insertData);
      }

      // Use the most recent record
      const latestFuelingData = fuelingData[0];

      // Calculate consumption data
      const totalFuel = latestFuelingData['Total Fuel'] || 0;
      const availableFuel = latestFuelingData['Available Fuel in Tank (Ltrs)'] || 0;
      const consumptionPercentage = calculateConsumptionPercentage(availableFuel, totalFuel);

      const consumptionData = {
        availableFuel,
        totalFuel,
        lastRefuelingTime: latestFuelingData['Refueling Time'],
        fuelQuantityFilled: latestFuelingData['Fuel Quantity Filled'] || 0,
        consumptionPercentage
      };

      setFuelData({
        siteDetails: {
          siteId: selectedSiteId,
          fuelingTeam: latestFuelingData['Fueling Team Name'],
          fuelerName: latestFuelingData['Fueler Name'],
          ticketCategory: latestFuelingData['Ticket Category'],
          ticketNo: latestFuelingData['Ticket No'],
          region: latestFuelingData['Region'],
          currentStatus: latestFuelingData['Current Site Status'],
          dgCapacity: latestFuelingData['DG Capacity (KVA)'],
          internalTankCapacity: latestFuelingData['Internal Tank Capacity (L)'],
          externalTankCapacity: latestFuelingData['External Tank Capacity (L)']
        },
        consumptionData,
        rawData: latestFuelingData,
        fuelingHistory: fuelingData
      });

      console.log('Successfully set fuel data:', {
        siteId: selectedSiteId,
        fuelingTeam: latestFuelingData['Fueling Team Name'],
        fuelerName: latestFuelingData['Fueler Name'],
        availableFuel,
        totalFuel,
        lastRefuelingTime: latestFuelingData['Refueling Time'],
        consumptionPercentage,
        totalRecords: fuelingData.length,
        region: latestFuelingData['Region'],
        currentStatus: latestFuelingData['Current Site Status']
      });

    } catch (error) {
      console.error('Error in fetchSiteData:', error);
      Alert.alert('Error', 'Failed to fetch site data. Please check the console for details.');
    }
  };

  const calculateConsumptionPercentage = (availableFuel: number, totalFuel: number) => {
    if (!totalFuel) return 0;
    const consumed = totalFuel - availableFuel;
    return (consumed / totalFuel) * 100;
  };

  const handleSiteSelect = (site: SiteId2) => {
    setSiteId(site["Site ID"]);
    setSearchQuery(site["Site ID"]);
    setShowDropdown(false);
    fetchSiteData(site["Site ID"]);
  };

  const createTicket = async () => {
    if (!fuelData) {
      Alert.alert('Error', 'Please fetch site data first');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const initiated = fuelData.consumptionData?.consumptionPercentage >= 85;
      
      const ticketData = {
        site_id: siteId,
        fueler_id: user.id,
        ticket_type: ticketType,
        status: 'pending',
        initiated,
        fuel_consumption: fuelData.consumptionData?.availableFuel || 0,
        consumption_percentage: fuelData.consumptionData?.consumptionPercentage || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Creating ticket with data:', JSON.stringify(ticketData, null, 2));

      const { data, error } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Ticket created successfully:', JSON.stringify(data, null, 2));

      Alert.alert(
        'Ticket Created',
        initiated 
          ? 'Ticket initiated and sent for approval'
          : 'Ticket created but not initiated (consumption < 85%). Sent for CTO review.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error: any) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', `Failed to create ticket: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const renderSiteDetails = () => {
    if (!fuelData) return null;

    return (
      <Animatable.View animation="fadeIn" style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>Site Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Region:</Text>
          <Text style={styles.value}>{fuelData.siteDetails.region || '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Current Status:</Text>
          <Text style={styles.value}>{fuelData.siteDetails.currentStatus || '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Fueling Team:</Text>
          <Text style={styles.value}>{fuelData.siteDetails.fuelingTeam || '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Fueler Name:</Text>
          <Text style={styles.value}>{fuelData.siteDetails.fuelerName || '-'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>DG Capacity:</Text>
          <Text style={styles.value}>
            {fuelData.siteDetails.dgCapacity ? `${fuelData.siteDetails.dgCapacity} KVA` : '-'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Tank Capacity:</Text>
          <Text style={styles.value}>
            {`Int: ${fuelData.siteDetails.internalTankCapacity || '-'}, Ext: ${fuelData.siteDetails.externalTankCapacity || '-'}`}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Available Fuel:</Text>
          <Text style={styles.value}>{fuelData.consumptionData.availableFuel.toFixed(2)} Ltrs</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Total Fuel:</Text>
          <Text style={styles.value}>{fuelData.consumptionData.totalFuel.toFixed(2)} Ltrs</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Consumption:</Text>
          <Text style={[
            styles.value,
            { color: fuelData.consumptionData.consumptionPercentage >= 85 ? '#dc3545' : '#28a745' }
          ]}>
            {fuelData.consumptionData.consumptionPercentage.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Last Refueling:</Text>
          <Text style={styles.value}>
            {fuelData.consumptionData.lastRefuelingTime || '-'}
          </Text>
        </View>
      </Animatable.View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Create New Ticket</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Site ID</Text>
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowDropdown(true);
              }}
              placeholder="Search for Site ID"
              onFocus={() => setShowDropdown(true)}
            />
            
            {showDropdown && (
              <View style={styles.dropdownContainer}>
                <FlatList
                  data={filteredSites}
                  keyExtractor={(item) => item["Site ID"]}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => handleSiteSelect(item)}
                    >
                      <Text style={styles.dropdownText}>{item["Site ID"]}</Text>
                      <Text style={styles.dropdownSubtext}>
                        {item["Grid"] || 'No Grid'} - {item["Address"] || 'No Address'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.dropdown}
                  nestedScrollEnabled={true}
                />
              </View>
            )}
          </View>

          {renderSiteDetails()}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ticket Type</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  ticketType === 'uplift' && styles.radioButtonSelected
                ]}
                onPress={() => setTicketType('uplift')}
              >
                <Text style={[
                  styles.radioText,
                  ticketType === 'uplift' && styles.radioTextSelected
                ]}>Uplift</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  ticketType === 'dispersion' && styles.radioButtonSelected
                ]}
                onPress={() => setTicketType('dispersion')}
              >
                <Text style={[
                  styles.radioText,
                  ticketType === 'dispersion' && styles.radioTextSelected
                ]}>Dispersion</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={createTicket}
            disabled={loading || !siteId}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Create Ticket</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  dropdownContainer: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdown: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  radioButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  radioTextSelected: {
    color: 'white',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
