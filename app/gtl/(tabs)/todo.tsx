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

export default function GTLToDoTicketScreen() {
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
  const [approvedFuelQuantity, setApprovedFuelQuantity] = useState('');

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
        .eq('Ticket Status', 'Pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      console.log('Fetched GTL tickets:', data);
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching fuel requests:', error);
      Alert.alert('Error', 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketAction = async (action: 'Approved' | 'Rejected', ticketId?: number, approvedFuel?: string) => {
    try {
      setLoading(true);
      const updateObj: any = { "Ticket Status": action };
      if (action === 'Approved' && approvedFuel) {
        updateObj["Approved Fuel Quantity"] = Number(approvedFuel);
      }
      const { error } = await supabase
        .from('Fuel Request')
        .update(updateObj)
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
      setApprovedFuelQuantity('');
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
            <Text style={styles.modalTitle}>GTL Ticket Details</Text>
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

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Approved Fuel Quantity</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Approved Fuel Quantity (L):</Text>
                    <TextInput
                      style={styles.input}
                      value={approvedFuelQuantity}
                      onChangeText={setApprovedFuelQuantity}
                      placeholder="Enter approved quantity"
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Actions</Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleTicketAction('Approved', selectedTicket.Fuel, approvedFuelQuantity)}
                    >
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleTicketAction('Rejected', selectedTicket.Fuel)}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
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
      <View style={styles.mobileCardActions}>
        <TouchableOpacity
          style={[styles.mobileActionButton, styles.approveButton]}
          onPress={() => handleTicketAction('Approved', ticket.Fuel)}
        >
          <Text style={styles.mobileActionButtonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mobileActionButton, styles.rejectButton]}
          onPress={() => handleTicketAction('Rejected', ticket.Fuel)}
        >
          <Text style={styles.mobileActionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderDesktopTable = () => (
    <>
      <View style={styles.tableHeader}>
        <View style={styles.checkboxHeader}>
          <TouchableOpacity onPress={toggleAllTickets}>
            <Text style={styles.checkboxText}>
              {selectedTickets.size === filteredTickets.length ? '☑' : '☐'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerCell}>Site ID</Text>
        <Text style={styles.headerCell}>Grid</Text>
        <Text style={styles.headerCell}>Fuel Request</Text>
        <Text style={styles.headerCell}>Created At</Text>
        <Text style={styles.headerCell}>DG Capacity</Text>
        <Text style={styles.headerCell}>Actions</Text>
      </View>
      <ScrollView style={styles.tableContent}>
        {filteredTickets.map(ticket => (
          <View key={ticket.Fuel} style={styles.tableRow}>
            <View style={styles.checkboxCell}>
              <TouchableOpacity onPress={() => toggleTicketSelection(ticket.Fuel)}>
                <Text style={styles.checkboxText}>
                  {selectedTickets.has(ticket.Fuel) ? '☑' : '☐'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cell} numberOfLines={1}>{ticket["Site ID"]}</Text>
            <Text style={styles.cell} numberOfLines={1}>{ticket.Grid}</Text>
            <Text style={styles.cell}>{ticket.Fuel} L</Text>
            <Text style={styles.cell}>{new Date(ticket.created_at).toLocaleString()}</Text>
            <Text style={styles.cell}>{ticket["DG Capacity"]} KVA</Text>
            <View style={styles.actionCell}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleTicketAction('Approved', ticket.Fuel)}
              >
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleTicketAction('Rejected', ticket.Fuel)}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GTL To Do Tickets</Text>
        <Text style={styles.headerSubtitle}>Pending Fuel Requests</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Site ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {selectedTickets.size > 0 && (
          <View style={styles.bulkActions}>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.approveButton]}
              onPress={() => handleTicketAction('Approved')}
            >
              <Text style={styles.bulkActionButtonText}>
                Approve All ({selectedTickets.size})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, styles.rejectButton]}
              onPress={() => handleTicketAction('Rejected')}
            >
              <Text style={styles.bulkActionButtonText}>
                Reject All ({selectedTickets.size})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {isMobile ? (
        <ScrollView style={styles.mobileContent}>
          {filteredTickets.map(renderMobileTicket)}
        </ScrollView>
      ) : (
        renderDesktopTable()
      )}

      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  filters: {
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
  bulkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkActionButton: {
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
  bulkActionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  mobileContent: {
    flex: 1,
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
  mobileSubtitle: {
    fontSize: 14,
    color: '#6c757d',
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
  mobileCardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  mobileActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  mobileActionButtonText: {
    color: '#fff',
    fontSize: 16,
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
  checkboxText: {
    fontSize: 20,
    color: '#6c757d',
  },
  checkboxHeader: {
    width: 40,
    justifyContent: 'center',
  },
  actionCell: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6c757d',
  },
  modalInnerContent: {
    padding: 16,
  },
  modalScroll: {
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 120,
    color: '#6c757d',
  },
  detailValue: {
    flex: 1,
    color: '#212529',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
}); 