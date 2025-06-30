import { supabase } from './supabase';
import { SendDirectSms } from 'react-native-send-direct-sms';
import * as SMS from 'expo-sms';

interface SMSMessage {
  siteId: string;
  grid: string;
  deviationValue: number;
  fuelerValue: number;
  alarmValue: number;
  beforeFuel: number;
  lastTotalFuel: number;
  dgCapacity: string;
  fuelingDate: string;
  fuelerName: string;
}

interface ContactInfo {
  id: number;
  role: string;
  phone_number: string;
  name: string;
  email: string;
  contact_id: number;
  is_active: boolean;
  created_at: string;
}

// Fallback contact data if database is not available
const FALLBACK_CONTACTS: ContactInfo[] = [
  // RM (Regional Manager) contacts
  { id: 1, role: 'rm', phone_number: '03324758377', name: 'Test RM', email: 'test@company.com', contact_id: 1, is_active: true, created_at: new Date().toISOString() },
  { id: 2, role: 'rm', phone_number: '03001234567', name: 'RM Contact 2', email: 'rm2@company.com', contact_id: 2, is_active: true, created_at: new Date().toISOString() },
  
  // GTL (Grid Team Lead) contacts
  { id: 3, role: 'gtl', phone_number: '03009876543', name: 'GTL Contact 1', email: 'gtl1@company.com', contact_id: 3, is_active: true, created_at: new Date().toISOString() },
  { id: 4, role: 'gtl', phone_number: '03005556666', name: 'GTL Contact 2', email: 'gtl2@company.com', contact_id: 4, is_active: true, created_at: new Date().toISOString() },
  
  // Security contacts
  { id: 5, role: 'security', phone_number: '03001112222', name: 'Security Contact 1', email: 'security1@company.com', contact_id: 5, is_active: true, created_at: new Date().toISOString() },
  { id: 6, role: 'security', phone_number: '03003334444', name: 'Security Contact 2', email: 'security2@company.com', contact_id: 6, is_active: true, created_at: new Date().toISOString() },
];

// Function to fetch contacts from database with Contact Numbers
async function fetchContactsFromDB(): Promise<ContactInfo[]> {
  try {
    const { data, error } = await supabase
      .from('sms_contacts')
      .select(`
        *,
        "Contact Numbers"!inner("Contact")
      `)
      .eq('is_active', true)
      .in('role', ['rm', 'gtl', 'security']);

    if (error) {
      console.error('Error fetching contacts from database:', error);
      return FALLBACK_CONTACTS;
    }

    return data || FALLBACK_CONTACTS;
  } catch (error) {
    console.error('Failed to fetch contacts from database:', error);
    return FALLBACK_CONTACTS;
  }
}

