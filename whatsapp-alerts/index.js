require('dotenv').config(); // Add this at the very top

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());

// Use credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
const PORT = process.env.PORT || 4000;

const client = twilio(accountSid, authToken);

app.post('/send-whatsapp', async (req, res) => {
    console.log(req.body); // For debugging
  
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: 'Missing phone or message' });
      }
  
      const response = await client.messages.create({
        from: fromNumber,
        to: `whatsapp:${phone}`,
        body: message,
      });
  
      res.json({ success: true, sid: response.sid });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get('/send-whatsapp', (req, res) => {
    res.send('WhatsApp API is running. Use POST to send messages.');
  });
  
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));