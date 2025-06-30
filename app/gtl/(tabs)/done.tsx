import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { router } from 'expo-router';

interface FuelRequest {
  Fuel: number;
  created_at: string;
  Grid: string | null;
  Status: string | null;
  "DG Capacity": number | null;
  "Total DGs": number | null;
  "Operational DGs": number | null;
  "Last Fueling Date": string | null;
  "Last Total Fuel": number | null;
  "DG Running Alarm": number | null;
  "Fuel Consumption": number | null;
  "% Consumption": number | null;
  "Ticket Status": string | null;
  "Site ID": string | null;
}

export default function GTLDoneTicketScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<FuelRequest[]>([]);

  // Check if user is GTL or admin
  if (!user || (user.role !== 'gtl' && user.role !== 'admin')) {
    router.replace('/auth/login');
    return null;
  }

  useEffect(() => {
    fetchFuelRequests();
  }, []);

  const fetchFuelRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('Fuel Request')
        .select('*')
        .in('Ticket Status', ['Approved', 'Rejected'])
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Fetched GTL done tickets:', data);
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching fuel requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchQuery
      ? ticket["Site ID"]?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    
    const matchesTab = selectedTab === 'all' 
      ? true 
      : ticket["Ticket Status"]?.toLowerCase() === selectedTab;

    return matchesSearch && matchesTab;
  });

  const renderStatusBadge = (status: string | null) => (
    <View style={[
      styles.statusBadge,
      { backgroundColor: status === 'Approved' ? '#28a745' : '#dc3545' }
    ]}>
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );

  const renderMobileTicket = (ticket: FuelRequest) => (
    <View key={ticket.Fuel} style={styles.mobileCard}>
      <View style={styles.mobileCardHeader}>
        {renderStatusBadge(ticket["Ticket Status"])}
        <Text style={styles.mobileTitle}>Site ID: {ticket["Site ID"]}</Text>
        <Text style={styles.mobileSubtitle}>Grid: {ticket.Grid}</Text>
      </View>
      <View style={styles.mobileCardContent}>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>Fuel Request:</Text>
          <Text style={styles.mobileValue}>{ticket.Fuel} L</Text>
        </View>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>Created At:</Text>
          <Text style={styles.mobileValue}>{new Date(ticket.created_at).toLocaleString()}</Text>
        </View>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>DG Capacity:</Text>
          <Text style={styles.mobileValue}>{ticket["DG Capacity"]} KVA</Text>
        </View>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>Fuel Consumption:</Text>
          <Text style={styles.mobileValue}>{ticket["Fuel Consumption"]} L</Text>
        </View>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>Consumption %:</Text>
          <Text style={styles.mobileValue}>{ticket["% Consumption"]}%</Text>
        </View>
      </View>
    </View>
  );

  const renderDesktopTable = () => (
    <>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 0.5 }]}>Status</Text>
        <Text style={styles.headerCell}>Site ID</Text>
        <Text style={styles.headerCell}>Grid</Text>
        <Text style={styles.headerCell}>Fuel Request</Text>
        <Text style={styles.headerCell}>Created At</Text>
        <Text style={styles.headerCell}>DG Capacity</Text>
        <Text style={styles.headerCell}>Fuel Consumption</Text>
      </View>
      <ScrollView style={styles.tableContent}>
        {filteredTickets.map(ticket => (
          <View key={ticket.Fuel} style={styles.tableRow}>
            <View style={[styles.cell, { flex: 0.5 }]}>
              {renderStatusBadge(ticket["Ticket Status"])}
            </View>
            <Text style={styles.cell} numberOfLines={1}>{ticket["Site ID"]}</Text>
            <Text style={styles.cell} numberOfLines={1}>{ticket.Grid}</Text>
            <Text style={styles.cell}>{ticket.Fuel} L</Text>
            <Text style={styles.cell}>{new Date(ticket.created_at).toLocaleString()}</Text>
            <Text style={styles.cell}>{ticket["DG Capacity"]} KVA</Text>
            <Text style={styles.cell}>{ticket["Fuel Consumption"]} L</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#607D8B" />
      </View>
    );
  }

  const counts = {
    all: tickets.length,
    approved: tickets.filter(t => t["Ticket Status"] === 'Approved').length,
    rejected: tickets.filter(t => t["Ticket Status"] === 'Rejected').length
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GTL Done Tickets</Text>
        <Text style={styles.headerSubtitle}>Completed Fuel Requests</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Site ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
        >
          <View 
            style={[styles.tab, selectedTab === 'all' && styles.activeTab]}
            onTouchEnd={() => setSelectedTab('all')}
          >
            <Text style={styles.tabText}>All ({counts.all})</Text>
          </View>
          <View 
            style={[styles.tab, selectedTab === 'approved' && styles.activeTab]}
            onTouchEnd={() => setSelectedTab('approved')}
          >
            <Text style={styles.tabText}>Approved ({counts.approved})</Text>
          </View>
          <View 
            style={[styles.tab, selectedTab === 'rejected' && styles.activeTab]}
            onTouchEnd={() => setSelectedTab('rejected')}
          >
            <Text style={styles.tabText}>Rejected ({counts.rejected})</Text>
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      {isMobile ? (
        <ScrollView style={styles.mobileContent}>
          {filteredTickets.map(renderMobileTicket)}
        </ScrollView>
      ) : (
        renderDesktopTable()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filters: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
    borderRadius: 4,
  },
  activeTab: {
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    color: '#666',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 12,
  },
  tableContent: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    padding: 12,
  },
  headerCell: {
    flex: 1,
    fontWeight: 'bold',
    color: '#333',
  },
  cell: {
    flex: 1,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  // Mobile styles
  mobileContent: {
    flex: 1,
    padding: 16,
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  mobileCardHeader: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  mobileSubtitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  mobileCardContent: {
    padding: 12,
  },
  mobileRow: {
    marginBottom: 8,
  },
  mobileLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  mobileValue: {
    fontSize: 14,
    color: '#333',
  },
  // Status badge styles
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
}); 