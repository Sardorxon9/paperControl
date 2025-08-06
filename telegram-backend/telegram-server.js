const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001; // Different port from your React app
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;


// Middleware
app.use(cors());
app.use(express.json());
console.log("Bot token loaded:", TELEGRAM_BOT_TOKEN);

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
      text: `📍 Ресторан: ${restaurantName} ⬆️`,
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

// New endpoint for low paper notifications
app.post('/send-low-paper-alert', async (req, res) => {
  try {
    const { adminChatIds, client, paperRemaining, notifyWhen } = req.body;

    if (!adminChatIds || !Array.isArray(adminChatIds) || adminChatIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid adminChatIds array'
      });
    }

    if (!client || !client.restaurant && !client.name) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid client data'
      });
    }

    if (paperRemaining === undefined || notifyWhen === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing paperRemaining or notifyWhen values'
      });
    }

    // Prepare the alert message
    const currentDate = new Date().toLocaleString('ru-RU', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const alertMessage = `🚨 <b>ВНИМАНИЕ! Заканчивается бумага</b>

📍 <b>Ресторан:</b> ${client.restaurant || client.name}
📦 <b>Остаток бумаги:</b> ${paperRemaining} кг

🕒 <b>Дата:</b> ${currentDate}

<i>Необходимо пополнить запасы бумаги!</i>`;

    // Send notifications to all admins
    const notificationPromises = adminChatIds.map(async (chatId) => {
      try {
        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
          chat_id: chatId,
          text: alertMessage,
          parse_mode: 'HTML'
        });
console.log(chatId);
        if (response.data.ok) {
          console.log(`✅ Message sent to chat ID: ${chatId}`);
          return { chatId, success: true };
        } else {
          return { chatId, success: false, error: response.data };
        }
      } catch (error) {
         console.error(`❌ Failed to send to chat ID: ${chatId}`, error.response?.data || error.message);
         console.log("Bot token loaded:", TELEGRAM_BOT_TOKEN);

        return { chatId, success: false, error: error.message };
      }
    });

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises);
    results.forEach((result, index) => {
  const chatId = adminChatIds[index];
  if (result.status === 'fulfilled') {
    if (!result.value.success) {
      console.warn(`⚠️ Message to ${chatId} failed:`, result.value.error);
    }
  } else {
    console.error(`❌ Promise for ${chatId} rejected:`, result.reason);
  }
});


    // Count successful notifications
    const successfulNotifications = results.filter(result =>
      result.status === 'fulfilled' && result.value.success
    ).length;

    const response = {
      success: true,
      totalAdmins: adminChatIds.length,
      successfulNotifications,
      results: results.map(result =>
        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
      )
    };

    console.log(`Low paper alert sent: ${successfulNotifications}/${adminChatIds.length} admins notified`);
    res.json(response);

  } catch (error) {
    console.error('Error sending low paper alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send low paper alert',
      details: error.message
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