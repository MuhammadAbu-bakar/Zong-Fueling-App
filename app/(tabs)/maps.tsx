import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { supabase } from '../../lib/supabase';

interface Location {
  NAME: number;
  "Lat/Long": string;
  "OPERATIONAL STATUS": string;
  Subregion: string;
}

export default function MapsScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('Location')
        .select('NAME, "Lat/Long", "OPERATIONAL STATUS", Subregion');

      if (error) throw error;

      if (!data || data.length === 0) {
        console.log('No locations found');
        setError('No locations found in database');
        return;
      }

      
      
      // Filter out invalid coordinates
      const validLocations = data.filter(loc => {
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

      console.log('Valid locations:', validLocations.length);
      setLocations(validLocations);

    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  };

  const parseLatLong = (latLong: string | null): { latitude: number; longitude: number } | null => {
    try {
      if (!latLong || typeof latLong !== 'string') {
        console.log('Invalid latLong input:', latLong);
        return null;
      }

      // Remove any extra whitespace and split by comma
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

      // Basic coordinate validation
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
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 31.5204,  // Lahore latitude
          longitude: 74.3587, // Lahore longitude
          latitudeDelta: 0.5,  // Zoom level (smaller number = more zoomed in)
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
              description={`${location["OPERATIONAL STATUS"]} - ${location.Subregion}`}
              pinColor={location["OPERATIONAL STATUS"] === "Active" ? "#4CAF50" : "#FF5722"}
            />
          );
        })}
      </MapView>
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
}); 