import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { sendWhatsAppAlert } from '../../lib/whatsapp';
import { sendSmsData } from '../../lib/sms';
import * as MailComposer from 'expo-mail-composer';

interface TicketData {
  Fuel: number;
  Grid: string | null;
  "Site ID": string | null;
  "DG Capacity": number | null;
  "Total DGs": number | null;
  "Operational DGs": number | null;
  "Last Fueling Date": string | null;
  "Last Total Fuel": number | null;
  "DG Running Alarm": number | null;
  "Fuel Consumption": number | null;
  "% Consumption": number | null;
  "BM Fuel Consumption": number | null;
  "Ticket Status": string | null;
}

interface DispersionForm {
  "Site ID": string;
  "Grid": string;
  "DG Capacity": string;
  "User Email": string;
  "Fueling Team": string;
  "Fueler Name": string;
  "Fueling Date": string;
  "Meter Reading": string;
  "Last Total Fuel": string;
  "Before Fuel": string;
  "Fuel Filled": string;
  "Fuel theft": string;
  "Theft Qty": string;
  "Fuel Loss": string;
  "Loss Qty": string;
  "Site Status": string;
  "Fueling Method": string;
  "FSR Image": string | null;
  "Fuel Poring Image": string | null;
  "Address": string;
  "Remarks": string;
}

interface DeviationAnalysis {
  fuelerValue: number;
  alarmValue: number;
  deviationValue: number;
  deviationStatus: string;
}

