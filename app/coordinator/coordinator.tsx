import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Pressable,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import * as Animatable from 'react-native-animatable';
import { Picker } from '@react-native-picker/picker';
import { AntDesign } from '@expo/vector-icons';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-end',
    margin: 16,
  },
  signOutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownSub: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  key: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  pickerContainer: {
    flex: 1,
    height: 35,
    justifyContent: 'center',
  },
  picker: {
    height: 35,
    marginTop: -8,
    fontSize: 14,
  },
  pickerItem: {
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 20,
    color: '#dc3545',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
  },
  fuelRequestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  initiateButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  initiateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
    marginRight: 4,
  },
  statusArrow: {
    marginLeft: 2,
  },
  statusTouchable: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  modalOptionLast: {
    borderBottomWidth: 0,
  },
});

interface SiteId2 {
  "Site ID": string;
  "Grid": string | null;
  "Address": string | null;
}

interface FuelData {
  siteDetails: {
    siteId: string;
    grid: string | null;
    address: string | null;
    currentStatus: string | null;
    dgCapacity: number | null;
    internalTankCapacity: string | null;
    externalTankCapacity: string | null;
    totalDgs?: number;
    operationalDgs?: number;
    operationalCapacity?: number;
    bmFuelConsumption?: number;
  };
  consumptionData: {
    availableFuel: number;
    totalFuel: number;
    lastRefuelingTime: string | null;
    fuelQuantityFilled: number;
    consumptionPercentage: number;
  };
  calculation: {
    lastFuelingDate: string | null;
    lastTotalFuel: number;
    dgAlarm: number;
    fuelConsumption: number;
    consumptionPercentage: number;
  };
}

