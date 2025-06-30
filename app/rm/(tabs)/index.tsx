import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions } from 'react-native';
import FuelingHistoryGraph from '../../../components/FuelingHistoryGraph';
import WeatherWidget from '../../../components/WeatherWidget';
import FuelSummaryKPI from '../../rm/components/FuelSummaryKPI';
import GridwiseSummary from '../../rm/components/GridwiseSummary';
import TicketStats from '../../../components/TicketStats';
import useTicketStats from '../../../hooks/useTicketStats';
import MapsScreen from '../maps';
import { useAuth } from '../../../contexts/AuthContext';
import { router, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { Card } from 'react-native-paper';
import { ThemedText } from '../../../components/ThemedText';

export default function RMDashboard() {
  const { user } = useAuth();
  const { totalTickets, openTickets, closedTickets, loading, error } = useTicketStats();
  const router = useRouter();

  // Deviation summary state
  const [deviationSummary, setDeviationSummary] = useState({
    total: 0,
    open: 0,
    closed: 0,
    loading: true,
    error: null as string | null,
  });

  useEffect(() => {
    const fetchDeviationSummary = async () => {
      try {
        const { data, error } = await supabase
          .from('Deviation')
          .select('"Ticket Status"');
        if (error) throw error;
        const total = data.length;
        const open = data.filter((d: any) => d['Ticket Status'] === 'Open').length;
        const closed = data.filter((d: any) => d['Ticket Status'] === 'Closed').length;
        setDeviationSummary({ total, open, closed, loading: false, error: null });
      } catch (err: any) {
        setDeviationSummary({ total: 0, open: 0, closed: 0, loading: false, error: err.message });
      }
    };
    fetchDeviationSummary();
  }, []);

  if (!user || (user.role !== 'rm' && user.role !== 'admin')) {
    router.replace('/auth/login');
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Regional Manager Dashboard</Text>
      </View>
      
      <View style={styles.content}>
        <View style={[styles.card, styles.weatherCard]}>
          <WeatherWidget />
        </View>

        {/* Deviation Tickets Summary */}
        <View style={[styles.card, { padding: 16 }]}> 
          <ThemedText style={styles.sectionTitle}>Deviation Tickets Summary</ThemedText>
          {deviationSummary.loading ? (
            <Text>Loading...</Text>
          ) : deviationSummary.error ? (
            <Text style={{ color: 'red' }}>{deviationSummary.error}</Text>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Card style={{ flex: 1, marginHorizontal: 4, elevation: 4 }} onPress={() => router.push('/rm/(tabs)/DeviationSummary')}>
                <Card.Content>
                  <ThemedText style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center',color:'red' }}>{deviationSummary.total}</ThemedText>
                  <ThemedText style={{ fontSize: 14, textAlign: 'center', marginTop: 8,color:'black' }}>Total Deviation Tickets</ThemedText>
                </Card.Content>
              </Card>
              <Card style={{ flex: 1, marginHorizontal: 4, elevation: 4,backgroundColor:'white' }}>
                <Card.Content>
                  <ThemedText style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#4CAF50' }}>{deviationSummary.open}</ThemedText>
                  <ThemedText style={{ fontSize: 14, textAlign: 'center', marginTop: 8, color:'black' }}>Open</ThemedText>
                </Card.Content>
              </Card>
              <Card style={{ flex: 1, marginHorizontal: 4, elevation: 4,backgroundColor:'white' }}>
                <Card.Content>
                  <ThemedText style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: 'black' }}>{deviationSummary.closed}</ThemedText>
                  <ThemedText style={{ fontSize: 14, textAlign: 'center', marginTop: 8,color:'black' }}>Closed</ThemedText>
                </Card.Content>
              </Card>
            </View>
          )}
        </View>

        <View style={[styles.card, styles.ticketStatsCard]}>
          <TicketStats
            totalTickets={totalTickets}
            openTickets={openTickets}
            closedTickets={closedTickets}
          />
        </View>

        <View style={styles.kpiSection}>
          <FuelSummaryKPI />
        </View>

        <View style={[styles.card, styles.graphCard]}>
          <Text style={styles.sectionTitle}>Fueling History</Text>
          <FuelingHistoryGraph />
        </View>

        <View style={[styles.card, styles.gridCard]}>
          <GridwiseSummary />
        </View>

        <View style={[styles.card, styles.mapCard]}>
          <Text style={styles.sectionTitle}>Site Locations</Text>
          <View style={styles.mapContainer}>
            <MapsScreen />
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
  ticketStatsCard: {
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