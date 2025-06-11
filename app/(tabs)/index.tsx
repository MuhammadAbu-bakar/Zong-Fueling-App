
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable,
  Alert 
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Ticket } from '../../lib/supabase';
import * as Animatable from 'react-native-animatable';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      let query = supabase.from('tickets').select('*');
      
      if (user?.role === 'fueler') {
        query = query.eq('fueler_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/welcome');
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#28a745';
      case 'rejected': return '#dc3545';
      case 'closed': return '#6c757d';
      default: return '#ffc107';
    }
  };

  const getTicketStats = () => {
    const pending = tickets.filter(t => t.status === 'pending').length;
    const approved = tickets.filter(t => t.status === 'approved').length;
    const rejected = tickets.filter(t => t.status === 'rejected').length;
    const closed = tickets.filter(t => t.status === 'closed').length;
    return { pending, approved, rejected, closed };
  };

  const stats = getTicketStats();

  return (
    <ScrollView style={styles.container}>
      <Animatable.View animation="fadeInDown" style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.email}</Text>
            <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
          </View>
          <Pressable style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={200} style={styles.content}>
        {user?.role === 'fueler' && (
          <>
            <View style={styles.actionSection}>
              <Text style={styles.sectionTitle}>Fuel Operations</Text>
              <View style={styles.actionButtons}>
                <Pressable 
                  style={[styles.actionButton, { backgroundColor: '#007AFF' }]}
                  onPress={() => router.push('/fuel-uplift')}
                >
                  <Text style={styles.actionButtonText}>⛽ Fuel Uplift</Text>
                </Pressable>
                <Pressable 
                  style={[styles.actionButton, { backgroundColor: '#FF6B35' }]}
                  onPress={() => router.push('/fuel-dispersion')}
                >
                  <Text style={styles.actionButtonText}>🚛 Fuel Dispersion</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {user?.role === 'cto' && (
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>CTO Actions</Text>
            <View style={styles.actionButtons}>
              <Pressable 
                style={[styles.actionButton, { backgroundColor: '#28a745' }]}
                onPress={() => router.push('/(tabs)/approvals')}
              >
                <Text style={styles.actionButtonText}>✅ Approvals ({stats.pending})</Text>
              </Pressable>
              <Pressable 
                style={[styles.actionButton, { backgroundColor: '#6c757d' }]}
                onPress={() => router.push('/all-tickets')}
              >
                <Text style={styles.actionButtonText}>📋 View All Tickets</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Ticket Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#fff3cd' }]}>
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#d4edda' }]}>
              <Text style={styles.statNumber}>{stats.approved}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#f8d7da' }]}>
              <Text style={styles.statNumber}>{stats.rejected}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#e2e3e5' }]}>
              <Text style={styles.statNumber}>{stats.closed}</Text>
              <Text style={styles.statLabel}>Closed</Text>
            </View>
          </View>
        </View>

        <View style={styles.recentTickets}>
          <Text style={styles.sectionTitle}>Recent Tickets</Text>
          {tickets.slice(0, 5).map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketSiteId}>Site: {ticket.site_id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
                  <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.ticketType}>{ticket.ticket_type.toUpperCase()}</Text>
              <Text style={styles.ticketDate}>
                {new Date(ticket.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      </Animatable.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6c757d',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 24,
  },
  actionSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    gap: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  recentTickets: {
    gap: 16,
  },
  ticketCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketSiteId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  ticketType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  ticketDate: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
});
