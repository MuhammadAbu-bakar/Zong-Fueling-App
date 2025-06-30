interface WhatsAppMessage {
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
  phone?: string;
}

export async function sendWhatsAppAlert(data: WhatsAppMessage): Promise<boolean> {
  try {
    if (!data.phone) {
      console.error('No phone number provided for WhatsApp alert');
      return false;
    }

    // Format the message
    const message = `🚨 DEVIATION ALERT 🚨

Site ID: ${data.siteId}
Grid: ${data.grid}
Fueler Name: ${data.fuelerName}
Fueling Date: ${data.fuelingDate}

📊 DEVIATION ANALYSIS:
• Fueler Consumption: ${data.fuelerValue.toFixed(2)} L
• Alarm-based Consumption: ${data.alarmValue.toFixed(2)} L
• Deviation Value: ${data.deviationValue.toFixed(2)}%
• DG Capacity: ${data.dgCapacity} KVA

⚠️ A deviation has been detected that requires your attention.

Please review the fueling data and take necessary action.`;

    // Remove any non-numeric characters from phone number
    const cleanPhone = data.phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming Pakistan +92)
    const phoneWithCountryCode = cleanPhone.startsWith('92') ? cleanPhone : `92${cleanPhone}`;

    // Twilio WhatsApp API integration
    const accountSid = process.env.TWILIO_ACCOUNT_SID || 'your-account-sid';
    const authToken = process.env.TWILIO_AUTH_TOKEN || 'your-auth-token';
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox number

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: `whatsapp:+${phoneWithCountryCode}`,
        Body: message,
      }).toString(),
    });

    const result = await response.json();

    if (response.ok && result.sid) {
      console.log('WhatsApp message sent successfully via Twilio. SID:', result.sid);
      return true;
    } else {
      console.error('Failed to send WhatsApp message via Twilio:', result.error_message || result);
      return false;
    }

  } catch (error) {
    console.error('Failed to send WhatsApp alert:', error);
    return false;
  }
} 