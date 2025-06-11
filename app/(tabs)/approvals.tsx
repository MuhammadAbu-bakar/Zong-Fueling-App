
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Ticket } from '../../lib/supabase';
import * as Animatable from 'react-native-animatable';

export default function ApprovalsScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingTickets();
  }, []);

  const fetchPendingTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('status', 'pending')
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
    fetchPendingTickets();
  };

  const handleTicketAction = async (ticketId: string, action: 'approved' | 'rejected') => {
    Alert.alert(
      `${action === 'approved' ? 'Approve' : 'Reject'} Ticket`,
      `Are you sure you want to ${action === 'approved' ? 'approve' : 'reject'} this ticket?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approved' ? 'Approve' : 'Reject',
          style: action === 'approved' ? 'default' : 'destructive',
          onPress: () => updateTicketStatus(ticketId, action)
        }
      ]
    );
  };

  const updateTicketStatus = async (ticketId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      // Remove the ticket from the list
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
      
      Alert.alert('Success', `Ticket ${status} successfully`);
    } catch (error) {
      console.error('Error updating ticket:', error);
      Alert.alert('Error', 'Failed to update ticket status');
    }
  };

  const getStatusColor = (initiated: boolean) => {
    return initiated ? '#28a745' : '#ffc107';
  };

  if (user?.role !== 'cto') {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Access Denied</Text>
        <Text style={styles.errorSubtext}>Only CTOs can access this screen</Text>
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
        <Text style={styles.title}>Pending Approvals</Text>
        <Text style={styles.subtitle}>{tickets.length} tickets awaiting review</Text>
      </Animatable.View>

      <View style={styles.content}>
        {tickets.length === 0 ? (
          <Animatable.View animation="fadeIn" style={styles.emptyState}>
            <Text style={styles.emptyText}>No pending tickets</Text>
            <Text style={styles.emptySubtext}>All tickets have been processed</Text>
          </Animatable.View>
        ) : (
          tickets.map((ticket, index) => (
            <Animatable.View 
              key={ticket.id}
              animation="slideInLeft"
              delay={index * 100}
              style={styles.ticketCard}
            >
              <View style={styles.ticketHeader}>
                <View>
                  <Text style={styles.siteId}>Site: {ticket.site_id}</Text>
                  <Text style={styles.ticketType}>{ticket.ticket_type.toUpperCase()}</Text>
                </View>
                <View style={[
                  styles.initiatedBadge, 
                  { backgroundColor: getStatusColor(ticket.initiated) }
                ]}>
                  <Text style={styles.initiatedText}>
                    {ticket.initiated ? 'INITIATED' : 'NOT INITIATED'}
                  </Text>
                </View>
              </View>

              <View style={styles.ticketDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fuel Consumption:</Text>
                  <Text style={styles.detailValue}>
                    {ticket.consumption_percentage?.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {!ticket.initiated && (
                  <Text style={styles.warningText}>
                    ⚠️ Consumption below 85% threshold
                  </Text>
                )}
              </View>

              <View style={styles.actionButtons}>
                <Pressable 
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleTicketAction(ticket.id, 'rejected')}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </Pressable>
                <Pressable 
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleTicketAction(ticket.id, 'approved')}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </Pressable>
              </View>
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
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
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
  initiatedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  initiatedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  ticketDetails: {
    marginBottom: 16,
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
  warningText: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
