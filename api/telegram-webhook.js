// api/telegram-webhook.js - Telegram Bot Webhook Handler
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Firebase REST API configuration
const FIREBASE_PROJECT_ID = 'paper-control-6bce2';
const FIREBASE_API_KEY = 'AIzaSyBoYiTk7tqrpDKOvG9mDHHTlfP77MZ4sKA';
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// User session storage
const userSessions = {};

// Cyrillic to Latin transliteration (from fuzzySearch.js)
function transliterateCyrillic(text) {
  const cyrillicToLatin = {
    'А': 'A', 'а': 'a',
    'Б': 'B', 'б': 'b',
    'В': 'V', 'в': 'v',
    'Г': 'G', 'г': 'g',
    'Д': 'D', 'д': 'd',
    'Е': 'E', 'е': 'e',
    'Ё': 'E', 'ё': 'e',
    'Ж': 'J', 'ж': 'j',
    'З': 'Z', 'з': 'z',
    'И': 'I', 'и': 'i',
    'Й': 'Y', 'й': 'y',
    'К': 'K', 'к': 'k',
    'Л': 'L', 'л': 'l',
    'М': 'M', 'м': 'm',
    'Н': 'N', 'н': 'n',
    'О': 'O', 'о': 'o',
    'П': 'P', 'п': 'p',
    'Р': 'R', 'р': 'r',
    'С': 'S', 'с': 's',
    'Т': 'T', 'т': 't',
    'У': 'U', 'у': 'u',
    'Ф': 'F', 'ф': 'f',
    'Х': 'H', 'х': 'h',
    'Ц': 'TS', 'ц': 'ts',
    'Ч': 'CH', 'ч': 'ch',
    'Ш': 'SH', 'ш': 'sh',
    'Щ': 'SCH', 'щ': 'sch',
    'Ъ': '', 'ъ': '',
    'Ы': 'Y', 'ы': 'y',
    'Ь': '', 'ь': '',
    'Э': 'E', 'э': 'e',
    'Ю': 'YU', 'ю': 'yu',
    'Я': 'YA', 'я': 'ya',
    'Ў': 'O', 'ў': 'o',
    'Қ': 'Q', 'қ': 'q',
    'Ғ': 'G', 'ғ': 'g',
    'Ҳ': 'H', 'ҳ': 'h'
  };

  return text.split('').map(char => cyrillicToLatin[char] || char).join('');
}

// Fuzzy search implementation with transliteration support
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
  const transliteratedQuery = transliterateCyrillic(lowerQuery);

  const scored = clients.map(client => {
    const name = (client.name || '').toLowerCase();
    const orgName = (client.orgName || '').toLowerCase();
    const restaurant = (client.restaurant || '').toLowerCase();

    // Also transliterate client fields for cross-language matching
    const nameTranslit = transliterateCyrillic(name);
    const orgNameTranslit = transliterateCyrillic(orgName);
    const restaurantTranslit = transliterateCyrillic(restaurant);

    let bestScore = Infinity;

    // Check all three fields (name, orgName, restaurant)
    const fields = [
      { orig: name, translit: nameTranslit },
      { orig: orgName, translit: orgNameTranslit },
      { orig: restaurant, translit: restaurantTranslit }
    ];

    for (const field of fields) {
      // 1. EXACT MATCH (score: 0)
      if (field.orig === lowerQuery || field.translit === transliteratedQuery) {
        bestScore = 0;
        break;
      }

      // 2. PREFIX MATCH - starts with (score: 1) - KEY FIX!
      if (field.orig.startsWith(lowerQuery) || field.translit.startsWith(transliteratedQuery)) {
        if (bestScore > 1) {
          bestScore = 1;
        }
      }

      // 3. SUBSTRING MATCH - contains (score: 2)
      if (field.orig.includes(lowerQuery) || field.translit.includes(transliteratedQuery) ||
          field.orig.includes(transliteratedQuery) || field.translit.includes(lowerQuery)) {
        if (bestScore > 2) {
          bestScore = 2;
        }
      }

      // 4. FUZZY MATCH - Levenshtein distance (score: 3+)
      if (bestScore > 2) {
        const distance1 = calculateLevenshteinDistance(lowerQuery, field.orig);
        const distance2 = calculateLevenshteinDistance(transliteratedQuery, field.translit);
        const minDistance = Math.min(distance1, distance2);

        // Tiered threshold: stricter for short queries, more permissive for long ones
        let maxAllowedDistance;
        if (lowerQuery.length <= 2) {
          maxAllowedDistance = 0; // Exact/prefix/substring only
        } else if (lowerQuery.length <= 4) {
          maxAllowedDistance = 1; // Allow only 1 typo for short queries
        } else {
          maxAllowedDistance = Math.floor(lowerQuery.length * 0.25); // 25% tolerance for longer queries
        }

        if (minDistance <= maxAllowedDistance) {
          const fuzzyScore = 3 + minDistance;
          if (fuzzyScore < bestScore) {
            bestScore = fuzzyScore;
          }
        }
      }
    }

    return { client, score: bestScore };
  });

  // Filter out items with no match (Infinity score)
  const filtered = scored.filter(item => item.score !== Infinity);

  // Sort by score (lower is better)
  filtered.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    // If same score, sort alphabetically by name
    const aName = (a.client.name || '').toLowerCase();
    const bName = (b.client.name || '').toLowerCase();
    return aName.localeCompare(bName);
  });

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

