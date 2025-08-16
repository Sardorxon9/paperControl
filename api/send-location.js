// api/send-location.js
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

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
    res.status(405).json({ 
      success: false, 
      error: `Method ${req.method} Not Allowed` 
    });
    return;
  }

  try {
    console.log('Request body:', req.body);
    console.log('Bot token exists:', !!TELEGRAM_BOT_TOKEN);

    const { chatId, restaurantName, latitude, longitude } = req.body;

    // Validate required fields
    if (!chatId || !restaurantName || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        received: { chatId: !!chatId, restaurantName: !!restaurantName, latitude: !!latitude, longitude: !!longitude }
      });
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided',
        received: { latitude, longitude }
      });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN is not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    console.log('Sending location to Telegram API...');

    // Send location message
    const locationResponse = await axios.post(`${TELEGRAM_API_URL}/sendLocation`, {
      chat_id: chatId,
      latitude: lat,
      longitude: lng
    });

    console.log('Location sent, response:', locationResponse.data);

    // Send restaurant name as a follow-up message
    const textResponse = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text: `🍽 Ресторан: ${restaurantName} ⬆️`,
      parse_mode: 'HTML'
    });

    console.log('Text message sent, response:', textResponse.data);

    if (locationResponse.data.ok && textResponse.data.ok) {
      res.json({ 
        success: true, 
        message: 'Location sent successfully' 
      });
    } else {
      console.error('Telegram API returned error:', {
        location: locationResponse.data,
        text: textResponse.data
      });
      throw new Error('Telegram API returned error response');
    }

  } catch (error) {
    console.error('Error in send-location handler:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Axios error with response
      console.error('Axios error response:', error.response.data);
      res.status(500).json({ 
        success: false, 
        error: 'Telegram API error',
        details: error.response.data?.description || error.response.data || error.message
      });
    } else if (error.request) {
      // Axios error without response (network error)
      console.error('Network error:', error.request);
      res.status(500).json({ 
        success: false, 
        error: 'Network error - could not reach Telegram API',
        details: error.message
      });
    } else {
      // Other errors
      console.error('General error:', error.message);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        details: error.message
      });
    }
  }
}