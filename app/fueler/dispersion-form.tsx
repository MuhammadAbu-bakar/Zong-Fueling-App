import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

interface FormData {
  "Site ID": string;
  "Grid": string;
  "DG Capacity": string;
  "User Email": string;
  "Lat/Long": string;
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

interface SiteData {
  "Site ID": string;
  "Grid": string | null;
  "Address": string | null;
}

interface FuelingTeam {
  team_id: string;
  team_name: string;
}

export default function DispersionForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Site selection state
  const [siteOptions, setSiteOptions] = useState<SiteData[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSites, setFilteredSites] = useState<SiteData[]>([]);
  const [pendingSiteIds, setPendingSiteIds] = useState<string[] | null>(null);

  // Fueling team state
  const [fuelingTeams, setFuelingTeams] = useState<FuelingTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [filteredTeams, setFilteredTeams] = useState<FuelingTeam[]>([]);

  const [form, setForm] = useState<FormData>({
    "Site ID": '',
    "Grid": '',
    "DG Capacity": '',
    "User Email": user?.email || '',
    "Lat/Long": '',
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

  // Image states
  const [fsrImage, setFsrImage] = useState<string | null>(null);
  const [fuelPoringImage, setFuelPoringImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Request camera permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      }
    })();
  }, []);

  // Fetch pending ticket site IDs on mount
  useEffect(() => {
    const fetchPendingSiteIds = async () => {
      try {
        const { data, error } = await supabase
          .from('Fuel Request')
          .select('"Site ID"')
          .eq('Ticket Status', 'Pending');
        if (error) throw error;
        setPendingSiteIds((data || []).map(row => row["Site ID"]));
      } catch (err) {
        console.error('Error fetching pending site IDs:', err);
        setPendingSiteIds([]);
      }
    };
    fetchPendingSiteIds();
  }, []);

  // Fetch site options only for pending site IDs
  useEffect(() => {
    const fetchSiteOptions = async () => {
      if (!pendingSiteIds) return; // Wait for pendingSiteIds to load
      if (pendingSiteIds.length === 0) {
        setSiteOptions([]);
        setFilteredSites([]);
        setLoadingSites(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('site_id2')
          .select('"Site ID", Grid, Address')
          .in('Site ID', pendingSiteIds);
        if (error) throw error;
        setSiteOptions(data || []);
        setFilteredSites(data || []);
      } catch (err) {
        console.error('Error fetching site options:', err);
        Alert.alert('Error', 'Failed to load site options');
        setSiteOptions([]);
        setFilteredSites([]);
      } finally {
        setLoadingSites(false);
      }
    };
    fetchSiteOptions();
  }, [pendingSiteIds]);

  // Fetch fueling teams on mount
  useEffect(() => {
    const fetchFuelingTeams = async () => {
      try {
        const { data, error } = await supabase
          .from('fueling_team')
          .select('team_id, team_name')
          .order('team_name');
        
        if (error) throw error;
        
        setFuelingTeams(data || []);
        setFilteredTeams(data || []);
      } catch (err) {
        console.error('Error fetching fueling teams:', err);
        Alert.alert('Error', 'Failed to load fueling teams');
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchFuelingTeams();
  }, []);

  // Filter sites based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = siteOptions.filter(site => 
        site["Site ID"].toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSites(filtered);
    } else {
      setFilteredSites(siteOptions);
    }
  }, [searchQuery, siteOptions]);

  // Filter teams based on search query
  useEffect(() => {
    if (teamSearchQuery.trim()) {
      const filtered = fuelingTeams.filter(team => 
        team.team_name.toLowerCase().includes(teamSearchQuery.toLowerCase())
      );
      setFilteredTeams(filtered);
    } else {
      setFilteredTeams(fuelingTeams);
    }
  }, [teamSearchQuery, fuelingTeams]);

  const handleSiteSelect = async (site: SiteData) => {
    try {
      // First update the basic site info
      setForm(prev => ({
        ...prev,
        "Site ID": site["Site ID"],
        "Grid": site.Grid || '',
        "Address": site.Address || ''
      }));

      // Fetch the latest DG Capacity for this site
      const { data, error } = await supabase
        .from('fueling_history')
        .select('"DG Capacity (KVA)"')
        .eq('"Site ID Name"', site["Site ID"])
        .order('Date', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching DG Capacity:', error);
        Alert.alert('Warning', 'Failed to fetch DG Capacity');
      } else if (data && data.length > 0 && data[0]["DG Capacity (KVA)"]) {
        // Update the form with the DG Capacity
        setForm(prev => ({
          ...prev,
          "DG Capacity": data[0]["DG Capacity (KVA)"].toString()
        }));
      }
    } catch (err) {
      console.error('Error in handleSiteSelect:', err);
      Alert.alert('Error', 'Failed to process site selection');
    } finally {
      setShowSiteDropdown(false);
    }
  };

  const handleTeamSelect = (team: FuelingTeam) => {
    setForm(prev => ({
      ...prev,
      "Fueling Team": team.team_name
    }));
    setShowTeamDropdown(false);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!form["Site ID"] || !form["Fueling Date"] || !form["Before Fuel"]) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Convert numeric fields to numbers
      const formattedData = {
        ...form,
        "Site ID": form["Site ID"],  // Keep as string since it's text in the database
        "DG Capacity": form["DG Capacity"] ? parseInt(form["DG Capacity"]) : null,
        "Meter Reading": form["Meter Reading"] ? parseInt(form["Meter Reading"]) : null,
        "Last Total Fuel": form["Last Total Fuel"] ? parseInt(form["Last Total Fuel"]) : null,
        "Before Fuel": form["Before Fuel"] ? parseInt(form["Before Fuel"]) : null,
        "Fuel Filled": form["Fuel Filled"] ? parseInt(form["Fuel Filled"]) : null,
      };

      // Insert dispersion data
      const { error: dispersionError } = await supabase
        .from('Dispersion')
        .insert(formattedData);

      if (dispersionError) throw dispersionError;

      // Update Ticket Status to "Closed" in Fuel Request table
      const { error: ticketError } = await supabase
        .from('Fuel Request')
        .update({ "Ticket Status": "Closed" })
        .eq('"Site ID"', form["Site ID"]);

      if (ticketError) {
        console.error('Error updating ticket status:', ticketError);
        // Don't throw error here as dispersion data was saved successfully
        // Just log the error for debugging
      }

      Alert.alert('Success', 'Dispersion data saved successfully and ticket status updated', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving dispersion data:', error);
      Alert.alert('Error', 'Failed to save dispersion data');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selected: Date | undefined) => {
    setShowDatePicker(false);
    if (selected) {
      setSelectedDate(selected);
      setForm({
        ...form,
        "Fueling Date": selected.toISOString().split('T')[0],
      });
    }
  };

  const takePhoto = async (type: 'FSR' | 'FuelPoring') => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploadingImage(true);
        
        // Generate unique filename
        const filename = `${type}_${Date.now()}.jpg`;
        const filePath = `${user?.email}/${filename}`;

        // Convert base64 to Uint8Array
        const base64Data = result.assets[0].base64;
        const byteString = atob(base64Data);
        const byteArray = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          byteArray[i] = byteString.charCodeAt(i);
        }

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dispersion-images')
          .upload(filePath, byteArray, {
            contentType: 'image/jpeg'
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('dispersion-images')
          .getPublicUrl(filePath);

        // Update form state with image URL
        if (type === 'FSR') {
          setFsrImage(publicUrl);
          setForm(prev => ({ ...prev, "FSR Image": publicUrl }));
        } else {
          setFuelPoringImage(publicUrl);
          setForm(prev => ({ ...prev, "Fuel Poring Image": publicUrl }));
        }
      }
    } catch (error) {
      console.error('Error taking/uploading photo:', error);
      Alert.alert('Error', 'Failed to take or upload photo');
    } finally {
      setUploadingImage(false);
    }
  };

  const renderImageField = (type: 'FSR' | 'FuelPoring') => {
    const imageUrl = type === 'FSR' ? fsrImage : fuelPoringImage;
    const label = type === 'FSR' ? 'FSR Image' : 'Fuel Poring Image';

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: imageUrl }} 
                style={styles.imagePreview} 
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => takePhoto(type)}
              >
                <Text style={styles.buttonText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => takePhoto(type)}
              disabled={uploadingImage}
            >
              <Text style={styles.buttonText}>
                {uploadingImage ? 'Uploading...' : 'Take Photo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderField = (label: keyof FormData, placeholder: string, keyboardType: 'default' | 'numeric' = 'default', options?: string[]) => {
    // Special handling for Site ID field
    if (label === "Site ID") {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{label} *</Text>
          <TouchableOpacity
            style={styles.siteInputButton}
            onPress={() => setShowSiteDropdown(true)}
          >
            <Text style={styles.siteInputText}>
              {form["Site ID"] || "Select Site ID"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Special handling for Fueling Team field
    if (label === "Fueling Team") {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{label}</Text>
          <TouchableOpacity
            style={styles.siteInputButton}
            onPress={() => setShowTeamDropdown(true)}
          >
            <Text style={styles.siteInputText}>
              {form["Fueling Team"] || "Select Fueling Team"}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Special handling for DG Capacity field to make it read-only
    if (label === "DG Capacity") {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: '#f5f5f5' }]}
            value={form[label]?.toString() || ''}
            placeholder={placeholder}
            editable={false}
          />
        </View>
      );
    }

    // Special handling for image fields
    if (label === "FSR Image") {
      return renderImageField('FSR');
    }
    if (label === "Fuel Poring Image") {
      return renderImageField('FuelPoring');
    }

    if (options) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form[label]}
              onValueChange={(value) => setForm({ ...form, [label]: value })}
              style={styles.picker}
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
          value={form[label]?.toString() || ''}
          onChangeText={(value) => setForm({ ...form, [label]: value })}
          placeholder={placeholder}
          keyboardType={keyboardType}
          editable={!['Grid', 'Address'].includes(label)}
        />
      </View>
    );
  };

  if (!user || (user.role !== 'fueler' && user.role !== 'admin')) {
    router.replace('/auth/login');
    return null;
  }

  if (loadingSites || loadingTeams) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8DC63F" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Dispersion Form</Text>

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
                    onPress={() => handleSiteSelect(site)}
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

        {/* Fueling Team Selection Modal */}
        <Modal
          visible={showTeamDropdown}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTeamDropdown(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Fueling Team</Text>
              <TextInput
                style={styles.searchInput}
                value={teamSearchQuery}
                onChangeText={setTeamSearchQuery}
                placeholder="Search Fueling Team..."
                autoFocus
              />
              <ScrollView style={styles.siteList}>
                {filteredTeams.map((team) => (
                  <TouchableOpacity
                    key={team.team_id}
                    style={styles.siteItem}
                    onPress={() => handleTeamSelect(team)}
                  >
                    <Text style={styles.siteItemText}>{team.team_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowTeamDropdown(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Site Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Site Information</Text>
          {renderField("Site ID", "Select Site ID")}
          {renderField("Grid", "Grid")}
          {renderField("DG Capacity", "Enter DG Capacity", "numeric")}
          {renderField("Address", "Address")}
        </View>

        {/* Fueling Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fueling Details</Text>
          {renderField("Fueling Team", "Select fueling team")}
          {renderField("Fueler Name", "Enter fueler name")}
          
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Fueling Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{form["Fueling Date"]}</Text>
            </TouchableOpacity>
          </View>
          
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}
          
          {renderField("Meter Reading", "Enter meter reading", "numeric")}
          {renderField("Last Total Fuel", "Last total fuel", "numeric")}
          {renderField("Before Fuel", "Before fuel", "numeric")}
          {renderField("Fuel Filled", "Fuel filled", "numeric")}
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          {renderField("Fuel theft", "Select", undefined, ["No", "Yes"])}
          {form["Fuel theft"] === "Yes" && renderField("Theft Qty", "Enter theft quantity", "numeric")}
          {renderField("Fuel Loss", "Select", undefined, ["No", "Yes"])}
          {form["Fuel Loss"] === "Yes" && renderField("Loss Qty", "Enter loss quantity", "numeric")}
          {renderField("Site Status", "Select", undefined, ["Active", "Inactive"])}
          {renderField("Fueling Method", "Select", undefined, ["Fueling Cans", "Fueling Pipes"])}
          
          {renderField("Remarks", "Enter remarks")}
        </View>

        {/* Images Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Images</Text>
          {renderField("FSR Image", "")}
          {renderField("Fuel Poring Image", "")}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : 'Submit'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
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
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  // Site selection modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  siteList: {
    maxHeight: 300,
  },
  siteItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  siteItemText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#8DC63F',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  siteInputButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  siteInputText: {
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  imageContainer: {
    marginTop: 8,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  cameraButton: {
    backgroundColor: '#8DC63F',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '50%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 