// api/send-low-paper-alert.js
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
    console.log('Low paper alert request body:', req.body);
    console.log('Bot token exists:', !!TELEGRAM_BOT_TOKEN);

    const { adminChatIds, client, paperRemaining, notifyWhen } = req.body;

    // Enhanced validation
    if (!adminChatIds || !Array.isArray(adminChatIds) || adminChatIds.length === 0) {
      console.error('Invalid adminChatIds:', adminChatIds);
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid adminChatIds array',
        received: { adminChatIds, type: typeof adminChatIds, isArray: Array.isArray(adminChatIds) }
      });
    }

    if (!client || (!client.restaurant && !client.name)) {
      console.error('Invalid client data:', client);
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid client data',
        received: { client }
      });
    }

    if (paperRemaining === undefined || paperRemaining === null) {
      console.error('Invalid paperRemaining:', paperRemaining);
      return res.status(400).json({
        success: false,
        error: 'Missing paperRemaining value',
        received: { paperRemaining, notifyWhen }
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

    // Prepare the alert message
    const currentDate = new Date().toLocaleString('ru-RU', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const restaurantName = client.restaurant || client.name;
    const alertMessage = `🚨 <b>ВНИМАНИЕ! Заканчивается бумага</b>

<b>Ресторан:</b> ${restaurantName}
📦 <b>Остаток бумаги:</b> ${paperRemaining} кг

🕐 <b>Дата:</b> ${currentDate}

<i>Необходимо пополнить запасы бумаги!</i>`;

    console.log(`Sending alert to ${adminChatIds.length} admins for restaurant: ${restaurantName}`);

    // Send notifications to all admins using fetch
    const notificationPromises = adminChatIds.map(async (chatId) => {
      try {
        console.log(`Sending message to chat ID: ${chatId}`);
        
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: alertMessage,
            parse_mode: 'HTML'
          })
        });

        const data = await response.json();
        console.log(`Response for chat ID ${chatId}:`, data);

        if (response.ok && data.ok) {
          console.log(`✅ Message sent successfully to chat ID: ${chatId}`);
          return { chatId, success: true };
        } else {
          console.error(`❌ Failed to send to chat ID ${chatId}:`, data);
          return { chatId, success: false, error: data.description || 'Unknown Telegram API error' };
        }
      } catch (error) {
        console.error(`❌ Exception when sending to chat ID: ${chatId}`, error);
        return { chatId, success: false, error: error.message };
      }
    });

    // Wait for all notifications to complete
    console.log('Waiting for all notifications to complete...');
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

    const responseData = {
      success: true,
      message: `Alert sent to ${successfulNotifications} out of ${adminChatIds.length} admins`,
      totalAdmins: adminChatIds.length,
      successfulNotifications,
      results: results.map(result =>
        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
      )
    };

    console.log(`Low paper alert completed: ${successfulNotifications}/${adminChatIds.length} admins notified`);
    res.json(responseData);

  } catch (error) {
    console.error('Error in send-low-paper-alert handler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send low paper alert',
      details: error.message
    });
  }
}