export default function CoordinatorScreen() {
  const { user, signOut } = useAuth();
  const [siteId, setSiteId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fuelRequest, setFuelRequest] = useState('');
  const [sites, setSites] = useState<SiteId2[]>([]);
  const [filteredSites, setFilteredSites] = useState<SiteId2[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fuelData, setFuelData] = useState<FuelData | null>(null);
  const [status, setStatus] = useState<string>('standby');
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Add status options array
  const statusOptions = ['standby', 'prime', 'Tprime'];

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
      Alert.alert('Error', 'Failed to fetch site list');
    }
  };

  const fetchSiteData = async (selectedSiteId: string) => {
    try {
      // Helper to convert various date strings to milliseconds since epoch
      const toMs = (raw: any): number | null => {
        if (!raw) return null;
        const str = String(raw).trim();
        // Try native Date.parse first
        const nativeMs = Date.parse(str);
        if (!isNaN(nativeMs)) return nativeMs;

        // Handle formats like "13-Jun-2025" or "3-May-25"
        const match = str.match(/^(\d{1,2})[-\/](\w{3})[-\/](\d{2,4})$/i);
        if (match) {
          const day = parseInt(match[1], 10);
          const monthStr = match[2].toLowerCase();
          const yr = parseInt(match[3], 10);
          const year = yr < 100 ? 2000 + yr : yr; // handle 2-digit year
          const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          const monthIdx = months.indexOf(monthStr);
          if (monthIdx >= 0) {
            return new Date(year, monthIdx, day).getTime();
          }
        }
        return null; // unsupported format
      };

      const { data: siteData, error: siteError } = await supabase
        .from('site_id2')
        .select('*')
        .eq('Site ID', selectedSiteId.trim())
        .single();

      if (siteError) throw siteError;
      if (!siteData) {
        Alert.alert('Error', 'Site not found');
        return;
      }

      const { data: historyData, error: historyError } = await supabase
        .from('fueling_history')
        .select('*')
        .eq('Site ID Name', selectedSiteId)
        .order('Refueling Time', { ascending: false });

      if (historyError) throw historyError;

      const latest = historyData && historyData.length > 0 ? historyData[0] : {
        'Available Fuel in Tank (Ltrs)': 0,
        'Total Fuel': 0,
        'Refueling Time': null,
        'Fuel Quantity Filled': 0,
        'Region': null,
        'Current Site Status': null,
        'DG Capacity (KVA)': null,
        'Internal Tank Capacity (L)': null,
        'External Tank Capacity (L)': null
      };

      const totalFuel = latest['Total'] || 0;
      let refuelDateStr = latest['Date'] || latest['Refueling Time'];
      const lastFuelingRow = historyData.find((row: any) => {
        const qty = parseFloat(row['Fuel Quantity Filled'] || '0');
        return qty > 0;
      });
      if (lastFuelingRow) {
        refuelDateStr = lastFuelingRow['Date'] || lastFuelingRow['Refueling Time'];
      }

      // milliseconds value of last fueling date (null if unavailable)
      const refuelDateMs = toMs(refuelDateStr);

      let daysDiff = 0;
      if (refuelDateMs !== null) {
        const todayMs = Date.now();
        daysDiff = Math.floor((todayMs - refuelDateMs) / (1000 * 60 * 60 * 24));
      }

      // Get current month's date range and format it correctly
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = months[now.getMonth()];
      const currentYear = now.getFullYear().toString().slice(-2);
      
      // Format: "01-MMM-YY" for start and "DD-MMM-YY" for end
      const currentMonthStart = `01-${currentMonth}-${currentYear}`;
      const currentMonthEnd = `${now.getDate().toString().padStart(2, '0')}-${currentMonth}-${currentYear}`;

      // Helper to format date as DD-MMM-YY
      const formatDate = (dateObj: Date) => {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[dateObj.getMonth()];
        const year = String(dateObj.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      };

      const todayObj = new Date();
      const todayStr = formatDate(todayObj);

      let refuelDateFormatted = refuelDateStr;
      if (refuelDateStr && !/\d{2}-[A-Za-z]{3}-\d{2}/.test(refuelDateStr)) {
        const refuelDateObj = new Date(refuelDateStr);
        refuelDateFormatted = formatDate(refuelDateObj);
      }

      // Fetch all DG Running Alarm rows for the site
      const { data: allDgRows } = await supabase
        .from('DG Running Alarm')
        .select('*')
        .eq('Site name', selectedSiteId);

      const refuelMs = toMs(refuelDateFormatted);
      const todayMs = Date.now();

      let dgAlarmSum = 0;
      if (refuelMs !== null) {
        const filteredRows = allDgRows?.filter(row => {
          const rowMs = toMs(row['Date']);
          return rowMs !== null && rowMs >= refuelMs && rowMs <= todayMs;
        }) || [];
        dgAlarmSum = filteredRows.reduce((sum, row) => sum + (Number(row['DG Running Alarm']) || 0), 0);
        
      }

      // Fetch DG stats from "DG BM" table
      const { data: bmRows } = await supabase
        .from('DG BM')
        .select('*')
        .eq('DG CURRENT SITE', selectedSiteId);

      let totalDgs = 0;
      let operationalDgs = 0;
      let operationalCapacity = 0;
      let bmFuelCons = 0;
      let totalFuelConsumption = 0;

      if (bmRows) {
        const dgMap = new Map<string, { operational: boolean; capacity: number; fuelCons: number }>();

        bmRows.forEach((row: any, idx: number) => {
          // derive unique DG identifier
          const keyRaw = (row['DG LABEL'] || row['DG Label'] || row['DG Label No.'] || row['DG NAME'] || row['DG Name'] || row['DG ID'] || row['DG'] || '').toString().trim();
          const dgKey = keyRaw || `row-${idx}`;

          // Flexible search for operational status field
          let statusStr = '';
          const statusKey = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g,'') === 'operationalstatus');
          if (statusKey) statusStr = String(row[statusKey]).trim().toLowerCase();
          else statusStr = (row['OPERATIONAL STATUS'] || row['DG STATUS'] || row['STATUS'] || '').toString().trim().toLowerCase();

          const isOperational = statusStr.includes('oper') && !statusStr.includes('non');

          const capVal = parseFloat(row['DG CAPACITY'] || row['DG Capacity'] || row['Capacity'] || '0');
          const cap = isNaN(capVal) ? 0 : capVal;

          const fc = parseFloat(row['FUEL CONSUMPTION'] || row['FUEL CONSUMPTION '] || row['Fuel Consumption'] || row['FUEL CONSUMPTION(L)'] || '0');
          const fuelCons = isNaN(fc) ? 0 : fc;

          if (!dgMap.has(dgKey)) {
            dgMap.set(dgKey, { operational: isOperational, capacity: cap, fuelCons });
          } else {
            const prev = dgMap.get(dgKey)!;
            prev.operational = prev.operational || isOperational;
            if (cap > prev.capacity) prev.capacity = cap;
            if (fuelCons > prev.fuelCons) prev.fuelCons = fuelCons;
            dgMap.set(dgKey, prev);
          }
        });

        totalDgs = dgMap.size;
        dgMap.forEach((info) => {
          if (info.operational) {
            operationalDgs += 1;
            operationalCapacity += info.capacity;
            totalFuelConsumption += info.fuelCons;
          }
        });
        
        // Set bmFuelCons to the average fuel consumption of operational DGs
        bmFuelCons = operationalDgs > 0 ? totalFuelConsumption / operationalDgs : 0;
      }

      // Calculate fuel consumption for current month
      const fuelConsumption = bmFuelCons * dgAlarmSum;
      
      // Get tank capacity
      const tankCapacity = parseFloat(siteData['Internal Tank Capacity (L)'] || '0') + parseFloat(siteData['External Tank Capacity (L)'] || '0');
      
      // Debug logging
      console.log('Fuel Consumption Calculation:', {
        bmFuelCons,
        dgAlarmSum,
        fuelConsumption,
        totalFuel,
        tankCapacity,
        operationalDgs,
        totalFuelConsumption
      });
      
      // Calculate consumption percentage based on available fuel vs total fuel consumed
      const consumptionPercentage = totalFuel > 0 ? (fuelConsumption / totalFuel) * 100 : 0;

      const newData: FuelData = {
        siteDetails: {
          siteId: selectedSiteId,
          grid: siteData.Grid,
          address: siteData.Address,
          currentStatus: latest['Current Site Status'],
          dgCapacity: latest['DG Capacity (KVA)'],
          internalTankCapacity: latest['Internal Tank Capacity (L)'],
          externalTankCapacity: latest['External Tank Capacity (L)'],
          totalDgs: totalDgs,
          operationalDgs: operationalDgs,
          operationalCapacity: operationalCapacity,
          bmFuelConsumption: bmFuelCons
        },
        consumptionData: {
          availableFuel: totalFuel,
          totalFuel,
          lastRefuelingTime: refuelDateStr,
          fuelQuantityFilled: latest['Fuel Quantity Filled'] || 0,
          consumptionPercentage
        },
        calculation: {
          lastFuelingDate: refuelDateStr,
          lastTotalFuel: totalFuel,
          dgAlarm: dgAlarmSum,
          fuelConsumption,
          consumptionPercentage
        }
      };
      setFuelData(newData);
      setStatus(newData.siteDetails.currentStatus || 'standby');
    } catch (error) {
      console.error('Error fetching site data:', error);
      Alert.alert('Error', 'Failed to fetch site data');
    }
  };

  const handleSiteSelect = (site: SiteId2) => {
    setSiteId(site["Site ID"]);
    setSearchQuery(site["Site ID"]);
    setShowDropdown(false);
    fetchSiteData(site["Site ID"]);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/welcome');
          }
        }
      ]
    );
  };

  const handleFuelRequest = async () => {
    if (!fuelRequest || isNaN(Number(fuelRequest))) {
      Alert.alert('Error', 'Please enter a valid fuel request amount');
      return;
    }

    try {
      const { error } = await supabase
        .from('Fuel Request')
        .insert([{ Fuel: Number(fuelRequest) }]);

      if (error) throw error;

      Alert.alert('Success', 'Fuel request has been recorded');
      setFuelRequest(''); // Clear the input after successful submission
    } catch (error) {
      console.error('Error saving fuel request:', error);
      Alert.alert('Error', 'Failed to save fuel request');
    }
  };

  const handleInitiateTicket = async () => {
    if (!fuelData || !fuelRequest || isNaN(Number(fuelRequest))) {
      Alert.alert('Error', 'Please enter a valid fuel request amount and select a site');
      return;
    }

    try {
      const { error } = await supabase
        .from('Fuel Request')
        .insert([{
          Fuel: Number(fuelRequest),
          Grid: fuelData.siteDetails.grid,
          "Site ID": fuelData.siteDetails.siteId,
          "Status": status,
          "DG Capacity": fuelData.siteDetails.dgCapacity,
          "Total DGs": fuelData.siteDetails.totalDgs,
          "Operational DGs": fuelData.siteDetails.operationalDgs,
          "Last Fueling Date": fuelData.calculation.lastFuelingDate,
          "Last Total Fuel": fuelData.calculation.lastTotalFuel,
          "DG Running Alarm": fuelData.calculation.dgAlarm,
          "Fuel Consumption": fuelData.calculation.fuelConsumption,
          "% Consumption": fuelData.calculation.consumptionPercentage,
          "BM Fuel Consumption": fuelData.siteDetails.bmFuelConsumption,
          "Ticket Status": "Pending"
        }]);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Ticket has been initiated successfully',
        [{ text: 'OK', onPress: () => {
          setFuelRequest('');
          fetchSiteData(fuelData.siteDetails.siteId);
        }}]
      );
    } catch (error) {
      console.error('Error initiating ticket:', error);
      Alert.alert('Error', 'Failed to initiate ticket');
    }
  };

  const handleStatusSelect = (selectedStatus: string) => {
    setStatus(selectedStatus);
    setShowStatusModal(false);
  };

  if (!user || (user.role !== 'coordinator' && user.role !== 'admin')) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>Only Coordinators or Admins can access this screen</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
      
      <View style={styles.header}>
        <Text style={styles.title}>Site Fuel Status</Text>
      </View>

      <ScrollView>
        <View style={styles.content}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Site ID</Text>
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowDropdown(true);
              }}
              placeholder="Search Site ID"
              autoCapitalize="characters"
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
                      <Text style={styles.dropdownSub}>{item.Grid || 'No Grid'} - {item.Address || 'No Address'}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {fuelData && (
            <>
              <Animatable.View animation="fadeIn" style={styles.card}>
                <Text style={styles.sectionTitle}>General Information</Text>
                <View style={styles.row}>
                  <Text style={styles.key}>Site ID:</Text>
                  <Text style={styles.value}>{fuelData.siteDetails.siteId || '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>Grid:</Text>
                  <Text style={styles.value}>{fuelData.siteDetails.grid || '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>Status:</Text>
                  <TouchableOpacity 
                    style={styles.statusTouchable}
                    onPress={() => setShowStatusModal(true)}
                  >
                    <View style={styles.statusContainer}>
                      <Text style={styles.statusValue}>{status}</Text>
                      <AntDesign name="caretdown" size={12} color="#666" style={styles.statusArrow} />
                    </View>
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>DG Capacity:</Text>
                  <Text style={styles.value}>{fuelData.siteDetails.dgCapacity ? `${fuelData.siteDetails.dgCapacity} KVA` : '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>BM Fuel Consumption:</Text>
                  <Text style={styles.value}>{fuelData.siteDetails.bmFuelConsumption ? `${fuelData.siteDetails.bmFuelConsumption.toFixed(2)} L/hr` : '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>Total DGs:</Text>
                  <Text style={styles.value}>{fuelData.siteDetails.totalDgs ?? '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>Operational DGs:</Text>
                  <Text style={styles.value}>{fuelData.siteDetails.operationalDgs ?? '-'}</Text>
                </View>
              </Animatable.View>

              <Animatable.View animation="fadeIn" delay={100} style={styles.card}>
                <Text style={styles.sectionTitle}>Calculations</Text>
                <View style={styles.row}>
                  <Text style={styles.key}>Last Fueling Date:</Text>
                  <Text style={styles.value}>{fuelData.calculation.lastFuelingDate || '-'}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>Last Total Fuel:</Text>
                  <Text style={styles.value}>{fuelData.calculation.lastTotalFuel} L</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>DG Running Alarm till Last Fueling:</Text>
                  <Text style={styles.value}>{fuelData.calculation.dgAlarm.toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>Fuel Consumption:</Text>
                  <Text style={styles.value}>{fuelData.calculation.fuelConsumption.toFixed(2)} L</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.key}>% Consumption:</Text>
                  <Text style={styles.value}>{fuelData.calculation.consumptionPercentage.toFixed(1)}%</Text>
                </View>
              </Animatable.View>

              <Animatable.View animation="fadeIn" delay={200} style={styles.card}>
                <Text style={styles.sectionTitle}>Fuel Requested Quantity</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={fuelRequest}
                    onChangeText={setFuelRequest}
                    placeholder="Enter fuel request amount"
                    keyboardType="numeric"
                  />
                </View>
              </Animatable.View>

              <Animatable.View animation="fadeIn" delay={300}>
                <Pressable 
                  style={styles.initiateButton}
                  onPress={handleInitiateTicket}
                >
                  <Text style={styles.initiateButtonText}>Initiate Ticket</Text>
                </Pressable>
              </Animatable.View>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.modalContent}>
            {statusOptions.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  index === statusOptions.length - 1 && styles.modalOptionLast
                ]}
                onPress={() => handleStatusSelect(option)}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
} 