export async function sendSMSAlert(data: SMSMessage): Promise<boolean> {
  try {
    // Format the SMS message (shorter than WhatsApp due to SMS limitations)
    const message = `🚨 DEVIATION ALERT 🚨
Site: ${data.siteId}
Grid: ${data.grid}
Deviation: ${data.deviationValue.toFixed(1)}%
Fueler: ${data.fuelerName}
Date: ${data.fuelingDate}
Fueler: ${data.fuelerValue.toFixed(1)}L
Alarm: ${data.alarmValue.toFixed(1)}L
DG: ${data.dgCapacity}KVA
Action required.`;

    // Get contacts from database or fallback
    const contacts = await fetchContactsFromDB();
    const phoneNumbers = contacts.map(contact => contact.phone_number);

    if (phoneNumbers.length === 0) {
      console.error('No phone numbers found for SMS alert');
      return false;
    }

    // Check if react-native-mobile-sms is available
    let SMS;
    try {
      SMS = require('react-native-mobile-sms');
    } catch (error) {
      console.error('react-native-mobile-sms not available:', error);
      // Fallback: log the message that would be sent
      console.log('SMS Alert would be sent to:', phoneNumbers);
      console.log('Message:', message);
      return false;
    }

    // Send SMS to all contacts
    const sendPromises = phoneNumbers.map(async (phoneNumber) => {
      try {
        // Clean phone number
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const phoneWithCountryCode = cleanPhone.startsWith('92') ? cleanPhone : `92${cleanPhone}`;

        // Send SMS using react-native-mobile-sms
        const result = await SMS.sendSMS({
          phoneNumber: `+${phoneWithCountryCode}`,
          message: message,
        });

        console.log(`SMS sent successfully to ${phoneNumber}:`, result);
        
        // Log SMS alert to database
        await logSMSAlert({
          phoneNumber,
          message,
          status: 'sent',
          deviationData: data
        });

        return true;
      } catch (error) {
        console.error(`Failed to send SMS to ${phoneNumber}:`, error);
        
        // Log failed SMS to database
        await logSMSAlert({
          phoneNumber,
          message,
          status: 'failed',
          deviationData: data,
          error: error instanceof Error ? error.message : String(error)
        });

        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(result => result).length;
    const totalCount = phoneNumbers.length;

    console.log(`SMS Alert Results: ${successCount}/${totalCount} messages sent successfully`);

    // Return true if at least one SMS was sent successfully
    return successCount > 0;

  } catch (error) {
    console.error('Failed to send SMS alert:', error);
    return false;
  }
}

// Function to log SMS alerts to database
async function logSMSAlert(data: {
  phoneNumber: string;
  message: string;
  status: 'sent' | 'failed';
  deviationData: SMSMessage;
  error?: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('sms_logs')
      .insert({
        phone_number: data.phoneNumber,
        message: data.message,
        status: data.status,
        site_id: data.deviationData.siteId,
        grid: data.deviationData.grid,
        deviation_value: data.deviationData.deviationValue,
        fueler_name: data.deviationData.fuelerName,
        error_message: data.error || null,
        sent_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging SMS alert:', error);
    }
  } catch (error) {
    console.error('Failed to log SMS alert:', error);
  }
}

// Function to get contacts by role
export async function getContactsByRole(role: 'rm' | 'gtl' | 'security'): Promise<ContactInfo[]> {
  const contacts = await fetchContactsFromDB();
  return contacts.filter(contact => contact.role === role);
}

// Function to get all contacts
export async function getAllContacts(): Promise<ContactInfo[]> {
  return await fetchContactsFromDB();
}

// Function to add new contact (for admin use)
export async function addContact(contact: Omit<ContactInfo, 'id' | 'created_at'>): Promise<boolean> {
  try {
    // First insert into Contact Numbers table
    const { data: contactData, error: contactError } = await supabase
      .from('Contact Numbers')
      .insert({
        "Contact": parseInt(contact.phone_number)
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error adding contact number:', contactError);
      return false;
    }

    // Then insert into sms_contacts table
    const { error } = await supabase
      .from('sms_contacts')
      .insert({
        role: contact.role,
        phone_number: contact.phone_number,
        name: contact.name,
        email: contact.email,
        contact_id: contactData.Contact,
        is_active: contact.is_active
      });

    if (error) {
      console.error('Error adding contact:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to add contact:', error);
    return false;
  }
}

// Function to update contact (for admin use)
export async function updateContact(id: number, updates: Partial<ContactInfo>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sms_contacts')
      .update({
        role: updates.role,
        phone_number: updates.phone_number,
        name: updates.name,
        email: updates.email,
        is_active: updates.is_active
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating contact:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to update contact:', error);
    return false;
  }
}

// Function to remove contact (for admin use)
export async function removeContact(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('sms_contacts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error removing contact:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to remove contact:', error);
    return false;
  }
}

// Function to get SMS logs
export async function getSMSLogs(limit: number = 50): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching SMS logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch SMS logs:', error); 
    return [];
  }
}

export async function sendSmsData(mobileNumber: string, bodySMS: string) {
  const isAvailable = await SMS.isAvailableAsync();
  if (isAvailable) {
    const { result } = await SMS.sendSMSAsync([mobileNumber], bodySMS);
    console.log('SMS result:', result);
  } else {
    alert('SMS is not available on this device');
  }
} 