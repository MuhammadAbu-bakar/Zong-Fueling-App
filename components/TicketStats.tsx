import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import { useThemeColor } from '../hooks/useThemeColor';
import { ThemedText } from './ThemedText';
import { supabase } from '../lib/supabase';

interface TicketStatsProps {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
}

export const TicketStats: React.FC<TicketStatsProps> = ({
  totalTickets,
  openTickets,
  closedTickets,
}) => {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Ticket Statistics</ThemedText>
      <View style={styles.cardContainer}>
        <Card style={[styles.card, { backgroundColor: '#fff' }]}>
          <Card.Content>
            <ThemedText style={styles.number}>4</ThemedText>
            <ThemedText style={styles.label}>Total Tickets</ThemedText>
          </Card.Content>
        </Card>
        <Card style={[styles.card, { backgroundColor: '#fff' }]}>
          <Card.Content>
            <ThemedText style={[styles.number, { color: '#4CAF50' }]}>2</ThemedText>
            <ThemedText style={styles.label}>Open Tickets</ThemedText>
          </Card.Content>
        </Card>
        <Card style={[styles.card, { backgroundColor: '#fff' }]}>
          <Card.Content>
            <ThemedText style={[styles.number, { color: '#F44336' }]}>2</ThemedText>
            <ThemedText style={styles.label}>Closed Tickets</ThemedText>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: 'black',
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    
  },
  card: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 4,
  },
  number: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color:'black'
  },
  label: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    color:'black'
  },
});

export default TicketStats; 