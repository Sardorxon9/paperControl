import { collection, getDocs, query, where } from "firebase/firestore";

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

    // Call the API endpoint instead of making direct Telegram calls
    try {
      const response = await fetch('/api/send-low-paper-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminChatIds,
          client,
          paperRemaining,
          notifyWhen
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`Low paper notifications sent: ${result.successfulNotifications}/${result.totalAdmins} admins notified`);
        return {
          success: true,
          notificationSent: true,
          totalAdmins: result.totalAdmins,
          successfulNotifications: result.successfulNotifications,
          results: result.results
        };
      } else {
        console.error("API call failed:", result);
        return {
          success: false,
          error: result.error || "Failed to send notifications"
        };
      }
    } catch (apiError) {
      console.error("Error calling API:", apiError);
      return {
        success: false,
        error: `API call failed: ${apiError.message}`
      };
    }

  } catch (error) {
    console.error("Error in checkAndNotifyLowPaper:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

const sendLowPaperSummaryToAdmins = async (db, clients) => {
  console.log("sendLowPaperSummaryToAdmins called with clients:", clients?.length);

  try {
    if (!db) {
      throw new Error("Firestore db instance is missing!");
    }

    if (!clients || clients.length === 0) {
      console.log("No clients with low paper to report.");
      return { success: true, notificationSent: false, message: "No clients with low paper" };
    }

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

    console.log(`Found ${adminChatIds.length} admin chat IDs:`, adminChatIds);

    // Create the API endpoint call for sending summary
    try {
      const response = await fetch('/api/send-low-paper-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminChatIds,
          clients
        })
      });

      const result = await response.json();
      console.log("API response:", result);
      
      if (response.ok && result.success) {
        console.log(`Low paper summary sent: ${result.successfulNotifications}/${result.totalAdmins} admins notified`);
        return {
          success: true,
          notificationSent: true,
          totalAdmins: result.totalAdmins,
          successfulNotifications: result.successfulNotifications,
          results: result.results
        };
      } else {
        console.error("API call failed:", result);
        return {
          success: false,
          error: result.error || "Failed to send summary"
        };
      }
    } catch (apiError) {
      console.error("Error calling summary API:", apiError);
      return {
        success: false,
        error: `API call failed: ${apiError.message}`
      };
    }

  } catch (error) {
    console.error("Error in sendLowPaperSummaryToAdmins:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

export {
  checkAndNotifyLowPaper,
  sendLowPaperSummaryToAdmins
};