// ========================================
// COMMERCIAL PROPOSAL CONFIGURATION
// ========================================
// Edit these values to update pricing and product details
// All changes will automatically reflect in generated PDFs

module.exports = {
  // ========================================
  // ADMIN CHAT IDs (Telegram)
  // ========================================
  // Only these chat IDs can create commercial proposals
  adminChatIds: [
    685385466  // Add more admin chat IDs here
  ],

  // ========================================
  // PRODUCT 1: WHITE SUGAR
  // ========================================
  product1: {
    name: 'Белый сахар',
    description: 'Сахар в стик-упаковке',
    pricePerUnit: 150,        // сум (price per single unit)
    format: 'Стик / 5 г',     // format and weight
    minBatch: 20000,          // minimum order quantity (штук)
    clicheColors: 1,          // number of colors for printing
    clichePricePerColor: 250000  // сум (price per color for cliche)
  },

  // ========================================
  // PRODUCT 2: BROWN SUGAR
  // ========================================
  product2: {
    name: 'Тростниковый сахар',
    description: 'Коричневый сахар в стик упаковках',
    pricePerUnit: 400,        // сум
    format: 'Стик / 4 г',
    minBatch: 10000,          // штук
    clicheColors: 1,
    clichePricePerColor: 250000  // сум
  },

  // ========================================
  // COMPANY INFORMATION
  // ========================================
  company: {
    name: 'WhiteRay PRO',
    website: 'www.whiteray.uz',
    phone: '+998 97 716 61 33',
    address: 'г. Ташкент, Юнусабад 17-6'
  }
};
