// api/telegram-webhook.js - Telegram Bot Webhook Handler
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Firebase REST API configuration
const FIREBASE_PROJECT_ID = 'paper-control-6bce2';
const FIREBASE_API_KEY = 'AIzaSyBoYiTk7tqrpDKOvG9mDHHTlfP77MZ4sKA';
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// User session storage
const userSessions = {};

// Fuzzy search implementation
function calculateLevenshteinDistance(a, b) {
  const matrix = [];
  const aLen = a.length;
  const bLen = b.length;

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[bLen][aLen];
}

function fuzzySearchClients(clients, query) {
  if (!query || query.trim() === '') {
    return clients;
  }

  const lowerQuery = query.toLowerCase().trim();

  const scored = clients.map(client => {
    const name = (client.name || '').toLowerCase();
    const orgName = (client.orgName || '').toLowerCase();
    const restaurant = (client.restaurant || '').toLowerCase();

    if (name.includes(lowerQuery) || orgName.includes(lowerQuery) || restaurant.includes(lowerQuery)) {
      return { client, score: 0 };
    }

    const nameDistance = calculateLevenshteinDistance(lowerQuery, name);
    const orgDistance = calculateLevenshteinDistance(lowerQuery, orgName);
    const restaurantDistance = calculateLevenshteinDistance(lowerQuery, restaurant);

    const minDistance = Math.min(nameDistance, orgDistance, restaurantDistance);

    return { client, score: minDistance };
  });

  const maxDistance = Math.max(3, Math.floor(lowerQuery.length * 0.4));
  const filtered = scored.filter(item => item.score <= maxDistance);

  filtered.sort((a, b) => a.score - b.score);

  return filtered.map(item => item.client);
}

// Convert Firestore document to plain object
function firestoreDocToObject(doc) {
  const data = {};
  if (!doc.fields) return data;

  for (const [key, value] of Object.entries(doc.fields)) {
    if (value.stringValue !== undefined) {
      data[key] = value.stringValue;
    } else if (value.integerValue !== undefined) {
      data[key] = parseInt(value.integerValue);
    } else if (value.doubleValue !== undefined) {
      data[key] = parseFloat(value.doubleValue);
    } else if (value.booleanValue !== undefined) {
      data[key] = value.booleanValue;
    } else if (value.nullValue !== undefined) {
      data[key] = null;
    }
  }
  return data;
}

