const { collection, getDocs, query, where } = require("firebase/firestore");
const axios = require('axios');

// You'll need to import your Firebase config here
// const { db } = require("./firebase"); // Adjust path as needed

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Checks if paper remaining is low and sends notifications to admin users
 * @param {Object} client - The client object with updated data
 * @param {number} paperRemaining - The current paper remaining amount
 * @param {number} notifyWhen - The threshold for notifications
 * @param {Object} db - Firestore database instance
 */
const checkAndNotifyLowPaper = async (client, paperRemaining, notifyWhen, db) => {
  try {
    // Check if notification should be triggered
    if (paperRemaining > notifyWhen) {
      console.log(`Paper remaining (${paperRemaining}) is above threshold (${notifyWhen}). No notification needed.`);
      return { success: true, notificationSent: false };
    }

    console.log(`Low paper alert triggered for client: ${client.restaurant || client.name}`);
    
    // Fetch all admin users
    const usersRef = collection(db, "users");
    const adminQuery = query(usersRef, where("role", "==", "admin"));
    const adminSnapshot = await getDocs(adminQuery);
    
    if (adminSnapshot.empty) {
      console.log("No admin users found");
      return { success: false, error: "No admin users found" };
    }

    // Extract admin chat IDs
    const adminChatIds = [];
    adminSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.chatId) {
        adminChatIds.push(userData.chatId);
      }
    });

    if (adminChatIds.length === 0) {
      console.log("No admin users have Telegram chat IDs");
      return { success: false, error: "No admin users with Telegram chat IDs found" };
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

    const alertMessage = `🚨 <b>ВНИМАНИЕ! Заканчивается бумага(test)</b>

📍 <b>Ресторан:</b> ${client.restaurant || client.name}
📦 <b>Остаток бумаги:</b> ${paperRemaining} кг
⚠️ <b>Критический уровень:</b> ${notifyWhen} кг

🕒 <b>Дата уведомления:</b> ${currentDate}

<i>Необходимо пополнить запасы бумаги!</i>`;

    // Send notifications to all admins
    const notificationPromises = adminChatIds.map(async (chatId) => {
      try {
        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
          chat_id: chatId,
          text: alertMessage,
          parse_mode: 'HTML'
        });
        
        if (response.data.ok) {
          console.log(`Notification sent successfully to admin chat ID: ${chatId}`);
          return { chatId, success: true };
        } else {
          console.error(`Failed to send notification to chat ID: ${chatId}`, response.data);
          return { chatId, success: false, error: response.data };
        }
      } catch (error) {
        console.error(`Error sending notification to chat ID: ${chatId}`, error.message);
        return { chatId, success: false, error: error.message };
      }
    });

    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises);
    
    // Count successful notifications
    const successfulNotifications = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    results.forEach((result, i) => {
  const chatId = adminChatIds[i];
  if (result.status === 'fulfilled') {
    if (!result.value.success) {
      console.warn(`⚠️ Message to ${chatId} failed:`, result.value.error);
    }
  } else {
    console.error(`❌ Promise to ${chatId} rejected:`, result.reason);
  }
});

    console.log(`Low paper notifications sent: ${successfulNotifications}/${adminChatIds.length} admins notified`);

    return {
      success: true,
      notificationSent: true,
      totalAdmins: adminChatIds.length,
      successfulNotifications,
      results: results.map(result => result.status === 'fulfilled' ? result.value : { success: false, error: result.reason })
    };

  } catch (error) {
    console.error("Error in checkAndNotifyLowPaper:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  checkAndNotifyLowPaper
};