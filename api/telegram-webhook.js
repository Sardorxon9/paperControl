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

// Get all productTypes from Firestore
async function getAllProductTypes() {
  try {
    let all = [];
    let pageToken = null;
    do {
      const url = pageToken
        ? `${FIRESTORE_API}/productTypes?key=${FIREBASE_API_KEY}&pageSize=300&pageToken=${pageToken}`
        : `${FIRESTORE_API}/productTypes?key=${FIREBASE_API_KEY}&pageSize=300`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.documents) {
        data.documents.forEach(doc => {
          const pt = firestoreDocToObject(doc);
          pt.id = doc.name.split('/').pop();
          all.push(pt);
        });
      }
      pageToken = data.nextPageToken || null;
    } while (pageToken);
    return all;
  } catch (error) {
    console.error('Error fetching productTypes:', error);
    return [];
  }
}

// Fuzzy search productTypes by comment field (same algorithm, comment + productCode)
function fuzzySearchProductTypes(productTypes, query) {
  if (!query || query.trim() === '') return productTypes;

  const lowerQuery = query.toLowerCase().trim();
  const transliteratedQuery = transliterateCyrillic(lowerQuery);

  // Normalize: collapse multiple spaces
  const normalize = str => str.replace(/\s+/g, ' ').trim();

  const scored = productTypes.map(pt => {
    const comment = normalize((pt.comment || '').toLowerCase());
    const productCode = normalize((pt.productCode || '').toLowerCase());
    const commentTranslit = transliterateCyrillic(comment);
    const codeTranslit = transliterateCyrillic(productCode);

    const normalizedQuery = normalize(lowerQuery);
    const normalizedTranslit = normalize(transliteratedQuery);

    let bestScore = Infinity;

    const fields = [
      { orig: comment, translit: commentTranslit },
      { orig: productCode, translit: codeTranslit }
    ];

    for (const field of fields) {
      if (!field.orig) continue;

      if (field.orig === normalizedQuery || field.translit === normalizedTranslit) {
        bestScore = 0; break;
      }
      if (field.orig.startsWith(normalizedQuery) || field.translit.startsWith(normalizedTranslit)) {
        if (bestScore > 1) bestScore = 1;
      }
      if (
        field.orig.includes(normalizedQuery) || field.translit.includes(normalizedTranslit) ||
        field.orig.includes(normalizedTranslit) || field.translit.includes(normalizedQuery)
      ) {
        if (bestScore > 2) bestScore = 2;
      }
      if (bestScore > 2) {
        const d1 = calculateLevenshteinDistance(normalizedQuery, field.orig);
        const d2 = calculateLevenshteinDistance(normalizedTranslit, field.translit);
        const minDist = Math.min(d1, d2);
        let maxAllowed;
        if (normalizedQuery.length <= 2) maxAllowed = 0;
        else if (normalizedQuery.length <= 4) maxAllowed = 1;
        else maxAllowed = Math.floor(normalizedQuery.length * 0.3);
        if (minDist <= maxAllowed) {
          const s = 3 + minDist;
          if (s < bestScore) bestScore = s;
        }
      }
    }

    return { pt, score: bestScore };
  });

  return scored
    .filter(item => item.score !== Infinity)
    .sort((a, b) => a.score - b.score)
    .map(item => item.pt);
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

  if (client.shellNum) {
    message += `📍 <b>Номер полки:</b> ${client.shellNum}\n`;
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
      [{ text: '📄 Узнать бумагу' }, { text: '📦 Узнать бумагу (Стандарт)' }],
      [{ text: '📋 Лист комментов' }]
    ],
    resize_keyboard: true,
    persistent: true
  };

  // Show the create-order button to admins only
  try {
    const admin = await getAdminUser(userId);
    if (admin) {
      keyboard.keyboard.unshift([{ text: '➕ Yangi buyurtma' }]);
    }
  } catch (e) {
    console.error('[create-order] start admin check failed:', e);
  }

  await sendMessage(
    chatId,
    '👋 Добро пожаловать!\n\nВыберите действие:',
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

// Handle "Узнать бумагу (Стандарт)" button — shows product list as inline buttons (no session state)
async function handleCheckPaperStandard(chatId) {
  const allProductTypes = await getAllProductTypes();
  const withComment = allProductTypes.filter(pt => pt.comment);

  if (withComment.length === 0) {
    await sendMessage(chatId, '❌ Нет продуктов с комментариями.');
    return;
  }

  const buttons = withComment.map(pt => [{
    text: `${pt.comment}  (${pt.productCode || '—'})`,
    callback_data: `stdpt_${pt.id}`
  }]);

  await sendMessage(chatId, '📦 Выберите продукт:', { reply_markup: { inline_keyboard: buttons } });
}

// Get a single client by Firestore document ID
async function getClientById(clientId) {
  try {
    const response = await fetch(`${FIRESTORE_API}/clients/${clientId}?key=${FIREBASE_API_KEY}`);
    const data = await response.json();
    if (!data.fields) return null;
    return { id: clientId, ...firestoreDocToObject(data) };
  } catch (error) {
    console.error('Error fetching client by id:', error);
    return null;
  }
}

// Format paper info message for a standard productType
// Structure: productTypes/{id}/paperInfo/{docId}/individualRolls
async function formatStandardProductMessage(pt) {
  // Fetch paperInfo sub-document
  const piRes = await fetch(`${FIRESTORE_API}/productTypes/${pt.id}/paperInfo?key=${FIREBASE_API_KEY}&pageSize=1`);
  const piData = await piRes.json();

  let rolls = [];
  let totalKg = 0;

  if (piData.documents && piData.documents.length > 0) {
    const piDoc = piData.documents[0];
    const piId = piDoc.name.split('/').pop();

    // Fetch individual rolls
    const rollsRes = await fetch(`${FIRESTORE_API}/productTypes/${pt.id}/paperInfo/${piId}/individualRolls?key=${FIREBASE_API_KEY}&pageSize=100`);
    const rollsData = await rollsRes.json();

    if (rollsData.documents) {
      rollsData.documents.forEach(doc => {
        const rd = firestoreDocToObject(doc);
        const w = Number(rd.paperRemaining) || 0;
        if (w > 0) rolls.push({ weight: w });
      });
    }
    totalKg = rolls.reduce((s, r) => s + r.weight, 0);
  }

  const name = pt.name || pt.productCode || 'Не указан';
  let msg = `📋 <b>Информация о бумаге (Стандарт)</b>\n\n`;
  msg += `📦 <b>Продукт:</b> ${name}\n`;
  if (pt.comment) msg += `💬 <b>Комментарий:</b> ${pt.comment}\n`;
  msg += `🔖 <b>Код:</b> <code>${pt.productCode || '—'}</code>\n`;
  if (pt.shellNum) msg += `📍 <b>Полка:</b> ${pt.shellNum}\n`;
  if (pt.gramm) msg += `⚖️ <b>Граммаж:</b> ${pt.gramm} гр\n`;

  msg += `\n 🧻 <b>Рулоны бумаги:</b>\n`;
  if (rolls.length === 0) {
    msg += `  ⚠️ Нет доступных рулонов\n`;
  } else {
    rolls.forEach((roll, i) => {
      msg += `  • Рулон ${i + 1}: <b>${roll.weight.toFixed(2)} кг</b>\n`;
    });
  }
  msg += `\n🔢 <b>ИТОГО:</b> <b>${totalKg.toFixed(2)} кг</b>`;
  return msg;
}

// Handle "Лист комментов" button — list all productTypes with a comment
async function handleListComments(chatId, userId) {
  const allProductTypes = await getAllProductTypes();
  const withComment = allProductTypes.filter(pt => pt.comment);

  if (withComment.length === 0) {
    await sendMessage(chatId, '📭 Нет продуктов с комментариями.');
    return;
  }

  let message = `📋 <b>Список продуктов (Стандарт):</b>\n\n`;
  withComment.forEach((pt, i) => {
    message += `${i + 1}. <b>${pt.comment}</b>\n`;
    message += `   🔖 Код: <code>${pt.productCode || '—'}</code>\n`;
  });

  await sendMessage(chatId, message);
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

// ============================================================================
// CREATE ORDER FEATURE (Part 1) — isolated flow: capture -> confirm -> write + post
// Stateless: serverless can't rely on userSessions, so order state is carried in
// inline-button callback_data and the exact rawInput is recovered from the card text.
// ============================================================================

const ORDERS_GROUP_CHAT_ID = process.env.ORDERS_GROUP_CHAT_ID;

// Known packageTypes doc ids (see DATABASE_GUIDE) — fast path before a Firestore read
const PACKAGE_ID_STICK = 'sKHbhJ8Ik7QpVUCEgbpP';
const PACKAGE_ID_SACHET = 'fhLBOV7ai4N7MZDPkSCL';

const ORDER_EXAMPLE = '<code>Лес айлес / 14 та</code>';

// Normalize any package label/string to canonical 'stick' | 'sachet' | ''
function normalizePackage(raw) {
  if (!raw) return '';
  const s = raw.toLowerCase().trim();
  if (/стик|stik|stick/.test(s)) return 'stick';
  if (/саше|сашет|sashe|sachet/.test(s)) return 'sachet';
  return '';
}

// Best-effort sugar color from a product name (white/brown), else null
function detectSugarFromName(name) {
  if (!name) return null;
  const s = transliterateCyrillic(name.toLowerCase());
  if (/jigar|korich|brown/.test(s)) return 'brown';
  if (/\boq\b|oq |belyy|bel|white/.test(s)) return 'white';
  return null;
}

// Resolve the product/package fixed on a client document (the "1 fixed product").
// Handles both unique design (productID_2 + packageID) and standard design
// (denormalized productName + packageType on the client).
async function resolveClientProduct(client) {
  let productId = null, productName = '', packageRaw = '';

  if (client.productID_2) {
    // Unique design
    productId = client.productID_2;
    productName = await getProductName(client.productID_2);
    if (client.packageID === PACKAGE_ID_STICK) packageRaw = 'стик';
    else if (client.packageID === PACKAGE_ID_SACHET) packageRaw = 'саше';
    else if (client.packageID) packageRaw = await getPackageType(client.packageID);
  } else if (client.productName || client.productTypeID) {
    // Standard design (denormalized fields)
    productId = client.productTypeID || null;
    productName = client.productName || '';
    packageRaw = client.packageType || '';
  }

  return {
    productId,
    productName,
    packageType: normalizePackage(packageRaw),
    sugarType: detectSugarFromName(productName)
  };
}

// Fetch all users (small collection) — used for admin authorization
async function getAllUsers() {
  let all = [];
  let pageToken = null;
  do {
    const url = pageToken
      ? `${FIRESTORE_API}/users?key=${FIREBASE_API_KEY}&pageSize=300&pageToken=${pageToken}`
      : `${FIRESTORE_API}/users?key=${FIREBASE_API_KEY}&pageSize=300`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.documents) {
      data.documents.forEach(doc => {
        const u = firestoreDocToObject(doc);
        u.id = doc.name.split('/').pop();
        all.push(u);
      });
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return all;
}

// Authorization gate: return the admin user doc for this Telegram user id, or null.
// Real field is `chatId` (string) per the users schema; some docs also have `chatID`.
// Compare both against from.id (the Telegram USER id).
async function getAdminUser(telegramUserId) {
  const users = await getAllUsers();
  const idStr = String(telegramUserId);
  return users.find(u =>
    u.role === 'admin' && (String(u.chatId) === idStr || String(u.chatID) === idStr)
  ) || null;
}

// --- Robust parsing (position-independent) ---
function classifyPackage(seg) {
  const s = seg.toLowerCase().trim();
  if (/^(стик|stik|stick)/.test(s)) return 'stick';
  if (/^(саше|сашет|sashe|sachet)/.test(s)) return 'sachet';
  return null;
}

function classifySugar(seg) {
  const s = seg.toLowerCase().trim();
  // brown first (longer tokens, avoids any overlap with white tokens)
  if (/^(корич|кор\.|korich|jigar|brown)/.test(s)) return 'brown';
  if (['ок', 'оқ', 'oq', 'ok', 'белый', 'бел', 'white'].includes(s)) return 'white';
  return null;
}

function classifyQuantity(seg) {
  // Strip known unit words, then require a pure-number remainder so restaurant
  // names that merely contain a number (e.g. "Cafe 24") are NOT treated as qty.
  const cleaned = seg
    .toLowerCase()
    .replace(/(коробок|коробк|штук|шт|dona|дона|quti|box|та|ta)/gi, '')
    .replace(/[\s.]/g, '');
  if (/^\d+$/.test(cleaned)) {
    const n = parseInt(cleaned, 10);
    if (n > 0) return n;
  }
  return null;
}

function parseOrderInput(text) {
  const segments = text.split('/').map(s => s.trim()).filter(Boolean);
  let packageType = null, sugarType = null, quantity = null;
  const restParts = [];

  // package/sugar are OPTIONAL — we still classify-and-consume them so they don't
  // pollute the restaurant name, and use them later to disambiguate when needed.
  for (const seg of segments) {
    if (packageType === null) { const p = classifyPackage(seg); if (p) { packageType = p; continue; } }
    if (sugarType === null) { const s = classifySugar(seg); if (s) { sugarType = s; continue; } }
    if (quantity === null) { const q = classifyQuantity(seg); if (q !== null) { quantity = q; continue; } }
    restParts.push(seg);
  }

  const restaurant = restParts.join(' ').trim();
  const missing = [];
  if (!restaurant) missing.push('mijoz nomi');
  if (quantity === null) missing.push('miqdor (masalan: 14 та)');

  return { restaurant, quantity, packageType, sugarType, missing };
}

function getClientFullName(client) {
  return client.name || client.displayName || client.restaurant || client.orgName || "Noma'lum";
}

// An order line is "restaurant / qty ..." — detect by a slash plus a quantity-looking
// segment, so a plain search like "AC/DC" is NOT mistaken for an order.
function isCreateOrderText(text) {
  if (typeof text !== 'string' || !text.includes('/')) return false;
  const segs = text.split('/').map(s => s.trim()).filter(Boolean);
  if (segs.length < 2) return false;
  return segs.some(s => classifyQuantity(s) !== null);
}

// Exact-match check for restaurant confidence — reuses transliterateCyrillic only
// (NOT a new matcher; fuzzySearchClients still does the actual matching).
function isExactClientMatch(client, query) {
  const q = transliterateCyrillic(query.toLowerCase().trim());
  return [client.name, client.orgName, client.restaurant, client.displayName]
    .some(f => f && transliterateCyrillic(f.toLowerCase().trim()) === q);
}

// The exact admin input is embedded as a "📝 ..." line in the card/candidate
// message so it survives a button press (Telegram echoes message.text in callbacks).
function extractRawInput(messageText) {
  if (!messageText) return '';
  const line = messageText.split('\n').find(l => l.startsWith('📝'));
  return line ? line.replace(/^📝\s*/, '').trim() : '';
}

// Product is resolved from the client record (the "fixed product"), so the card/
// callback only need quantity + clientId.
function buildConfirmCard(client, prod, quantity, rawInput) {
  const pkg = prod.packageType ? ` (${prod.packageType})` : '';
  const text =
    `<b>Buyurtma:</b>\n` +
    `🏢 Mijoz: ${getClientFullName(client)}\n` +
    `📦 Mahsulot: ${prod.productName || '—'}${pkg}\n` +
    `🔢 Miqdor: <b>${quantity}</b> ta\n` +
    `📝 ${rawInput}`;
  const cb = `oc:k:${quantity}:${client.id}`;
  const reply_markup = {
    inline_keyboard: [[
      { text: '✅ Tasdiqlash', callback_data: cb },
      { text: "✏️ O'zgartirish", callback_data: 'oc:e' }
    ]]
  };
  return { text, reply_markup };
}

function parseOrderCallback(data) {
  // oc:e | oc:k:<qty>:<clientId...> | oc:p:<qty>:<clientId...>
  const parts = data.split(':');
  const action = parts[1];
  if (action === 'e') return { action };
  return {
    action,
    quantity: parseInt(parts[2], 10),
    clientId: parts.slice(3).join(':') // clientId last so stray ':' can't corrupt other fields
  };
}

// Edit the inline card in place (omitting reply_markup removes the buttons)
async function editOrderCard(chatId, messageId, text) {
  try {
    await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.error('[create-order] editMessageText failed:', e);
  }
}

// Write one order document via the Firestore REST API (same auth path the rest of
// this file uses for reads; deployed rules permit it. No Admin SDK / service account
// is configured in this project).
async function createOrderDoc(order) {
  const body = {
    fields: {
      clientId: { stringValue: order.clientId },
      clientName: { stringValue: order.clientName },
      packageType: { stringValue: order.packageType || '' },
      sugarType: order.sugarType ? { stringValue: order.sugarType } : { nullValue: null },
      productId: order.productId ? { stringValue: order.productId } : { nullValue: null },
      productName: { stringValue: order.productName || '' },
      quantity: { integerValue: String(order.quantity) },
      unit: { stringValue: 'box' },
      status: { stringValue: 'new' },
      rawInput: { stringValue: order.rawInput || '' },
      createdBy: {
        mapValue: {
          fields: {
            telegramUserId: { integerValue: String(order.telegramUserId) },
            name: { stringValue: order.adminName }
          }
        }
      },
      createdAt: { timestampValue: new Date().toISOString() },
      channelMessageId: order.channelMessageId != null
        ? { integerValue: String(order.channelMessageId) }
        : { nullValue: null }
    }
  };

  const res = await fetch(`${FIRESTORE_API}/orders?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Firestore orders write failed: ' + JSON.stringify(data));
  }
  return data.name ? data.name.split('/').pop() : null;
}

// Post the formatted Uzbek message to the orders group; returns Telegram message_id
async function postOrderToGroup(order) {
  if (!ORDERS_GROUP_CHAT_ID) {
    throw new Error('ORDERS_GROUP_CHAT_ID env var is not set');
  }
  const dateStr = new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const pkg = order.packageType ? ` (${order.packageType})` : '';
  const text =
    `🆕 Yangi buyurtma\n\n\n` +
    `<b>${order.clientName}</b>\n\n` +
    `${order.productName || '—'}${pkg}\n` +
    `📦 <b>${order.quantity}</b> ta\n\n` +
    `${dateStr}`;

  const result = await sendMessage(ORDERS_GROUP_CHAT_ID, text);
  if (!result || !result.ok) {
    throw new Error('Telegram group post failed: ' + JSON.stringify(result));
  }
  return result.result.message_id;
}

// Entry: admin tapped the "➕ Yangi buyurtma" button
async function handleCreateOrderPrompt(chatId, userId) {
  const admin = await getAdminUser(userId);
  if (!admin) {
    await sendMessage(chatId, "Sizda buyurtma yaratish huquqi yo'q.");
    return;
  }
  await sendMessage(
    chatId,
    `➕ <b>Yangi buyurtma</b>\n\nMijoz nomi va miqdorni yuboring:\n${ORDER_EXAMPLE}\n\n` +
    `Mahsulot mijozga biriktirilgan bo'lsa, avtomatik tanlanadi. ` +
    `Bir nechta mahsulot bo'lsa, qaysi birini tanlash so'raladi.`
  );
}

// Resolve which client/product(s) an order maps to. Prefers exact restaurant
// matches; attaches each client's fixed product; optionally narrows by any
// package/sugar the admin typed. Returns [{ client, prod }].
async function resolveCandidates(clients, parsed) {
  const matches = fuzzySearchClients(clients, parsed.restaurant);
  if (!matches.length) return [];

  const exact = matches.filter(c => isExactClientMatch(c, parsed.restaurant));
  const base = exact.length ? exact : matches.slice(0, 6);

  let withProd = await Promise.all(
    base.map(async client => ({ client, prod: await resolveClientProduct(client) }))
  );

  // Use typed package/sugar (if any) only to disambiguate; ignore if it empties the set.
  if (parsed.packageType) {
    const f = withProd.filter(x => x.prod.packageType === parsed.packageType);
    if (f.length) withProd = f;
  }
  if (parsed.sugarType) {
    const f = withProd.filter(x => x.prod.sugarType === parsed.sugarType);
    if (f.length) withProd = f;
  }

  return withProd;
}

// Entry: admin typed the order line — gate -> parse -> resolve -> confirmation card
async function handleCreateOrderEntry(chatId, userId, text) {
  // 1) AUTH GATE (before any parsing)
  let admin;
  try {
    admin = await getAdminUser(userId);
  } catch (e) {
    console.error(`[create-order] auth lookup failed from.id=${userId}:`, e);
    await sendMessage(chatId, "❌ Xatolik yuz berdi, qayta urinib ko'ring.");
    return;
  }
  if (!admin) {
    await sendMessage(chatId, "Sizda buyurtma yaratish huquqi yo'q.");
    return;
  }

  try {
    // 2) PARSE
    const parsed = parseOrderInput(text);
    if (parsed.missing.length) {
      await sendMessage(
        chatId,
        `❌ Buyurtmani o'qiy olmadim. Quyidagilar yetishmayapti:\n• ${parsed.missing.join('\n• ')}\n\n` +
        `Namuna: ${ORDER_EXAMPLE}`
      );
      return;
    }

    // 3) RESOLVE the client's fixed product(s) for the matched restaurant
    const clients = await getAllClients();
    const candidates = await resolveCandidates(clients, parsed);
    if (candidates.length === 0) {
      await sendMessage(chatId, `❌ "<b>${parsed.restaurant}</b>" restorani topilmadi. Nomini tekshirib qayta yuboring.`);
      return;
    }

    if (candidates.length === 1) {
      // Exactly one product tied to this client -> auto-complete, show card
      const { client, prod } = candidates[0];
      const card = buildConfirmCard(client, prod, parsed.quantity, text.trim());
      await sendMessage(chatId, card.text, { reply_markup: card.reply_markup });
    } else {
      // Multiple products -> let admin choose which one belongs to this order
      const buttons = candidates.slice(0, 6).map(({ client, prod }) => {
        const pkg = prod.packageType ? ` (${prod.packageType})` : '';
        const label = `${getClientFullName(client)} — ${prod.productName || '?'}${pkg}`;
        return [{ text: label.substring(0, 60), callback_data: `oc:p:${parsed.quantity}:${client.id}` }];
      });
      await sendMessage(
        chatId,
        `📝 ${text.trim()}\n\n🤔 Bir nechta mahsulot topildi. Qaysi birini tanlaysiz?`,
        { reply_markup: { inline_keyboard: buttons } }
      );
    }
  } catch (e) {
    console.error(`[create-order] entry failed from.id=${userId} rawInput="${text}":`, e);
    await sendMessage(chatId, "❌ Xatolik yuz berdi, qayta urinib ko'ring.");
  }
}

// Admin picked a restaurant from the ambiguity list -> show the confirmation card
async function handleOrderPick(chatId, userId, parsed, candidateText) {
  const admin = await getAdminUser(userId);
  if (!admin) {
    await sendMessage(chatId, "Sizda buyurtma yaratish huquqi yo'q.");
    return;
  }
  const client = await getClientById(parsed.clientId);
  if (!client) {
    await sendMessage(chatId, "❌ Mijoz topilmadi. Qayta urinib ko'ring.");
    return;
  }
  const prod = await resolveClientProduct(client);
  const rawInput = extractRawInput(candidateText);
  const card = buildConfirmCard(client, prod, parsed.quantity, rawInput);
  await sendMessage(chatId, card.text, { reply_markup: card.reply_markup });
}

// Admin tapped ✅ Tasdiqlash -> write to Firestore + post to group
async function handleOrderConfirm(chatId, userId, parsed, cardMessageId, cardText) {
  // AUTH GATE
  let admin;
  try {
    admin = await getAdminUser(userId);
  } catch (e) {
    console.error(`[create-order] auth lookup failed from.id=${userId}:`, e);
    await sendMessage(chatId, "❌ Xatolik yuz berdi, qayta urinib ko'ring.");
    return;
  }
  if (!admin) {
    await sendMessage(chatId, "Sizda buyurtma yaratish huquqi yo'q.");
    return;
  }

  const rawInput = extractRawInput(cardText);
  try {
    const client = await getClientById(parsed.clientId);
    if (!client) {
      await sendMessage(chatId, "❌ Mijoz topilmadi. Qayta urinib ko'ring.");
      return;
    }

    // Auto-complete the product/package from the client's fixed product
    const prod = await resolveClientProduct(client);
    const order = {
      clientId: client.id,
      clientName: getClientFullName(client),
      packageType: prod.packageType,
      sugarType: prod.sugarType,
      productId: prod.productId,
      productName: prod.productName,
      quantity: parsed.quantity,
      rawInput,
      telegramUserId: userId,
      adminName: admin.name || 'Admin',
      channelMessageId: null
    };

    // Post to group first to capture message_id, then write the order once.
    let messageId = null;
    try {
      messageId = await postOrderToGroup(order);
      order.channelMessageId = messageId;
    } catch (postErr) {
      console.error(`[create-order] group post failed from.id=${userId} rawInput="${rawInput}":`, postErr);
    }

    let orderId;
    try {
      orderId = await createOrderDoc(order);
    } catch (writeErr) {
      console.error(`[create-order] firestore write failed from.id=${userId} rawInput="${rawInput}":`, writeErr);
      await editOrderCard(chatId, cardMessageId, "❌ Buyurtmani saqlashda xatolik. Qayta urinib ko'ring.");
      return;
    }

    console.log(`[create-order] order created id=${orderId} client=${order.clientName} by=${order.adminName} msgId=${messageId}`);

    const summaryPkg = order.packageType ? ` (${order.packageType})` : '';
    const summary =
      `✅ <b>Buyurtma yuborildi</b>\n\n` +
      `<b>${order.clientName}</b>\n` +
      `${order.productName || '—'}${summaryPkg}\n` +
      `📦 <b>${order.quantity}</b> ta`;
    await editOrderCard(
      chatId,
      cardMessageId,
      messageId ? summary : summary + `\n\n⚠️ Guruhga yuborilmadi (ORDERS_GROUP_CHAT_ID ni tekshiring).`
    );
  } catch (e) {
    console.error(`[create-order] confirm failed from.id=${userId} rawInput="${rawInput}":`, e);
    await sendMessage(chatId, "❌ Xatolik yuz berdi, qayta urinib ko'ring.");
  }
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

      if (data.startsWith('oc:')) {
        // Create-order callbacks: confirm / pick / edit
        const parsed = parseOrderCallback(data);
        const cardMessageId = callbackQuery.message.message_id;
        const cardText = callbackQuery.message.text || '';
        if (parsed.action === 'e') {
          await editOrderCard(chatId, cardMessageId, '✏️ Bekor qilindi.');
          await sendMessage(chatId, `Yangi buyurtmani qayta yuboring:\n${ORDER_EXAMPLE}`);
        } else if (parsed.action === 'p') {
          await handleOrderPick(chatId, userId, parsed, cardText);
        } else if (parsed.action === 'k') {
          await handleOrderConfirm(chatId, userId, parsed, cardMessageId, cardText);
        }
      } else if (data.startsWith('stdpt_')) {
        // User selected a productType — show its own paper info directly
        const ptId = data.replace('stdpt_', '');
        const allPT = await getAllProductTypes();
        const productType = allPT.find(pt => pt.id === ptId);
        if (!productType) {
          await sendMessage(chatId, '❌ Продукт не найден.');
        } else {
          const message = await formatStandardProductMessage(productType);
          await sendMessage(chatId, message);
        }
      } else if (data.startsWith('select_')) {
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
      // Orders are created in private DMs only — never from the group the bot posts to.
      const isPrivate = (message.chat.type || 'private') === 'private';

      // Check user session state
      const session = userSessions[userId];

      if (text === '/start') {
        await handleStart(chatId, userId);
      } else if (text === '📄 Узнать бумагу') {
        await handleCheckPaper(chatId, userId);
      } else if (text === '📦 Узнать бумагу (Стандарт)') {
        await handleCheckPaperStandard(chatId);
      } else if (text === '📋 Лист комментов') {
        await handleListComments(chatId, userId);
      } else if (isPrivate && text === '➕ Yangi buyurtma') {
        await handleCreateOrderPrompt(chatId, userId);
      } else if (isPrivate && isCreateOrderText(text)) {
        // Looks like an order line ("Restoran / 14 та / стик / ок") — admin-gated inside
        await handleCreateOrderEntry(chatId, userId, text);
      } else if (isPrivate && text && text.trim().length > 0) {
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
