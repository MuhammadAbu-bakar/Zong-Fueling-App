import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Button,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';

interface TicketDetails {
  "Site ID": string;
  "Grid": string;
  "DG Capacity": string;
  "Before Fuel": string;
  "Last Total Fuel": string;
  Date: string;
}

interface DeviationResult {
  fuelerConsumption: number;
  alarmBaseConsumption: number;
  deviation: number;
  hasDeviation: boolean;
}

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [measures, setMeasures] = useState<{ [siteId: string]: string }>({});
  const [submitting, setSubmitting] = useState<{ [siteId: string]: boolean }>({});
  const [supervisorVisited, setSupervisorVisited] = useState<{ [siteId: string]: string }>({});
  const [deviationReason, setDeviationReason] = useState<{ [siteId: string]: string }>({});
  const [theftType, setTheftType] = useState<{ [siteId: string]: string }>({});
  const [recoveredFuel, setRecoveredFuel] = useState<{ [siteId: string]: string }>({});
  const [actionTaken, setActionTaken] = useState<{ [siteId: string]: string }>({});
  const [status, setStatus] = useState<{ [siteId: string]: string }>({});
  const [remarks, setRemarks] = useState<{ [siteId: string]: string }>({});

  if (!user || (user.role !== 'security' && user.role !== 'admin')) {
    router.replace('/auth/login');
    return null;
  }

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data: deviationData, error: deviationError } = await supabase
        .from('Deviation')
        .select('*')
        .order('created_at', { ascending: false });
      if (deviationError) throw deviationError;
      setTickets(deviationData || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchTickets();
  }, []);

  const handleMeasureChange = (siteId: string, value: string) => {
    setMeasures((prev) => ({ ...prev, [siteId]: value }));
  };

  const handleSupervisorVisitedChange = (siteId: string, value: string) => {
    setSupervisorVisited((prev) => ({ ...prev, [siteId]: value }));
  };

  const handleDeviationReasonChange = (siteId: string, value: string) => {
    setDeviationReason((prev) => ({ ...prev, [siteId]: value }));
  };

  const handleTheftTypeChange = (siteId: string, value: string) => {
    setTheftType((prev) => ({ ...prev, [siteId]: value }));
  };

  const handleRecoveredFuelChange = (siteId: string, value: string) => {
    setRecoveredFuel((prev) => ({ ...prev, [siteId]: value }));
  };

  const handleActionTakenChange = (siteId: string, value: string) => {
    setActionTaken((prev) => ({ ...prev, [siteId]: value }));
  };

  const handleStatusChange = (siteId: string, value: string) => {
    setStatus((prev) => ({ ...prev, [siteId]: value }));
  };

  const handleRemarksChange = (siteId: string, value: string) => {
    setRemarks((prev) => ({ ...prev, [siteId]: value }));
  };

  const handleSubmitMeasure = async (ticket: any) => {
    setSubmitting((prev) => ({ ...prev, [ticket["Site ID"]]: true }));
    try {
      const { error } = await supabase.from('Deviation').upsert({
        "Site ID": ticket["Site ID"],
        "Deviation Status": ticket["Deviation Status"],
        "Fueler Fuel Consumption": ticket["Fueler Fuel Consumption"],
        "Alarm based Consumption": ticket["Alarm based Consumption"],
        "Deviation Value": ticket["Deviation Value"],
        "Supervisor Visited": supervisorVisited[ticket["Site ID"]] || '',
        "Deviation Reason": deviationReason[ticket["Site ID"]] || '',
        "Action Taken": actionTaken[ticket["Site ID"]] || '',
        "Status": status[ticket["Site ID"]] || '',
        "Remarks": remarks[ticket["Site ID"]] || '',
        "Theft Type": theftType[ticket["Site ID"]] || '',
        "Recovered Fuel Quantity": recoveredFuel[ticket["Site ID"]] || '',
        "Ticket Status": ticket["Ticket Status"],
      });
      if (error) throw error;
      Alert.alert('Success', 'Deviation details submitted successfully.');
      setSupervisorVisited((prev) => ({ ...prev, [ticket["Site ID"]]: '' }));
      setDeviationReason((prev) => ({ ...prev, [ticket["Site ID"]]: '' }));
      setActionTaken((prev) => ({ ...prev, [ticket["Site ID"]]: '' }));
      setStatus((prev) => ({ ...prev, [ticket["Site ID"]]: '' }));
      setRemarks((prev) => ({ ...prev, [ticket["Site ID"]]: '' }));
      setTheftType((prev) => ({ ...prev, [ticket["Site ID"]]: '' }));
      setRecoveredFuel((prev) => ({ ...prev, [ticket["Site ID"]]: '' }));
      setTickets((prev) => prev.filter(t => t["Site ID"] !== ticket["Site ID"]));
    } catch (err) {
      Alert.alert('Error', 'Failed to submit deviation details.');
    } finally {
      setSubmitting((prev) => ({ ...prev, [ticket["Site ID"]]: false }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8DC63F" />
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
      {tickets.length === 0 && (
        <View style={styles.content}>
          <Text>No deviations found.</Text>
        </View>
      )}
      {tickets.map((ticket, idx) => (
        <View key={idx} style={styles.ticketContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Site ID: {ticket["Site ID"]}</Text>
            <Text>Date: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : ''}</Text>
            <Text>Deviation Status: {ticket["Deviation Status"]}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deviation Analysis</Text>
            <Text>Fueler Fuel Consumption: {ticket["Fueler Fuel Consumption"]}</Text>
            <Text>Alarm based Consumption: {ticket["Alarm based Consumption"]}</Text>
            <Text>Deviation Value: {ticket["Deviation Value"]}%</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Deviation Details</Text>
            <Text>Supervisor Visited Site</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Button
                title="Yes"
                color={supervisorVisited[ticket["Site ID"]] === 'Yes' ? '#8DC63F' : '#ccc'}
                onPress={() => handleSupervisorVisitedChange(ticket["Site ID"], 'Yes')}
              />
              <View style={{ width: 8 }} />
              <Button
                title="No"
                color={supervisorVisited[ticket["Site ID"]] === 'No' ? '#8DC63F' : '#ccc'}
                onPress={() => handleSupervisorVisitedChange(ticket["Site ID"], 'No')}
              />
            </View>
            
            <Text>Theft Type</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Button
                title="Fuel Loss"
                color={theftType[ticket["Site ID"]] === 'Fuel Loss' ? '#8DC63F' : '#ccc'}
                onPress={() => handleTheftTypeChange(ticket["Site ID"], 'Fuel Loss')}
              />
              <View style={{ width: 8 }} />
              <Button
                title="Fuel Theft"
                color={theftType[ticket["Site ID"]] === 'Fuel Theft' ? '#8DC63F' : '#ccc'}
                onPress={() => handleTheftTypeChange(ticket["Site ID"], 'Fuel Theft')}
              />
            </View>
            <Text>Recovered Fuel Quantity</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Button
                title="Yes"
                color={recoveredFuel[ticket["Site ID"]] === 'Yes' ? '#8DC63F' : '#ccc'}
                onPress={() => handleRecoveredFuelChange(ticket["Site ID"], 'Yes')}
              />
              <View style={{ width: 8 }} />
              <Button
                title="No"
                color={recoveredFuel[ticket["Site ID"]] === 'No' ? '#8DC63F' : '#ccc'}
                onPress={() => handleRecoveredFuelChange(ticket["Site ID"], 'No')}
              />
            </View>

            <Text>Deviation Reason</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter deviation reason..."
              value={deviationReason[ticket["Site ID"]] || ''}
              onChangeText={(text) => handleDeviationReasonChange(ticket["Site ID"], text)}
              editable={!submitting[ticket["Site ID"]]}
              multiline
            />
            <Text>Action Taken</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter action taken..."
              value={actionTaken[ticket["Site ID"]] || ''}
              onChangeText={(text) => handleActionTakenChange(ticket["Site ID"], text)}
              editable={!submitting[ticket["Site ID"]]}
              multiline
            />
            <Text>Status</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter status..."
              value={status[ticket["Site ID"]] || ''}
              onChangeText={(text) => handleStatusChange(ticket["Site ID"], text)}
              editable={!submitting[ticket["Site ID"]]}
              multiline
            />
            <Text>Remarks</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter remarks..."
              value={remarks[ticket["Site ID"]] || ''}
              onChangeText={(text) => handleRemarksChange(ticket["Site ID"], text)}
              editable={!submitting[ticket["Site ID"]]}
              multiline
            />
            
            <Button
              title={submitting[ticket["Site ID"]] ? 'Submitting...' : 'Submit'}
              onPress={() => handleSubmitMeasure(ticket)}
              disabled={submitting[ticket["Site ID"]] ||
                !supervisorVisited[ticket["Site ID"]] ||
                !deviationReason[ticket["Site ID"]] ||
                !actionTaken[ticket["Site ID"]] ||
                !status[ticket["Site ID"]] ||
                !remarks[ticket["Site ID"]] ||
                !theftType[ticket["Site ID"]] ||
                !recoveredFuel[ticket["Site ID"]]}
              color="#8DC63F"
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  ticketContainer: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  calculationBox: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  calculationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  formula: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  calculation: {
    fontSize: 16,
    color: '#333',
  },
  deviationResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  deviationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deviationValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
    minHeight: 40,
    fontSize: 16,
  },
}); 