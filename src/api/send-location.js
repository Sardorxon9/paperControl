// api/send-location.js
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { chatId, restaurantName, latitude, longitude } = req.body;

    if (!chatId || !restaurantName || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Telegram bot token not configured'
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
      text: `🍽 Ресторан: ${restaurantName} ⬆️`,
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
}