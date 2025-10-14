// api/send-location.js
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req, res) {
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
    const { chatId, userName, firstName, restaurantName, latitude, longitude } = req.body;

    if (!chatId || !restaurantName || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        received: { chatId: !!chatId, restaurantName: !!restaurantName, latitude: !!latitude, longitude: !!longitude }
      });
    }

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
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    const ADMIN_CHAT_ID = 685385466;

    // 1️⃣ Send location to user
    await fetch(`${TELEGRAM_API_URL}/sendLocation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        latitude: lat,
        longitude: lng
      })
    });

    // 2️⃣ Send restaurant name
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `📍 Ресторан: ${restaurantName} ⬆️`,
        parse_mode: 'HTML'
      })
    });

    // 3️⃣ Notify admin — only if user is not admin himself
    if (String(chatId) !== String(ADMIN_CHAT_ID)) {
      const now = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' });
      const notifyText = `📡 <b>Send Location Triggered</b>\n\n👤 Пользователь: <b>${firstName || '—'}</b> ${userName ? `(@${userName})` : ''}\n🆔 <code>${chatId}</code>\n🏠 <b>Ресторан:</b> ${restaurantName}\n🌍 <b>Координаты:</b> ${lat}, ${lng}\n🕒 <i>${now}</i>`;

      await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: notifyText,
          parse_mode: 'HTML'
        })
      });

      await fetch(`${TELEGRAM_API_URL}/sendLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          latitude: lat,
          longitude: lng
        })
      });
    }

    res.json({ success: true, message: 'Location sent successfully (user + admin notified)' });

  } catch (error) {
    console.error('Error in send-location handler:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send location via Telegram',
      details: error.message
    });
  }
}
