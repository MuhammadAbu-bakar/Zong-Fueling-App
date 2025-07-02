import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Text, 
  TextInput, 
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

interface Location {
  NAME: number;
  "Lat/Long": string;
  "OPERATIONAL STATUS": string;
  Subregion: string;
  "Load Shedding"?: string;
  "DG Running Alarm"?: number;
}

interface DGAlarmData {
  "Date": string;
  "DG Running Alarm": number | null;
  "Load Shedding": number | null;
  "Battery": string | null;
  "Complete site down": string | null;
  "Total": number | null;
  "Status": string | null;
}

export default function MapsScreen() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSite, setSelectedSite] = useState<Location | null>(null);
  const [dgAlarmData, setDgAlarmData] = useState<DGAlarmData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const mapRef = useRef<MapView>(null);

  if (!user || (user.role !== 'rm' && user.role !== 'admin')) {
    router.replace('/auth/login');
    return null;
  }

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      // First fetch locations
      const { data: locationData, error: locationError } = await supabase
        .from('Location')
        .select('NAME, "Lat/Long", "OPERATIONAL STATUS", Subregion');

      if (locationError) throw locationError;

      if (!locationData || locationData.length === 0) {
        setError('No locations found in database');
        return;
      }

      // Then fetch latest DG Alarm data for all sites
      const { data: alarmData, error: alarmError } = await supabase
        .from('DG Running Alarm')
        .select('*')
        .order('Date', { ascending: false });

      if (alarmError) throw alarmError;

      // Combine location data with latest alarm data
      const enrichedLocations = locationData.map(location => {
        const latestAlarm = alarmData?.find(alarm => alarm['Site name'] === location.NAME);
        return {
          ...location,
          "Load Shedding": latestAlarm?.["Load Shedding"] || "N/A",
          "DG Running Alarm": latestAlarm?.["DG Running Alarm"] || 0
        };
      });

      const validLocations = enrichedLocations.filter(loc => {
        if (!loc["Lat/Long"]) {
          console.log('Location missing coordinates:', loc.NAME);
          return false;
        }
        const coords = parseLatLong(loc["Lat/Long"]);
        if (!coords) {
          console.log('Invalid coordinates for location:', loc.NAME, loc["Lat/Long"]);
          return false;
        }
        return true;
      });

      setLocations(validLocations);

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch location data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDGAlarmData = async (siteId: number) => {
    try {
      // Get previous month's date range
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      };
      const firstDayStr = formatDate(firstDay);
      const lastDayStr = formatDate(lastDay);

      // Fetch all records for the site in the previous month
      const { data, error } = await supabase
        .from('DG Running Alarm')
        .select('*')
        .eq('Site name', siteId)
        .gte('Date', firstDayStr)
        .lte('Date', lastDayStr);

      if (error) {
        console.error('Error fetching DG Alarm data:', error);
        return;
      }

      if (!data || data.length === 0) {
        setDgAlarmData({
          'Date': '',
          'DG Running Alarm': null,
          'Load Shedding': null,
          'Battery': '',
          'Complete site down': '',
          'Total': null,
          'Status': '',
        });
        setShowModal(true);
        return;
      }

      // Calculate averages
      const avgDG = data.reduce((sum, row) => sum + (Number(row['DG Running Alarm']) || 0), 0) / data.length;
      const lsVals = data.map(row => parseFloat(row['Load Shedding'])).filter(v => !isNaN(v));
      const avgLS = lsVals.length > 0 ? lsVals.reduce((a, b) => a + b, 0) / lsVals.length : null;

      setDgAlarmData({
        'Date': '',
        'DG Running Alarm': isNaN(avgDG) ? null : avgDG,
        'Load Shedding': avgLS,
        'Battery': '',
        'Complete site down': '',
        'Total': null,
        'Status': '',
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching DG Alarm data:', error);
    }
  };

  const handleSearch = () => {
    if (!searchQuery) return;

    const siteId = parseInt(searchQuery);
    const site = locations.find(loc => loc.NAME === siteId);
    
    if (site) {
      const coords = parseLatLong(site["Lat/Long"]);
      if (coords && mapRef.current) {
        mapRef.current.animateToRegion({
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
        setSelectedSite(site);
      }
    }
  };

  const parseLatLong = (latLong: string | null): { latitude: number; longitude: number } | null => {
    try {
      if (!latLong || typeof latLong !== 'string') {
        console.log('Invalid latLong input:', latLong);
        return null;
      }

      const parts = latLong.trim().split(',');
      
      if (parts.length !== 2) {
        console.log('Invalid coordinate format:', latLong);
        return null;
      }

      const lat = parseFloat(parts[0].trim());
      const long = parseFloat(parts[1].trim());

      if (isNaN(lat) || isNaN(long)) {
        console.log('Failed to parse coordinates:', { lat, long });
        return null;
      }

      if (lat < -90 || lat > 90 || long < -180 || long > 180) {
        console.log('Coordinates out of valid range:', { lat, long });
        return null;
      }

      return { latitude: lat, longitude: long };
    } catch (e) {
      console.error('Error parsing coordinates:', e);
      return null;
    }
  };

  const renderDGAlarmModal = () => (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Site {selectedSite?.NAME} Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll}>
            {dgAlarmData ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Avg DG Running Alarm (Last Month):</Text>
                  <Text style={styles.detailValue}>{typeof dgAlarmData["DG Running Alarm"] === 'number' && dgAlarmData["DG Running Alarm"] !== null ? dgAlarmData["DG Running Alarm"].toFixed(1) : '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Avg Load Shedding (Last Month):</Text>
                  <Text style={styles.detailValue}>{typeof dgAlarmData["Load Shedding"] === 'number' && dgAlarmData["Load Shedding"] !== null ? dgAlarmData["Load Shedding"].toFixed(1) : '-'}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.noDataText}>No DG Alarm data available</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by Site ID"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 31.5204,
          longitude: 74.3587,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      >
        {locations.map((location, index) => {
          const coords = parseLatLong(location["Lat/Long"]);
          if (!coords) return null;

          return (
            <Marker
              key={`${location.NAME}-${index}`}
              coordinate={coords}
              title={`Site ${location.NAME}`}
              pinColor={location["OPERATIONAL STATUS"] === "Active" ? "#4CAF50" : "#FF5722"}
              onPress={() => {
                setSelectedSite(location);
                fetchDGAlarmData(location.NAME);
              }}
            />
          );
        })}
      </MapView>

      {renderDGAlarmModal()}

      {locations.length === 0 && !loading && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>No locations found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
  },
  overlayText: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  modalScroll: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
}); 