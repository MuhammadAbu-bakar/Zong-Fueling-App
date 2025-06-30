import React from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions } from 'react-native';
import FuelingHistoryGraph from '../../../components/FuelingHistoryGraph';
import WeatherWidget from '../../../components/WeatherWidget';
import GTLFuelSummaryKPI from '../components/FuelSummaryKPI';
import GTLGridwiseSummary from '../components/GridwiseSummary';
import GTLMapsScreen from '../maps';
import { useAuth } from '../../../contexts/AuthContext';
import { router } from 'expo-router';

export default function GTLDashboard() {
  const { user } = useAuth();

  // Check if user is GTL or admin
  if (!user || (user.role !== 'gtl' && user.role !== 'admin')) {
    router.replace('/auth/login');
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GTL Dashboard</Text>
        
      </View>
      
      <View style={styles.content}>
        <View style={[styles.card, styles.weatherCard]}>
          <WeatherWidget />
        </View>

        <View style={styles.kpiSection}>
          <GTLFuelSummaryKPI />
        </View>

        <View style={[styles.card, styles.graphCard]}>
          <Text style={styles.sectionTitle}>Fueling History</Text>
          <FuelingHistoryGraph />
        </View>

        <View style={[styles.card, styles.gridCard]}>
          <GTLGridwiseSummary />
        </View>

        <View style={[styles.card, styles.mapCard]}>
          <Text style={styles.sectionTitle}>Site Locations</Text>
          <View style={styles.mapContainer}>
            <GTLMapsScreen />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherCard: {
    padding: 16,
  },
  kpiSection: {
    marginBottom: 16,
  },
  graphCard: {
    padding: 16,
  },
  gridCard: {
    padding: 16,
  },
  mapCard: {
    padding: 16,
  },
  mapContainer: {
    height: 400,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  }
}); 