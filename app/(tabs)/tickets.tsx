
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Ticket } from '../../lib/supabase';
import * as Animatable from 'react-native-animatable';

export default function TicketsScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserTickets();
  }, []);

  const fetchUserTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('fueler_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserTickets();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'closed': return '#6c757d';
      default: return '#ffc107';
    }
  };

  const handleTicketPress = (ticket: Ticket) => {
    if (ticket.status === 'approved' && !ticket.fueler_input) {
      // Navigate to input form
      router.push(`/fueler-input/${ticket.id}`);
    } else {
      // Show ticket details
      Alert.alert(
        'Ticket Details',
        `Site: ${ticket.site_id}\nType: ${ticket.ticket_type}\nStatus: ${ticket.status}\nConsumption: ${ticket.consumption_percentage?.toFixed(1)}%`,
        [{ text: 'OK' }]
      );
    }
  };

  if (user?.role !== 'fueler') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>Only Fuelers can access this screen</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Animatable.View animation="fadeInDown" style={styles.header}>
        <Text style={styles.title}>My Tickets</Text>
        <Pressable 
          style={styles.createButton}
          onPress={() => router.push('/create-ticket')}
        >
          <Text style={styles.createButtonText}>+ New Ticket</Text>
        </Pressable>
      </Animatable.View>

      <View style={styles.content}>
        {tickets.length === 0 ? (
          <Animatable.View animation="fadeIn" style={styles.emptyState}>
            <Text style={styles.emptyText}>No tickets yet</Text>
            <Text style={styles.emptySubtext}>Create your first ticket to get started</Text>
          </Animatable.View>
        ) : (
          tickets.map((ticket, index) => (
            <Animatable.View 
              key={ticket.id}
              animation="slideInLeft"
              delay={index * 100}
            >
              <Pressable 
                style={styles.ticketCard}
                onPress={() => handleTicketPress(ticket)}
              >
                <View style={styles.ticketHeader}>
                  <View>
                    <Text style={styles.siteId}>Site: {ticket.site_id}</Text>
                    <Text style={styles.ticketType}>{ticket.ticket_type.toUpperCase()}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusColor(ticket.status) }
                  ]}>
                    <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.ticketDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Consumption:</Text>
                    <Text style={styles.detailValue}>
                      {ticket.consumption_percentage?.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Initiated:</Text>
                    <Text style={[
                      styles.detailValue,
                      { color: ticket.initiated ? '#28a745' : '#dc3545' }
                    ]}>
                      {ticket.initiated ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {ticket.status === 'approved' && !ticket.fueler_input && (
                  <View style={styles.actionRequired}>
                    <Text style={styles.actionText}>📝 Input Required</Text>
                  </View>
                )}
              </Pressable>
            </Animatable.View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
  },
  ticketCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  siteId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ticketType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  ticketDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionRequired: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
});