// Get all clients from Firestore (with pagination)
async function getAllClients() {
  try {
    let allClients = [];
    let pageToken = null;

    // Fetch all pages
    do {
      const url = pageToken
        ? `${FIRESTORE_API}/clients?key=${FIREBASE_API_KEY}&pageSize=300&pageToken=${pageToken}`
        : `${FIRESTORE_API}/clients?key=${FIREBASE_API_KEY}&pageSize=300`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.documents) {
        const clients = data.documents.map(doc => {
          const clientData = firestoreDocToObject(doc);
          const clientId = doc.name.split('/').pop();
          return {
            id: clientId,
            ...clientData
          };
        });
        allClients = allClients.concat(clients);
      }

      pageToken = data.nextPageToken || null;
    } while (pageToken);

    console.log('[DEBUG] Total clients fetched:', allClients.length);
    return allClients;
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
    message += `<b>Организация:</b> ${orgName}\n`;
  }

  message += `\n📦 <b>Продукт:</b> ${productName || 'Не указан'}`;

  if (grammValue) {
    message += ` (${grammValue} гр)`;
  }

  if (packageType) {
    message += `\n  ${packageType}`;
  }

  message += `\n\n <b>Рулоны бумаги:</b>\n`;

  if (paperRolls.length === 0) {
    message += `  ⚠️ Нет доступных рулонов\n`;
  } else {
    paperRolls.forEach((roll, index) => {
      message += `  • Рулон ${index + 1}: <b>${roll.weight.toFixed(2)} кг</b>\n`;
    });
  }

  message += `\n🔢 <b>ИТОГО:</b> <b>${totalKg.toFixed(2)} кг</b>`;

  return message;
}

// Handle /start command
async function handleStart(chatId, userId) {
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

    // Fetch product names for all results
    const buttons = await Promise.all(results.map(async (client, index) => {
      let productInfo = '';
      if (client.productID_2) {
        const productName = await getProductName(client.productID_2);
        const packageType = await getPackageType(client.packageID);
        const fullProduct = packageType ? `${productName} ${packageType}` : productName;
        productInfo = fullProduct ? `(${fullProduct})` : '';
      }
      const restaurantName = (client.name || client.restaurant).toUpperCase();
      const label = `${restaurantName} ${productInfo}`;
      return [{
        text: label.substring(0, 60),
        callback_data: `select_${index}`
      }];
    }));

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

      // Check user session state
      const session = userSessions[userId];

      if (text === '/start') {
        await handleStart(chatId, userId);
      } else if (text === '📄 Узнать бумагу') {
        await sendMessage(
          chatId,
          '🔍 Пожалуйста, введите название ресторана:'
        );
        userSessions[userId] = { state: 'awaiting_restaurant_name' };
      } else if (text && text.trim().length > 0) {
        // Default: restaurant search
        await handleRestaurantInput(chatId, userId, text);
      }

      res.json({ ok: true });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error in webhook handler:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Try to send error to user if we have chat info
    try {
      if (update && update.message && update.message.chat) {
        const chatId = update.message.chat.id;
        const errorMsg = `❌ <b>Webhook Error:</b>\n\n${error.message}\n\n<code>${error.stack ? error.stack.substring(0, 400) : 'N/A'}</code>`;
        await sendMessage(chatId, errorMsg);
      }
    } catch (sendError) {
      console.error('Failed to send error message to user:', sendError);
    }

    res.status(500).json({
      error: 'Internal server error',
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack ? error.stack.substring(0, 500) : 'N/A',
      details: error.message
    });
  }
}
