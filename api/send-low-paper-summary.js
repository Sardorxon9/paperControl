// api/send-low-paper-summary.js
import { requireUser, getAdminChatIds } from './_auth.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    console.log('Low paper summary request body:', req.body);
    console.log('Bot token exists:', !!TELEGRAM_BOT_TOKEN);

    const { clients } = req.body;
    // Recipients come from Firestore, not the request body
    const adminChatIds = await getAdminChatIds(user.idToken);

    // Enhanced validation
    if (!adminChatIds || !Array.isArray(adminChatIds) || adminChatIds.length === 0) {
      console.error('Invalid adminChatIds:', adminChatIds);
      return res.status(400).json({
        success: false,
        error: 'No admins with a linked Telegram chat'
      });
    }

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      console.error('Invalid clients data:', clients);
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid clients array',
        received: { clients, type: typeof clients, isArray: Array.isArray(clients) }
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

    // Prepare the summary message
    const currentDate = new Date().toLocaleString('ru-RU', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    let summaryMessage = `📋 <b>Сводка по клиентам с малым количеством бумаги</b>\n\n`;
    summaryMessage += `📅 <b>Дата:</b> ${currentDate}\n\n`;

    clients.forEach((client, index) => {
      const name = client.restaurant || client.name || 'Unnamed Client';
      const remaining = typeof client.paperRemaining === 'number' ? client.paperRemaining.toFixed(2) : '0.00';
      summaryMessage += `• ${name}: ${remaining} кг\n`;
    });

    summaryMessage += `\n<i>Всего клиентов: ${clients.length}</i>`;

    console.log(`Sending summary to ${adminChatIds.length} admins for ${clients.length} clients`);

    // Send notifications to all admins using fetch
    const notificationPromises = adminChatIds.map(async (chatId) => {
      try {
        console.log(`Sending summary to chat ID: ${chatId}`);
        
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: summaryMessage,
            parse_mode: 'HTML'
          })
        });

        const data = await response.json();
        console.log(`Response for chat ID ${chatId}:`, data);

        if (response.ok && data.ok) {
          console.log(`✅ Summary sent successfully to chat ID: ${chatId}`);
          return { chatId, success: true };
        } else {
          console.error(`❌ Failed to send summary to chat ID ${chatId}:`, data);
          return { chatId, success: false, error: data.description || 'Unknown Telegram API error' };
        }
      } catch (error) {
        console.error(`❌ Exception when sending summary to chat ID: ${chatId}`, error);
        return { chatId, success: false, error: error.message };
      }
    });

    // Wait for all notifications to complete
    console.log('Waiting for all summary notifications to complete...');
    const results = await Promise.allSettled(notificationPromises);
    
    results.forEach((result, index) => {
      const chatId = adminChatIds[index];
      if (result.status === 'fulfilled') {
        if (!result.value.success) {
          console.warn(`⚠️ Summary to ${chatId} failed:`, result.value.error);
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
      message: `Summary sent to ${successfulNotifications} out of ${adminChatIds.length} admins`,
      totalAdmins: adminChatIds.length,
      successfulNotifications,
      results: results.map(result =>
        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
      )
    };

    console.log(`Low paper summary completed: ${successfulNotifications}/${adminChatIds.length} admins notified`);
    res.json(responseData);

  } catch (error) {
    console.error('Error in send-low-paper-summary handler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send low paper summary',
      details: error.message
    });
  }
}