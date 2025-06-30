import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { Card } from 'react-native-paper';
import { ThemedText } from '../../../components/ThemedText';

export default function DeviationSummary() {
  const [deviationTickets, setDeviationTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviationTickets = async () => {
      try {
        const { data, error } = await supabase
          .from('Deviation')
          .select('"Site ID", "Fueler Fuel Consumption", "Alarm based Consumption", "Deviation Value"');
        if (error) throw error;
        // Calculate Fuel for each ticket
        const ticketsWithFuel = (data || []).map(ticket => ({
          ...ticket,
          Fuel: (ticket['Fueler Fuel Consumption'] ?? 0) - (ticket['Alarm based Consumption'] ?? 0)
        }));
        setDeviationTickets(ticketsWithFuel);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDeviationTickets();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deviation Tickets Summary</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : deviationTickets.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No deviation tickets found</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.gridCell, { flex: 0.4, paddingHorizontal: 0 }]}>Site ID</Text>
            <Text style={[styles.headerCell, styles.numberCell, { flex: 1.2, paddingHorizontal: 0 }]}>Previous Fuel Consumption</Text>
            <Text style={[styles.headerCell, styles.numberCell, { flex: 1, paddingHorizontal: 0.5 }]}>Rated Fuel Consumption</Text>
            <Text style={[styles.headerCell, styles.numberCell, { flex: 0.6, paddingHorizontal: 1 }]}>Deviation Value</Text>
          </View>
          <View style={styles.tableContainer}>
            {deviationTickets.map((ticket, index) => (
              <View
                key={ticket['Site ID']}
                style={[
                  styles.row,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow
                ]}
              >
                <Text style={[styles.cell, styles.gridCell, { flex: 0.4, paddingHorizontal: 0 }]} numberOfLines={1} ellipsizeMode="tail">
                  {ticket['Site ID']}
                </Text>
                <Text style={[styles.cell, styles.numberCell, { flex: 1.2, paddingHorizontal: 0 }]} numberOfLines={1}>
                  {ticket['Fueler Fuel Consumption'] ?? '-'}
                </Text>
                <Text style={[styles.cell, styles.numberCell, { flex: 1, paddingHorizontal: 0.5 }]} numberOfLines={1}>
                  {ticket['Alarm based Consumption'] ?? '-'}
                </Text>
                <Text style={[styles.cell, styles.numberCell, { flex: 0.6, paddingHorizontal: 1 }]} numberOfLines={1}>
                  {ticket['Deviation Value'] ?? '-'}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  tableContainer: {},
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
    overflow: 'hidden',
  },
  evenRow: {
    backgroundColor: '#fff',
  },
  oddRow: {
    backgroundColor: '#f9f9f9',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#666',
  },
  cell: {
    color: '#333',
  },
  gridCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  numberCell: {
    flex: 1,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 