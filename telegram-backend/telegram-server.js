const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001; // Different port from your React app
require('dotenv').config();
// Replace with your actual bot token from BotFather
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint to send location via Telegram
app.post('/send-location', async (req, res) => {
  try {
    const { chatId, restaurantName, latitude, longitude } = req.body;

    if (!chatId || !restaurantName || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Send location message
    const locationResponse = await axios.post(`${TELEGRAM_API_URL}/sendLocation`, {
      chat_id: chatId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    });

    // Send restaurant name as a follow-up message
    const textResponse = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text: `📍 Ресторан: ${restaurantName}`,
      parse_mode: 'HTML'
    });

    if (locationResponse.data.ok && textResponse.data.ok) {
      res.json({ 
        success: true, 
        message: 'Location sent successfully' 
      });
    } else {
      throw new Error('Failed to send message');
    }

  } catch (error) {
    console.error('Error sending location:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send location via Telegram',
      details: error.response?.data?.description || error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Telegram service running on http://localhost:${PORT}`);
});

module.exports = app;