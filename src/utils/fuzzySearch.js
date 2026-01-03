import Fuse from 'fuse.js';

/**
 * Enhanced search utility with fuzzy matching and transliteration support
 * Handles typos, misspellings, and Cyrillic-to-Latin conversion
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
 * Smart search that handles fuzzy matching and transliteration
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

  // Transliterate the query (handles Cyrillic to Latin)
  const transliteratedQuery = transliterateCyrillic(query);

  // Default Fuse.js options optimized for restaurant/client names
  const defaultOptions = {
    keys: keys,
    threshold: 0.4,        // 0 = exact match, 1 = match anything (0.4 is good for typos)
    distance: 100,         // Maximum character distance
    minMatchCharLength: 2, // Minimum character length to match
    ignoreLocation: true,  // Don't care about position in the string
    useExtendedSearch: false,
    includeScore: false,
    shouldSort: true,
    ...options
  };

  // Create Fuse instance for original query
  const fuseOriginal = new Fuse(items, defaultOptions);

  // Search with original query
  const resultsOriginal = fuseOriginal.search(query);

  // If transliterated query is different from original, search again
  if (transliteratedQuery.toLowerCase() !== query.toLowerCase()) {
    const fuseTransliterated = new Fuse(items, defaultOptions);
    const resultsTransliterated = fuseTransliterated.search(transliteratedQuery);

    // Combine results and remove duplicates
    const combinedResults = [...resultsOriginal, ...resultsTransliterated];
    const uniqueResults = Array.from(
      new Map(combinedResults.map(result => [result.item.id || JSON.stringify(result.item), result])).values()
    );

    return uniqueResults.map(result => result.item);
  }

  // Return results from original query
  return resultsOriginal.map(result => result.item);
};

/**
 * Search specifically for clients with support for multiple name fields
 * @param {Array} clients - Array of client objects
 * @param {string} query - Search query
 * @returns {Array} - Filtered clients
 */
export const searchClients = (clients, query) => {
  const keys = [
    'name',
    'restaurant',
    'displayName',
    'displayRestaurantName',
    'orgName',
    'displayOrgName',
    'branchOrgName',
    'branchName'
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
