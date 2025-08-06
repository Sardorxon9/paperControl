import { collection, getDocs, query, where } from "firebase/firestore";

/**
 * Checks if paper remaining is low and sends notifications to admin users via Telegram
 * @param {Object} client - The client object with updated data
 * @param {number} paperRemaining - The current paper remaining amount
 * @param {number} notifyWhen - The threshold for notifications
 * @param {Object} db - Firestore database instance
 * @returns {Promise<Object>} Result of the notification attempt
 */
export const checkAndNotifyLowPaper = async (client, paperRemaining, notifyWhen, db) => {
  try {
    console.log(`Checking paper levels: remaining=${paperRemaining}, threshold=${notifyWhen}`);
    
    // Check if notification should be triggered
    if (parseFloat(paperRemaining) > parseFloat(notifyWhen)) {
      console.log(`Paper remaining (${paperRemaining}) is above threshold (${notifyWhen}). No notification needed.`);
      return { success: true, notificationSent: false };
    }

    console.log(`Low paper alert triggered for client: ${client.restaurant || client.name}`);
    
    // Fetch all admin users from Firestore
    const usersRef = collection(db, "users");
    const adminQuery = query(usersRef, where("role", "==", "admin"));
    const adminSnapshot = await getDocs(adminQuery);
    
    if (adminSnapshot.empty) {
      console.log("No admin users found");
      return { success: false, error: "Не найдено администраторов в системе" };
    }

    // Extract admin chat IDs
    const adminChatIds = [];
    adminSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.chatId) {
        adminChatIds.push(userData.chatId);
        console.log(`Found admin with chat ID: ${userData.chatId}`);
      }
    });

    if (adminChatIds.length === 0) {
      console.log("No admin users have Telegram chat IDs");
      return { 
        success: false, 
        error: "У администраторов отсутствуют Telegram chat ID" 
      };
    }

    // Check if server is reachable
    const serverUrl = 'http://localhost:3001';
    
    // First test server health
    try {
      const healthResponse = await fetch(`${serverUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
    } catch (healthError) {
      console.error('Telegram server health check failed:', healthError);
      return {
        success: false,
        error: "Telegram сервер недоступен. Проверьте, что он запущен на порту 3001."
      };
    }

    // Send notification request to Telegram server
    console.log('Sending request to telegram server...');
    
    const response = await fetch(`${serverUrl}/send-low-paper-alert`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        adminChatIds,
        client: {
          restaurant: client.restaurant,
          name: client.name
        },
        paperRemaining: parseFloat(paperRemaining),
        notifyWhen: parseFloat(notifyWhen)
      })
    });

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP Error ${response.status}:`, errorText);
      return {
        success: false,
        error: `Ошибка сервера: ${response.status}`
      };
    }

    // Check content type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text();
      console.error('Non-JSON response received:', responseText.substring(0, 200));
      return {
        success: false,
        error: `Сервер вернул некорректный ответ. Content-Type: ${contentType}`
      };
    }

    const result = await response.json();

    if (result.success) {
      console.log(`Low paper notifications sent: ${result.successfulNotifications}/${result.totalAdmins} admins notified`);
      return {
        success: true,
        notificationSent: true,
        totalAdmins: result.totalAdmins,
        successfulNotifications: result.successfulNotifications
      };
    } else {
      return {
        success: false,
        error: result.error || 'Не удалось отправить уведомления'
      };
    }

  } catch (error) {
    // Handle different types of errors
    console.error("Error in checkAndNotifyLowPaper:", error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: "Не удается подключиться к Telegram серверу. Проверьте, что сервер запущен."
      };
    }
    
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return {
        success: false,
        error: "Ошибка обработки ответа сервера. Проверьте логи сервера."
      };
    }
    
    return {
      success: false,
      error: `Неожиданная ошибка: ${error.message}`
    };
  }
};

// Test function for debugging
export const testTelegramServerConnection = async () => {
  try {
    console.log('Testing Telegram server connection...');
    
    const serverUrl = 'http://localhost:3001';
    
    // Test health endpoint
    const healthResponse = await fetch(`${serverUrl}/health`);
    
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    const healthData = await healthResponse.json();
    console.log('✅ Server health check passed:', healthData);
    
    return { success: true, message: 'Telegram server is running' };
    
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    return { success: false, error: error.message };
  }
};