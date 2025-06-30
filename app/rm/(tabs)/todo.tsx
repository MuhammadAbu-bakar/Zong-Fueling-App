import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
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

export default function ToDoTicketScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const windowWidth = Dimensions.get('window').width;
  const isMobile = windowWidth < 768;
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<FuelRequest[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());
  const [selectedTicket, setSelectedTicket] = useState<FuelRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  if (!user || (user.role !== 'rm' && user.role !== 'admin')) {
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
        .eq('Ticket Status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Fetched tickets:', data);
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching fuel requests:', error);
      Alert.alert('Error', 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketAction = async (action: 'Approved' | 'Rejected', ticketId?: number) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('Fuel Request')
        .update({ "Ticket Status": action })
        .in('Fuel', ticketId ? [ticketId] : Array.from(selectedTickets));

      if (error) throw error;

      Alert.alert(
        'Success',
        `Successfully ${action.toLowerCase()} ${ticketId ? 'the' : selectedTickets.size} ticket(s)`,
        [{ text: 'OK', onPress: () => {
          setSelectedTickets(new Set());
          if (ticketId) {
            setShowDetailModal(false);
            setSelectedTicket(null);
          }
          fetchFuelRequests();
        }}]
      );
    } catch (error) {
      console.error('Error updating tickets:', error);
      Alert.alert('Error', 'Failed to update tickets');
    } finally {
      setLoading(false);
    }
  };

  const toggleTicketSelection = (ticketId: number) => {
    const newSelection = new Set(selectedTickets);
    if (newSelection.has(ticketId)) {
      newSelection.delete(ticketId);
    } else {
      newSelection.add(ticketId);
    }
    setSelectedTickets(newSelection);
  };

  const toggleAllTickets = () => {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets.map(t => t.Fuel)));
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery) {
      return ticket["Site ID"]?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleTicketPress = (ticket: FuelRequest) => {
    setSelectedTicket(ticket);
    setShowDetailModal(true);
  };

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ticket Details</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          {selectedTicket && (
            <View style={styles.modalInnerContent}>
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>General Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Site ID:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["Site ID"] || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Grid:</Text>
                    <Text style={styles.detailValue}>{selectedTicket.Grid || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>{selectedTicket.Status || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>DG Capacity:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["DG Capacity"] ? `${selectedTicket["DG Capacity"]} KVA` : '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total DGs:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["Total DGs"] || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Operational DGs:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["Operational DGs"] || '-'}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Calculations</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last Fueling Date:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["Last Fueling Date"] || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last Total Fuel:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["Last Total Fuel"] ? `${selectedTicket["Last Total Fuel"]} L` : '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>DG Running Alarm:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["DG Running Alarm"]?.toFixed(2) || '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fuel Consumption:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["Fuel Consumption"]?.toFixed(2)} L</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>% Consumption:</Text>
                    <Text style={styles.detailValue}>{selectedTicket["% Consumption"]?.toFixed(1)}%</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.approveButton]}
                  onPress={() => handleTicketAction('Approved', selectedTicket.Fuel)}
                >
                  <Text style={styles.modalButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rejectButton]}
                  onPress={() => handleTicketAction('Rejected', selectedTicket.Fuel)}
                >
                  <Text style={styles.modalButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderMobileTicket = (ticket: FuelRequest) => (
    <TouchableOpacity 
      key={ticket.Fuel} 
      style={styles.mobileCard}
      onPress={() => handleTicketPress(ticket)}
    >
      <View style={styles.mobileCardHeader}>
        <TouchableOpacity 
          style={[
            styles.checkbox,
            selectedTickets.has(ticket.Fuel) && styles.checkboxSelected
          ]}
          onPress={(e) => {
            e.stopPropagation();
            toggleTicketSelection(ticket.Fuel);
          }}
        />
        <Text style={styles.mobileTitle} numberOfLines={2}>Site ID: {ticket["Site ID"] || 'N/A'}</Text>
      </View>
      <View style={styles.mobileCardContent}>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>Grid:</Text>
          <Text style={styles.mobileValue}>{ticket.Grid || 'N/A'}</Text>
        </View>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>Fuel Request:</Text>
          <Text style={styles.mobileValue}>{ticket.Fuel} L</Text>
        </View>
        <View style={styles.mobileRow}>
          <Text style={styles.mobileLabel}>Created At:</Text>
          <Text style={styles.mobileValue}>{new Date(ticket.created_at).toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDesktopTable = () => (
    <>
      <View style={styles.tableHeader}>
        <View style={styles.checkboxCell}>
          <TouchableOpacity 
            style={[
              styles.checkbox,
              selectedTickets.size === filteredTickets.length && styles.checkboxSelected
            ]}
            onPress={toggleAllTickets}
          />
        </View>
        <Text style={styles.headerCell}>Site ID</Text>
        <Text style={styles.headerCell}>Grid</Text>
        <Text style={styles.headerCell}>Fuel Request</Text>
        <Text style={styles.headerCell}>Created At</Text>
        <Text style={styles.headerCell}>DG Capacity</Text>
      </View>
      <ScrollView style={styles.tableContent}>
        {filteredTickets.map(ticket => (
          <TouchableOpacity 
            key={ticket.Fuel} 
            style={styles.tableRow}
            onPress={() => handleTicketPress(ticket)}
          >
            <View style={styles.checkboxCell}>
              <TouchableOpacity 
                style={[
                  styles.checkbox,
                  selectedTickets.has(ticket.Fuel) && styles.checkboxSelected
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleTicketSelection(ticket.Fuel);
                }}
              />
            </View>
            <Text style={styles.cell} numberOfLines={1}>{ticket["Site ID"] || 'N/A'}</Text>
            <Text style={styles.cell} numberOfLines={1}>{ticket.Grid || 'N/A'}</Text>
            <Text style={styles.cell}>{ticket.Fuel} L</Text>
            <Text style={styles.cell}>{new Date(ticket.created_at).toLocaleString()}</Text>
            <Text style={styles.cell}>{ticket["DG Capacity"]} KVA</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8DC63F" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>To Do Tickets</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Site ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleTicketAction('Approved')}
              disabled={loading || selectedTickets.size === 0}
            >
              <Text style={styles.actionButtonText}>Approve Selected</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleTicketAction('Rejected')}
              disabled={loading || selectedTickets.size === 0}
            >
              <Text style={styles.actionButtonText}>Reject Selected</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isMobile ? (
          <ScrollView style={styles.content}>
            {filteredTickets.map(renderMobileTicket)}
          </ScrollView>
        ) : (
          renderDesktopTable()
        )}

        {renderDetailModal()}
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    flex: 1,
    fontWeight: '600',
    color: '#495057',
  },
  tableContent: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  cell: {
    flex: 1,
    color: '#212529',
  },
  checkboxCell: {
    width: 40,
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#6c757d',
    borderRadius: 4,
  },
  checkboxSelected: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  mobileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mobileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 12,
    flex: 1,
  },
  mobileCardContent: {
    marginLeft: 32,
  },
  mobileRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  mobileLabel: {
    width: 120,
    color: '#6c757d',
  },
  mobileValue: {
    flex: 1,
    color: '#212529',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    height: '90%',
    maxHeight: '90%',
    position: 'relative',
  },
  modalInnerContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  modalScroll: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6c757d',
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailLabel: {
    width: 140,
    color: '#6c757d',
  },
  detailValue: {
    flex: 1,
    color: '#212529',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 