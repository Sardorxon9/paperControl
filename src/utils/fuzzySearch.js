/**
 * Enhanced search utility with fuzzy matching and transliteration support
 * Handles typos, misspellings, and Cyrillic-to-Latin conversion
 *
 * Search priority: exact match > prefix match > substring match > fuzzy match
 */

/**
 * Manual Cyrillic to Latin transliteration mapping
 * Handles Russian/Uzbek Cyrillic characters
 */
const transliterateCyrillic = (text) => {
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
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching when exact/prefix/substring matches fail
 */
const calculateLevenshteinDistance = (a, b) => {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const matrix = [];

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
};

/**
 * Smart search that handles fuzzy matching and transliteration
 * Prioritizes: exact match > prefix match > substring match > fuzzy match
 * @param {Array} items - Array of items to search through
 * @param {string} query - Search query
 * @param {Array} keys - Array of keys to search in (e.g., ['name', 'orgName'])
 * @param {Object} options - Fuse.js options (optional)
 * @returns {Array} - Filtered results
 */
export const fuzzySearch = (items, query, keys, options = {}) => {
  if (!query || query.trim() === '') {
    return items;
  }

  const lowerQuery = query.toLowerCase().trim();
  const transliteratedQuery = transliterateCyrillic(lowerQuery);

  // Score each item based on match quality
  const scoredItems = items.map(item => {
    let bestScore = Infinity;
    let matchType = 'none';

    // Check each key field
    for (const key of keys) {
      const fieldValue = (item[key] || '').toLowerCase();
      const fieldValueTranslit = transliterateCyrillic(fieldValue);

      // 1. EXACT MATCH (score: 0)
      if (fieldValue === lowerQuery || fieldValueTranslit === transliteratedQuery) {
        bestScore = 0;
        matchType = 'exact';
        break;
      }

      // 2. PREFIX MATCH - starts with (score: 1) - KEY FIX!
      if (fieldValue.startsWith(lowerQuery) || fieldValueTranslit.startsWith(transliteratedQuery)) {
        if (bestScore > 1) {
          bestScore = 1;
          matchType = 'prefix';
        }
      }

      // 3. SUBSTRING MATCH - contains (score: 2)
      if (fieldValue.includes(lowerQuery) || fieldValueTranslit.includes(transliteratedQuery) ||
          fieldValue.includes(transliteratedQuery) || fieldValueTranslit.includes(lowerQuery)) {
        if (bestScore > 2) {
          bestScore = 2;
          matchType = 'substring';
        }
      }

      // 4. FUZZY MATCH - Levenshtein distance (score: 3+)
      if (bestScore > 2) {
        const distance1 = calculateLevenshteinDistance(lowerQuery, fieldValue);
        const distance2 = calculateLevenshteinDistance(transliteratedQuery, fieldValueTranslit);
        const minDistance = Math.min(distance1, distance2);

        // Only consider if distance is reasonable
        const maxAllowedDistance = Math.max(3, Math.floor(lowerQuery.length * 0.3));
        if (minDistance <= maxAllowedDistance) {
          const fuzzyScore = 3 + minDistance;
          if (fuzzyScore < bestScore) {
            bestScore = fuzzyScore;
            matchType = 'fuzzy';
          }
        }
      }
    }

    return { item, score: bestScore, matchType };
  });

  // Filter out items with no match (Infinity score)
  const matched = scoredItems.filter(scored => scored.score !== Infinity);

  // Sort by score (lower is better)
  matched.sort((a, b) => {
    if (a.score !== b.score) {
      return a.score - b.score;
    }
    // If same score, sort alphabetically by name
    const aName = (a.item.name || a.item.productName || '').toLowerCase();
    const bName = (b.item.name || b.item.productName || '').toLowerCase();
    return aName.localeCompare(bName);
  });

  return matched.map(scored => scored.item);
};

/**
 * Search specifically for clients with support for multiple name fields
 * @param {Array} clients - Array of client objects
 * @param {string} query - Search query
 * @returns {Array} - Filtered clients
 */
export const searchClients = (clients, query) => {
  // Reduced to 3 essential fields to minimize false positives
  // Same as Telegram bot for consistency
  const keys = [
    'name',
    'restaurant',
    'orgName'
  ];

  return fuzzySearch(clients, query, keys);
};

/**
 * Search for products with support for product name and package type
 * @param {Array} products - Array of product objects
 * @param {string} query - Search query
 * @returns {Array} - Filtered products
 */
export const searchProducts = (products, query) => {
  const keys = [
    'productName',
    'fetchedProductName',
    'productTypeName',
    'type',
    'packaging',
    'fetchedPackageType'
  ];

  return fuzzySearch(products, query, keys);
};
