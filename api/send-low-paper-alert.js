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
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    const { adminChatIds, client, paperRemaining, notifyWhen } = req.body;

    if (!adminChatIds || !Array.isArray(adminChatIds) || adminChatIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid adminChatIds array'
      });
    }

    if (!client || (!client.restaurant && !client.name)) {
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

    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Telegram bot token not configured'
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

    const alertMessage = `🚨 <b>ВНИМАНИЕ! Заканчивается бумага</b>

🏪 <b>Ресторан:</b> ${client.restaurant || client.name}
📦 <b>Остаток бумаги:</b> ${paperRemaining} кг

🕐 <b>Дата:</b> ${currentDate}

<i>Необходимо пополнить запасы бумаги!</i>`;

    // Send notifications to all admins using fetch
    const notificationPromises = adminChatIds.map(async (chatId) => {
      try {
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

        if (response.ok && data.ok) {
          console.log(`✅ Message sent to chat ID: ${chatId}`);
          return { chatId, success: true };
        } else {
          return { chatId, success: false, error: data.description || 'Unknown error' };
        }
      } catch (error) {
        console.error(`❌ Failed to send to chat ID: ${chatId}`, error.message);
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
}