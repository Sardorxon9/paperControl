// api/send-location.js
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

    // Send location message using fetch
    const locationResponse = await fetch(`${TELEGRAM_API_URL}/sendLocation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        latitude: lat,
        longitude: lng
      })
    });

    const locationData = await locationResponse.json();
    console.log('Location sent, response:', locationData);

    if (!locationResponse.ok || !locationData.ok) {
      throw new Error(`Location send failed: ${locationData.description || 'Unknown error'}`);
    }

    // Send restaurant name as a follow-up message
    const textResponse = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: ` Ресторан: ${restaurantName} ⬆️`,
        parse_mode: 'HTML'
      })
    });

    const textData = await textResponse.json();
    console.log('Text message sent, response:', textData);

    if (!textResponse.ok || !textData.ok) {
      throw new Error(`Text send failed: ${textData.description || 'Unknown error'}`);
    }

    res.json({ 
      success: true, 
      message: 'Location sent successfully' 
    });

  } catch (error) {
    console.error('Error in send-location handler:', error);
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send location via Telegram',
      details: error.message
    });
  }
}