export default function DispersionInputForm() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user || (user.role !== 'fueler' && user.role !== 'admin')) {
    router.replace('/auth/login');
    return null;
  }

  const [loading, setLoading] = useState(false);
  const [latestTicket, setLatestTicket] = useState<TicketData | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [form, setForm] = useState<DispersionForm>({
    "Site ID": '',
    "Grid": '',
    "DG Capacity": '',
    "User Email": user?.email || '',
    "Fueling Team": '',
    "Fueler Name": '',
    "Fueling Date": new Date().toISOString().split('T')[0],
    "Meter Reading": '',
    "Last Total Fuel": '',
    "Before Fuel": '',
    "Fuel Filled": '',
    "Fuel theft": 'No',
    "Theft Qty": '',
    "Fuel Loss": 'No',
    "Loss Qty": '',
    "Site Status": 'Active',
    "Fueling Method": 'Fueling Cans',
    "FSR Image": null,
    "Fuel Poring Image": null,
    "Address": '',
    "Remarks": '',
  });

  // Dropdown options state
  const [siteOptions, setSiteOptions] = useState<{ "Site ID": string }[]>([]);
  const [fuelingTeamOptions, setFuelingTeamOptions] = useState<{ team_id: string, team_name: string }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [filteredSites, setFilteredSites] = useState<{ "Site ID": string }[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [deviationAnalysis, setDeviationAnalysis] = useState<DeviationAnalysis | null>(null);

  // Add after deviationAnalysis state
  const [calcValues, setCalcValues] = useState({
    dgAlarmSum: 0,
    fuelConsumption: 0,
    percentConsumption: 0,
    loading: false,
  });

  const [pendingSiteIds, setPendingSiteIds] = useState<string[]>([]);

  // Add after calcValues state
  const [latestFuelRequest, setLatestFuelRequest] = useState<any>(null);

  // Fetch dropdown options on mount
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        if (pendingSiteIds.length === 0) {
          setSiteOptions([]);
          setFilteredSites([]);
          setLoadingOptions(false);
          return;
        }
        setSiteOptions(pendingSiteIds.map(id => ({ "Site ID": id })));
        setFilteredSites(pendingSiteIds.map(id => ({ "Site ID": id })));
      } catch (err) {
        setSiteOptions([]);
        setFilteredSites([]);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchDropdownOptions();
  }, [pendingSiteIds]);

  // Fetch latest ticket data
  const fetchLatestTicket = async (siteId: string) => {
    try {
      console.log('Fetching ticket for site:', siteId);
      setTicketLoading(true);
      const { data, error } = await supabase
        .from('Fuel Request')
        .select('*')
        .eq('Site ID', siteId)
        .eq('Ticket Status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No pending ticket found for site:', siteId);
          setLatestTicket(null);
          return;
        }
        throw error;
      }

      console.log('Found ticket data:', data);
      setLatestTicket(data);
    } catch (error) {
      console.error('Error fetching latest ticket:', error);
      Alert.alert('Error', 'Failed to fetch latest ticket data');
    } finally {
      setTicketLoading(false);
    }
  };

  // Update useEffect to fetch ticket data when site ID changes
  useEffect(() => {
    if (form["Site ID"]) {
      console.log('Site ID changed to:', form["Site ID"]);
      fetchLatestTicket(form["Site ID"]);
    }
  }, [form["Site ID"]]);

  // Helper to format date as DD-MMM-YY for DB
  const formatDbDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Helper to convert various date strings to milliseconds since epoch (same as coordinator)
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

  // Effect to recalculate when Fueling Date, Before Fuel, or Site ID changes
  useEffect(() => {
    const fetchAndCalc = async () => {
      if (!form["Site ID"] || !form["Fueling Date"] || !form["Before Fuel"] || !latestTicket) {
        setCalcValues(v => ({ ...v, dgAlarmSum: 0, fuelConsumption: 0, percentConsumption: 0 }));
        return;
      }
      setCalcValues(v => ({ ...v, loading: true }));
      try {
        // 1. DG Running Alarm sum - fetch all rows and filter in JavaScript
        const { data: allDgRows, error } = await supabase
          .from('DG Running Alarm')
          .select('"DG Running Alarm", Date')
          .eq('Site name', form["Site ID"]);
        
        console.log('Debug DG Running Alarm query:');
        console.log('Site ID:', form["Site ID"]);
        console.log('Last Fueling Date (original):', latestTicket["Last Fueling Date"]);
        console.log('Input Fueling Date (original):', form["Fueling Date"]);
        console.log('All DG rows fetched:', allDgRows?.length || 0);
        
        let dgAlarmSum = 0;
        if (allDgRows && Array.isArray(allDgRows)) {
          // Convert dates to milliseconds for comparison
          const lastFuelingMs = toMs(latestTicket["Last Fueling Date"]);
          const inputFuelingMs = toMs(form["Fueling Date"]);
          
          console.log('Last Fueling Date (ms):', lastFuelingMs);
          console.log('Input Fueling Date (ms):', inputFuelingMs);
          
          if (lastFuelingMs !== null && inputFuelingMs !== null) {
            const filteredRows = allDgRows.filter(row => {
              const rowMs = toMs(row['Date']);
              return rowMs !== null && rowMs >= lastFuelingMs && rowMs <= inputFuelingMs;
            });
            
            dgAlarmSum = filteredRows.reduce((sum, row) => sum + (Number(row["DG Running Alarm"]) || 0), 0);
            console.log('Filtered rows:', filteredRows.length);
            console.log('DG Alarm sum calculated:', dgAlarmSum);
          }
        }
        
        // 2. Fuel Consumption
        const lastTotalFuel = parseFloat(form["Last Total Fuel"] || '0');
        const beforeFuel = parseFloat(form["Before Fuel"] || '0');
        const fuelConsumption = lastTotalFuel - beforeFuel;
        // 3. % Consumption
        const percentConsumption = lastTotalFuel > 0 ? (fuelConsumption / lastTotalFuel) * 100 : 0;
        setCalcValues({ dgAlarmSum, fuelConsumption, percentConsumption, loading: false });
      } catch (e) {
        console.error('Error in fetchAndCalc:', e);
        setCalcValues(v => ({ ...v, dgAlarmSum: 0, fuelConsumption: 0, percentConsumption: 0, loading: false }));
      }
    };
    fetchAndCalc();
  }, [form["Site ID"], form["Fueling Date"], form["Before Fuel"], form["Last Total Fuel"], latestTicket]);

  // Render ticket details component
  const renderTicketDetails = () => {
    console.log('Rendering ticket details. Latest ticket:', latestTicket);
    
    if (ticketLoading) {
      return (
        <View style={styles.ticketContainer}>
          <ActivityIndicator size="small" color="#8DC63F" />
          <Text style={styles.loadingText}>Loading ticket details...</Text>
        </View>
      );
    }

    if (!latestTicket) {
      return (
        <View style={styles.ticketContainer}>
          <Text style={styles.noDataText}>No pending ticket found for this site.</Text>
        </View>
      );
    }

    return (
      <View style={styles.ticketContainer}>
        <Text style={styles.sectionTitle}>Latest Ticket Details</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>General Information</Text>
          <View style={styles.row}>
            <Text style={styles.key}>Site ID:</Text>
            <Text style={styles.value}>{latestTicket["Site ID"] || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Grid:</Text>
            <Text style={styles.value}>{latestTicket.Grid || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>DG Capacity:</Text>
            <Text style={styles.value}>{latestTicket["DG Capacity"] ? `${latestTicket["DG Capacity"]} KVA` : '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>BM Fuel Consumption:</Text>
            <Text style={styles.value}>{latestTicket["BM Fuel Consumption"] ? `${latestTicket["BM Fuel Consumption"].toFixed(2)} L/hr` : '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Total DGs:</Text>
            <Text style={styles.value}>{latestTicket["Total DGs"] ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Operational DGs:</Text>
            <Text style={styles.value}>{latestTicket["Operational DGs"] ?? '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.key}>Ticket Status:</Text>
            <Text style={styles.value}>{latestTicket["Ticket Status"] || '-'}</Text>
          </View>
        </View>


        {latestFuelRequest && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Calculations</Text>
            <View style={styles.row}><Text style={styles.key}>Last Fueling Date:</Text><Text style={styles.value}>{latestFuelRequest["Last Fueling Date"] || '-'}</Text></View>
            <View style={styles.row}><Text style={styles.key}>Last Total Fuel:</Text><Text style={styles.value}>{latestFuelRequest["Last Total Fuel"] ?? '-'}</Text></View>
            <View style={styles.row}><Text style={styles.key}>DG Running Alarm:</Text><Text style={styles.value}>{latestFuelRequest["DG Running Alarm"] ?? '-'}</Text></View>
            
            <View style={styles.row}><Text style={styles.key}>Fuel Consumption:</Text><Text style={styles.value}>{latestFuelRequest["Fuel Consumption"] ?? '-'}</Text></View>
            <View style={styles.row}><Text style={styles.key}>% Consumption:</Text><Text style={styles.value}>{latestFuelRequest["% Consumption"] ?? '-'}</Text></View>
            
          </View>
        )}
        

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Requested Fuel</Text>
          <View style={styles.row}>
            <Text style={styles.key}>Fuel Amount:</Text>
            <Text style={styles.value}>{latestTicket.Fuel} L</Text>
          </View>
        </View>

        
      </View>
    );
  };

  // Calculate deviation using new formulas
  const calculateDeviation = (): DeviationAnalysis | null => {
    if (!latestTicket || !form["Before Fuel"]) return null;

    const lastTotalFuel = parseFloat(form["Last Total Fuel"]);
    const currentFuel = parseFloat(form["Before Fuel"]);
    const dgRunningAlarm = calcValues.dgAlarmSum;
    const bmFuelConsumption = latestTicket["BM Fuel Consumption"] || 0;

    const fuelerValue = lastTotalFuel - currentFuel;
    const alarmValue = bmFuelConsumption * dgRunningAlarm;
    const rawDeviationValue = fuelerValue !== 0 ? ((alarmValue / fuelerValue) - 1) * 100 : 0;
    // Clamp deviation value between 1 and 100
    const deviationValue = Math.max(1, Math.min(100, Math.abs(rawDeviationValue)));
    const deviationStatus = Math.abs(rawDeviationValue) > 20 ? 'Yes' : 'No';

    return {
      fuelerValue,
      alarmValue,
      deviationValue,
      deviationStatus
    };
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Calculate deviation
      const deviation = calculateDeviation();
      if (!deviation) {
        Alert.alert('Error', 'Unable to calculate deviation. Please check the form values.');
        return;
      }

      setDeviationAnalysis(deviation);
      setShowDeviationModal(true);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert('Error', 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmission = async () => {
    try {
      setLoading(true);
      
      if (!deviationAnalysis) {
        Alert.alert('Error', 'Deviation analysis not available');
        return;
      }

      // Validate required fields and numeric type for Site ID
      if (!form["Site ID"] || isNaN(Number(form["Site ID"]))) {
        Alert.alert('Error', 'Site ID is required and must be a number');
        return;
      }
      if (!form["Grid"]) {
        Alert.alert('Error', 'Grid is required');
        return;
      }

      // Store deviation in database
      const { error: deviationError } = await supabase
        .from('Deviation')
        .insert({
          "Site ID": Number(form["Site ID"]),
          "Deviation Value": Math.round(deviationAnalysis.deviationValue),
          "Deviation Status": deviationAnalysis.deviationStatus,
          "Fueler Fuel Consumption": deviationAnalysis.fuelerValue,
          "Alarm based Consumption": deviationAnalysis.alarmValue
        });

      if (deviationError) throw deviationError;

      // Send WhatsApp alert if deviation is detected
      if (deviationAnalysis.deviationStatus === 'Yes') {
        const phone = '923216889422'; // Example: Pakistan number, no plus sign
        const message = `�� DEVIATION ALERT 🚨\n\nSite ID: ${form["Site ID"]}\nGrid: ${form["Grid"]}\nFueler Name: ${form["Fueler Name"]}\nFueling Date: ${form["Fueling Date"]}\n\n📊 DEVIATION ANALYSIS:\n• Fueler Consumption: ${deviationAnalysis.fuelerValue.toFixed(2)} L\n• Alarm-based Consumption: ${deviationAnalysis.alarmValue.toFixed(2)} L\n• Deviation Value: ${deviationAnalysis.deviationValue.toFixed(2)}%\n• DG Capacity: ${form["DG Capacity"]} KVA\n\n⚠️ A deviation has been detected that requires your attention.\n\nPlease review the fueling data and take necessary action.`;
        // Commented out backend API call for now
        // try {
        //   await fetch('https://backend-api-production-e8c4.up.railway.app/send-whatsapp', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ phone, message })
        //   });
        // } catch (err) {
        //   console.error('Failed to send WhatsApp alert:', err);
        // }
        // Use WhatsApp deeplink for manual sending
        const waUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(waUrl).catch(() => {
          alert('Make sure WhatsApp is installed on your device');
        });
      }

      // Prepare data with correct types for bigint columns
      const formattedData = {
        "Site ID": Number(form["Site ID"]),
        "Grid": form["Grid"],
        "DG Capacity": form["DG Capacity"] ? Number(form["DG Capacity"]) : null,
        "User Email": form["User Email"],
        "Fueling Team": form["Fueling Team"],
        "Fueler Name": form["Fueler Name"],
        "Fueling Date": form["Fueling Date"],
        "Meter Reading": form["Meter Reading"] ? Number(form["Meter Reading"]) : null,
        "Last Total Fuel": form["Last Total Fuel"] ? Number(form["Last Total Fuel"]) : null,
        "Before Fuel": form["Before Fuel"] ? Number(form["Before Fuel"]) : null,
        "Fuel Filled": form["Fuel Filled"] ? Number(form["Fuel Filled"]) : null,
        "Fuel theft": form["Fuel theft"],
        "Theft Qty": form["Theft Qty"],
        "Fuel Loss": form["Fuel Loss"],
        "Loss Qty": form["Loss Qty"],
        "Site Status": form["Site Status"],
        "Fueling Method": form["Fueling Method"],
        "FSR Image": form["FSR Image"],
        "Fuel Poring Image": form["Fuel Poring Image"],
        "Address": form["Address"],
        "Remarks": form["Remarks"],
      };

      const { error } = await supabase
        .from('Dispersion')
        .insert([formattedData]);

      if (error) throw error;

      setShowDeviationModal(false);
      Alert.alert('Success', 'Data saved successfully', [
        { text: 'OK', onPress: () => {
          // Reset form except user email and date
          setForm({
            ...form,
            "Site ID": '',
            "Grid": '',
            "DG Capacity": '',
            "Fueling Team": '',
            "Meter Reading": '',
            "Last Total Fuel": '',
            "Before Fuel": '',
            "Fuel Filled": '',
            "Fuel theft": 'No',
            "Theft Qty": '',
            "Fuel Loss": 'No',
            "Loss Qty": '',
            "FSR Image": null,
            "Fuel Poring Image": null,
            "Address": '',
            "Remarks": '',
          });
        }}
      ]);

    } catch (error) {
      console.error('Error in handleConfirmSubmission:', error);
      Alert.alert('Error', 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  // Helper for rendering text or picker fields
  const renderField = (
    label: keyof DispersionForm,
    placeholder: string,
    keyboardType: 'default' | 'numeric' = 'default',
    options?: string[]
  ) => {
    if (label === "Fueling Method") {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{label} *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form[label]}
              onValueChange={(value) => setForm({ ...form, [label]: value })}
              style={styles.picker}
            >
              <Picker.Item label="Fueling Cans" value="Fueling Cans" />
              <Picker.Item label="Fueling Pipes" value="Fueling Pipes" />
            </Picker>
          </View>
        </View>
      );
    }

    if (options) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form[label]}
              style={styles.picker}
              onValueChange={(value) => setForm({ ...form, [label]: value })}
            >
              {options.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          value={form[label] || ''}
          onChangeText={(value) => setForm({ ...form, [label]: value })}
          placeholder={placeholder}
          keyboardType={keyboardType}
        />
      </View>
    );
  };

  // Function to fetch site details
  const fetchSiteDetails = async (siteId: string) => {
    try {
      console.log('Fetching details for site:', siteId);
      
      // Fetch site details from site_id2 table
      const { data: siteData, error: siteError } = await supabase
        .from('site_id2')
        .select('*')
        .eq('Site ID', siteId)
        .single();

      if (siteError) {
        console.error('Site data error:', siteError);
        throw siteError;
      }

      console.log('Site data received:', siteData);

      // Fetch latest fueling history
      const { data: fuelingData, error: fuelingError } = await supabase
        .from('fueling_history')
        .select('*')
        .eq('Site ID Name', siteId)
        .order('Date', { ascending: false })
        .limit(1)
        .single();

      if (fuelingError && fuelingError.code !== 'PGRST116') {
        console.error('Fueling data error:', fuelingError);
        throw fuelingError;
      }

      console.log('Fueling data received:', fuelingData);

      // Update form with fetched data
      const updatedForm = {
        ...form,
        "Site ID": siteId,
        "Grid": siteData?.Grid || '',
        "Address": siteData?.Address || '',
        "DG Capacity": fuelingData?.["DG Capacity (KVA)"]?.toString() || '',
        "Meter Reading": fuelingData?.["DG Hour Meter Reading"]?.toString() || '',
        "Last Total Fuel": fuelingData?.Total?.toString() || ''
      };

      console.log('Updating form with:', updatedForm);
      setForm(updatedForm);

    } catch (error) {
      console.error('Error in fetchSiteDetails:', error);
      Alert.alert('Error', 'Failed to fetch site details');
    }
  };

  // Update the site selection handler
  const handleSiteSelect = async (siteId: string) => {
    console.log('Site selected:', siteId);
    setShowSiteDropdown(false);
    setSearchQuery('');
    if (siteId !== form["Site ID"]) {
      await fetchSiteDetails(siteId);
    }
  };

  // Function to handle date change
  const onDateChange = (event: any, selected: Date | undefined) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      setSelectedDate(selected);
      setForm(prev => ({
        ...prev,
        "Fueling Date": selected.toISOString().split('T')[0]
      }));
    }
  };

  // Function to format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCloseDeviation = async () => {
    // Compose WhatsApp message and send via backend API
    if (deviationAnalysis && form["Site ID"]) {
      const phone = '923216889422'; // Example: Pakistan number, no plus sign
      const message = `🚨 DEVIATION ALERT 🚨\n\nSite ID: ${form["Site ID"]}\nGrid: ${form["Grid"]}\nFueler Name: ${form["Fueler Name"]}\nFueling Date: ${form["Fueling Date"]}\n\n📊 DEVIATION ANALYSIS:\n• Fueler Consumption: ${deviationAnalysis.fuelerValue.toFixed(2)} L\n• Alarm-based Consumption: ${deviationAnalysis.alarmValue.toFixed(2)} L\n• Deviation Value: ${deviationAnalysis.deviationValue.toFixed(2)}%\n• DG Capacity: ${form["DG Capacity"]} KVA\n\n⚠️ A deviation has been detected that requires your attention.\n\nPlease review the fueling data and take necessary action.`;
      // Commented out backend API call for now
      // try {
      //   await fetch('https://backend-api-production-e8c4.up.railway.app/send-whatsapp', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ phone, message })
      //   });
      // } catch (err) {
      //   console.error('Failed to send WhatsApp alert:', err);
      // }
      // Use WhatsApp deeplink for manual sending
      const waUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
      Linking.openURL(waUrl).catch(() => {
        alert('Make sure WhatsApp is installed on your device');
      });
    }
    try {
      if (!deviationAnalysis || !form["Site ID"]) {
        Alert.alert('Error', 'Deviation analysis data not available');
        return;
      }
      // Validate required fields
      if (!form["Site ID"] || isNaN(Number(form["Site ID"]))) {
        Alert.alert('Error', 'Site ID is required and must be a number');
        return;
      }
      // Store deviation in database using upsert to handle primary key conflicts
      const { error: deviationError } = await supabase
        .from('Deviation')
        .upsert({
          "Site ID": Number(form["Site ID"]),
          "Deviation Value": Math.round(deviationAnalysis.deviationValue),
          "Deviation Status": deviationAnalysis.deviationStatus,
          "Fueler Fuel Consumption": deviationAnalysis.fuelerValue,
          "Alarm based Consumption": deviationAnalysis.alarmValue
        }, {
          onConflict: '"Site ID"'
        });
      if (deviationError) {
        console.error('Error saving deviation:', deviationError);
        Alert.alert('Error', 'Failed to save deviation analysis');
        return;
      }
      // Navigate to dispersion form after successful save
      router.push('/fueler/dispersion-form');
    } catch (error) {
      console.error('Error in handleCloseDeviation:', error);
      Alert.alert('Error', 'Failed to save deviation analysis');
    }
  };

  // Fetch pending Site IDs on mount
  useEffect(() => {
    const fetchPendingSiteIds = async () => {
      const { data, error } = await supabase
        .from('Fuel Request')
        .select('"Site ID"')
        .eq('Ticket Status', 'Pending');
      if (!error && data) {
        setPendingSiteIds(data.map(row => row["Site ID"]));
      }
    };
    fetchPendingSiteIds();
  }, []);

  // Fetch latest Fuel Request for the selected site
  useEffect(() => {
    const fetchLatestFuelRequest = async () => {
      if (!form["Site ID"]) {
        setLatestFuelRequest(null);
        return;
      }
      const { data, error } = await supabase
        .from('Fuel Request')
        .select('*')
        .eq('Site ID', form["Site ID"])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (!error && data) {
        setLatestFuelRequest(data);
      } else {
        setLatestFuelRequest(null);
      }
    };
    fetchLatestFuelRequest();
  }, [form["Site ID"]]);

  if (loading || loadingOptions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8DC63F" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        

        {/* Site ID Selection */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Site ID *</Text>
          <TouchableOpacity
            style={styles.siteInputButton}
            onPress={() => setShowSiteDropdown(true)}
          >
            <Text style={styles.siteInputText}>
              {form["Site ID"] || "Select Site ID"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Site Selection Modal */}
        <Modal
          visible={showSiteDropdown}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSiteDropdown(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Site ID</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search Site ID..."
                autoFocus
              />
              <ScrollView style={styles.siteList}>
                {filteredSites.map((site) => (
                  <TouchableOpacity
                    key={site["Site ID"]}
                    style={styles.siteItem}
                    onPress={() => handleSiteSelect(site["Site ID"])}
                  >
                    <Text style={styles.siteItemText}>{site["Site ID"]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSiteDropdown(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Latest Ticket Details */}
        {form["Site ID"] && renderTicketDetails()}

        {/* Fueling Date Section */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Fueling Date *</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{formatDate(form["Fueling Date"])}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
              style={Platform.OS === 'ios' ? styles.datePickerIOS : undefined}
            />
          )}
        </View>

        {/* Before Fuel Section */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Before Fuel *</Text>
          <TextInput
            style={styles.input}
            value={form["Before Fuel"]}
            onChangeText={(value) => setForm(prev => ({ ...prev, "Before Fuel": value }))}
            placeholder="Enter Before Fuel quantity"
            keyboardType="numeric"
          />
        </View>

        {/* Calculate Deviation Button */}
        {form["Site ID"] && form["Fueling Date"] && form["Before Fuel"] && (
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Calculating...' : 'Calculate Deviation'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Deviation Analysis */}
        {deviationAnalysis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deviation Analysis</Text>
            <View style={styles.deviationContainer}>
              <View style={styles.deviationRow}>
                <Text style={styles.label}>Previous Fuel Consumption:</Text>
                <Text style={styles.value}>{deviationAnalysis.fuelerValue.toFixed(2)} L</Text>
              </View>
              <View style={styles.deviationRow}>
                <Text style={styles.label}>Rated Fuel Consumption:</Text>
                <Text style={styles.value}>{deviationAnalysis.alarmValue.toFixed(2)} L</Text>
              </View>
              <View style={styles.deviationRow}>
                <Text style={styles.label}>Deviation:</Text>
                <Text style={[
                  styles.value,
                  { color: Math.abs(deviationAnalysis.deviationValue) > 20 ? '#FF3B30' : '#34C759' }
                ]}>
                  {Math.abs(deviationAnalysis.deviationValue).toFixed(2)}%
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseDeviation}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#8DC63F',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviationContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  deviationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#8DC63F',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  key: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: 'white',
    marginTop: 5,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  siteInputButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    backgroundColor: 'white',
  },
  siteInputText: {
    fontSize: 16,
    color: '#333',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  siteList: {
    maxHeight: 300,
  },
  siteItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  siteItemText: {
    fontSize: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerIOS: {
    width: '100%',
    height: 200,
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