// Send message helper
async function sendMessage(chatId, text, options = {}) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: options.parse_mode || 'HTML',
        reply_markup: options.reply_markup || undefined
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Get all clients from Firestore
async function getAllClients() {
  try {
    const response = await fetch(`${FIRESTORE_API}/clients?key=${FIREBASE_API_KEY}`);
    const data = await response.json();

    if (!data.documents) {
      return [];
    }

    return data.documents.map(doc => {
      const clientData = firestoreDocToObject(doc);
      const clientId = doc.name.split('/').pop();
      return {
        id: clientId,
        ...clientData
      };
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

// Get product name
async function getProductName(productID) {
  if (!productID) return '';
  try {
    const response = await fetch(`${FIRESTORE_API}/products/${productID}?key=${FIREBASE_API_KEY}`);
    const data = await response.json();
    const product = firestoreDocToObject(data);
    return product.productName || '';
  } catch (error) {
    console.error('Error fetching product:', error);
    return '';
  }
}

// Get package type
async function getPackageType(packageID) {
  if (!packageID) return '';
  try {
    const response = await fetch(`${FIRESTORE_API}/packageTypes/${packageID}?key=${FIREBASE_API_KEY}`);
    const data = await response.json();
    const pkg = firestoreDocToObject(data);
    return pkg.type || '';
  } catch (error) {
    console.error('Error fetching package type:', error);
    return '';
  }
}

// Get gramm value for client
async function getGrammValue(client) {
  if (client.designType === "unique" && client.gramm) {
    return client.gramm;
  } else if (client.productID_2 || client.packageID) {
    try {
      const response = await fetch(`${FIRESTORE_API}/productTypes?key=${FIREBASE_API_KEY}`);
      const data = await response.json();

      if (!data.documents) return '';

      for (const doc of data.documents) {
        const ptData = firestoreDocToObject(doc);
        const matchesProduct = !client.productID_2 || ptData.productID_2 === client.productID_2;
        const matchesPackage = !client.packageID || ptData.packageID === client.packageID;

        if (matchesProduct && matchesPackage && ptData.gramm) {
          return ptData.gramm;
        }
      }
    } catch (error) {
      console.error('Error fetching gramm:', error);
    }
  }
  return '';
}

// Get paper rolls for client
async function getPaperRolls(clientId) {
  try {
    const response = await fetch(`${FIRESTORE_API}/clients/${clientId}/paperRolls?key=${FIREBASE_API_KEY}`);
    const data = await response.json();

    if (!data.documents) {
      return [];
    }

    const rolls = [];
    data.documents.forEach((doc) => {
      const rollData = firestoreDocToObject(doc);
      const weight = Number(rollData.paperRemaining) || 0;
      if (weight > 0) {
        rolls.push({
          id: doc.name.split('/').pop(),
          weight: weight
        });
      }
    });

    return rolls;
  } catch (error) {
    console.error('Error fetching paper rolls:', error);
    return [];
  }
}

// Search for clients by restaurant name
async function searchRestaurants(query) {
  try {
    const clients = await getAllClients();
    const results = fuzzySearchClients(clients, query);
    return results;
  } catch (error) {
    console.error('Error searching restaurants:', error);
    throw error;
  }
}

// Format paper info message
async function formatPaperInfoMessage(client) {
  const productName = await getProductName(client.productID_2);
  const packageType = await getPackageType(client.packageID);
  const grammValue = await getGrammValue(client);
  const paperRolls = await getPaperRolls(client.id);

  const totalKg = paperRolls.reduce((sum, roll) => sum + roll.weight, 0);

  const restaurantName = client.name || client.restaurant || 'Не указано';
  const orgName = client.orgName || client.organization || '-';

  let message = `📋 <b>Информация о бумаге</b>\n\n`;
  message += `🏢 <b>Ресторан:</b> ${restaurantName}\n`;

  if (orgName !== '-') {
    message += `🏛 <b>Организация:</b> ${orgName}\n`;
  }

  message += `\n📦 <b>Продукт:</b> ${productName || 'Не указан'}`;

  if (grammValue) {
    message += ` (${grammValue} гр)`;
  }

  if (packageType) {
    message += `\n📐 <b>Упаковка:</b> ${packageType}`;
  }

  message += `\n\n📜 <b>Рулоны бумаги:</b>\n`;

  if (paperRolls.length === 0) {
    message += `  ⚠️ Нет доступных рулонов\n`;
  } else {
    paperRolls.forEach((roll, index) => {
      message += `  • Рулон ${index + 1}: <b>${roll.weight} кг</b>\n`;
    });
  }

  message += `\n🔢 <b>ИТОГО:</b> <b>${totalKg} кг</b>`;

  return message;
}

// Handle /start command
async function handleStart(chatId) {
  const keyboard = {
    keyboard: [
      [{ text: '📄 Узнать бумагу' }]
    ],
    resize_keyboard: true,
    persistent: true
  };

  await sendMessage(
    chatId,
    '👋 Добро пожаловать!\n\nИспользуйте кнопку <b>"Узнать бумагу"</b> для проверки остатков бумаги в ресторане.',
    { reply_markup: keyboard }
  );
}

// Handle "Узнать бумагу" button
async function handleCheckPaper(chatId, userId) {
  userSessions[userId] = { state: 'awaiting_restaurant_name' };

  await sendMessage(
    chatId,
    '🔍 Пожалуйста, введите название ресторана:'
  );
}

// Handle restaurant name input
async function handleRestaurantInput(chatId, userId, query) {
  const results = await searchRestaurants(query);

  if (results.length === 0) {
    await sendMessage(
      chatId,
      '❌ Ресторан не найден. Попробуйте еще раз или проверьте правильность написания.'
    );
    return;
  }

  // Group by restaurant name and product
  const grouped = {};

  for (const client of results) {
    const key = `${client.name || client.restaurant}_${client.productID_2 || 'default'}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(client);
  }

  const groupedArray = Object.values(grouped);

  if (groupedArray.length === 1 && groupedArray[0].length === 1) {
    // Single result - show directly
    const client = groupedArray[0][0];
    const message = await formatPaperInfoMessage(client);
    await sendMessage(chatId, message);

    // Reset session
    delete userSessions[userId];
  } else if (groupedArray.length > 1) {
    // Multiple products for same restaurant or different restaurants
    userSessions[userId] = {
      state: 'selecting_product',
      results: results
    };

    const buttons = results.map((client, index) => {
      const productInfo = client.productID_2 ? `(ID: ${client.productID_2.substring(0, 8)}...)` : '';
      const label = `${client.name || client.restaurant} ${productInfo}`;
      return [{
        text: label.substring(0, 60),
        callback_data: `select_${index}`
      }];
    });

    await sendMessage(
      chatId,
      '📋 Найдено несколько вариантов. Выберите нужный:',
      { reply_markup: { inline_keyboard: buttons } }
    );
  } else {
    // Single match but multiple entries (e.g., branches)
    const client = groupedArray[0][0];
    const message = await formatPaperInfoMessage(client);
    await sendMessage(chatId, message);

    // Reset session
    delete userSessions[userId];
  }
}

// Handle product selection
async function handleProductSelection(chatId, userId, selectedIndex) {
  const session = userSessions[userId];

  if (!session || !session.results) {
    await sendMessage(chatId, '❌ Сессия истекла. Пожалуйста, начните снова.');
    delete userSessions[userId];
    return;
  }

  const client = session.results[selectedIndex];

  if (!client) {
    await sendMessage(chatId, '❌ Ошибка выбора. Попробуйте еще раз.');
    delete userSessions[userId];
    return;
  }

  const message = await formatPaperInfoMessage(client);
  await sendMessage(chatId, message);

  // Reset session
  delete userSessions[userId];
}

// Main webhook handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const update = req.body;
    console.log('Telegram update received');

    // Handle callback query (button press)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;

      // Acknowledge callback
      await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQuery.id })
      });

      if (data.startsWith('select_')) {
        const index = parseInt(data.replace('select_', ''));
        await handleProductSelection(chatId, userId, index);
      }

      res.json({ ok: true });
      return;
    }

    // Handle regular message
    if (update.message) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const text = message.text || '';

      if (text === '/start') {
        await handleStart(chatId);
      } else if (text === '📄 Узнать бумагу') {
        await handleCheckPaper(chatId, userId);
      } else {
        // Check if user is in a session
        const session = userSessions[userId];

        if (session && session.state === 'awaiting_restaurant_name') {
          await handleRestaurantInput(chatId, userId, text);
        } else {
          await sendMessage(
            chatId,
            'Используйте кнопку <b>"Узнать бумагу"</b> для проверки остатков.'
          );
        }
      }

      res.json({ ok: true });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error in webhook handler:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
