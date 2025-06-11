
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Ticket } from '../lib/supabase';
import * as Animatable from 'react-native-animatable';

export default function AllTicketsScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchAllTickets();
  }, []);

  const fetchAllTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
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
    fetchAllTickets();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'closed': return '#6c757d';
      default: return '#ffc107';
    }
  };

  const filteredTickets = filterStatus === 'all' 
    ? tickets 
    : tickets.filter(ticket => ticket.status === filterStatus);

  const statusOptions = ['all', 'pending', 'approved', 'rejected', 'closed'];

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
        <Text style={styles.title}>All Tickets</Text>
        <Text style={styles.subtitle}>{filteredTickets.length} tickets total</Text>
      </Animatable.View>

      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {statusOptions.map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterButton,
                filterStatus === status && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === status && styles.filterButtonTextActive
              ]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {filteredTickets.length === 0 ? (
          <Animatable.View animation="fadeIn" style={styles.emptyState}>
            <Text style={styles.emptyText}>No tickets found</Text>
            <Text style={styles.emptySubtext}>
              {filterStatus === 'all' 
                ? 'No tickets have been created yet' 
                : `No ${filterStatus} tickets found`}
            </Text>
          </Animatable.View>
        ) : (
          filteredTickets.map((ticket, index) => (
            <Animatable.View 
              key={ticket.id}
              animation="slideInLeft"
              delay={index * 50}
              style={styles.ticketCard}
            >
              <View style={styles.ticketHeader}>
                <View>
                  <Text style={styles.siteId}>Site: {ticket.site_id}</Text>
                  <Text style={styles.ticketType}>{ticket.ticket_type.toUpperCase()}</Text>
                </View>
                <View style={styles.badgeContainer}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: getStatusColor(ticket.status) }
                  ]}>
                    <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
                  </View>
                  <View style={[
                    styles.initiatedBadge, 
                    { backgroundColor: ticket.initiated ? '#28a745' : '#ffc107' }
                  ]}>
                    <Text style={styles.initiatedText}>
                      {ticket.initiated ? 'INITIATED' : 'NOT INITIATED'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.ticketDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fueler ID:</Text>
                  <Text style={styles.detailValue}>{ticket.fueler_id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Consumption:</Text>
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
                {ticket.updated_at !== ticket.created_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Updated:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(ticket.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {ticket.cto_comments && (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>CTO Comments:</Text>
                    <Text style={styles.commentText}>{ticket.cto_comments}</Text>
                  </View>
                )}
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
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterScroll: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
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
    textAlign: 'center',
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
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
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
  initiatedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  initiatedText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '600',
  },
  ticketDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6c757d',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  commentContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
});
