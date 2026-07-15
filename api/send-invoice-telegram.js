// api/send-invoice-telegram.js - Send invoice PDF to user's Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HTML2PDF_API_KEY = process.env.HTML2PDF_API_KEY;

const FIREBASE_PROJECT_ID = 'paper-control-6bce2';
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
    return;
  }

  try {
    const { invoiceId, userUid } = req.body;

    if (!invoiceId || !userUid) {
      return res.status(400).json({ success: false, error: 'Missing invoiceId or userUid' });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' });
    }

    if (!HTML2PDF_API_KEY) {
      return res.status(500).json({ success: false, error: 'HTML2PDF_API_KEY not configured' });
    }

    // 1. Fetch user to get chatId
    const usersResponse = await fetch(
      `${FIRESTORE_API}/users?pageSize=100`
    );
    const usersData = await usersResponse.json();

    let chatId = null;
    if (usersData.documents) {
      const userDoc = usersData.documents.find(doc => {
        const fields = doc.fields;
        return fields.uID?.stringValue === userUid;
      });
      if (userDoc) {
        chatId = userDoc.fields.chatId?.stringValue;
      }
    }

    if (!chatId) {
      return res.status(400).json({ success: false, error: 'User has no Telegram chatId linked' });
    }

    // 2. Fetch invoice data
    const invoiceResponse = await fetch(`${FIRESTORE_API}/all-invoices/${invoiceId}`);
    if (!invoiceResponse.ok) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const invoiceDoc = await invoiceResponse.json();
    const invoiceFields = invoiceDoc.fields;

    // 3. Fetch products and packageTypes for name resolution
    const [productsResponse, packagesResponse, catalogueResponse] = await Promise.all([
      fetch(`${FIRESTORE_API}/products?pageSize=500`),
      fetch(`${FIRESTORE_API}/packageTypes?pageSize=500`),
      fetch(`${FIRESTORE_API}/catalogue?pageSize=500`)
    ]);

    const productsData = await productsResponse.json();
    const packagesData = await packagesResponse.json();
    const catalogueData = await catalogueResponse.json();

    const productsMap = {};
    if (productsData.documents) {
      productsData.documents.forEach(doc => {
        const id = doc.name.split('/').pop();
        productsMap[id] = doc.fields.productName?.stringValue || '';
      });
    }

    const packagesMap = {};
    if (packagesData.documents) {
      packagesData.documents.forEach(doc => {
        const id = doc.name.split('/').pop();
        packagesMap[id] = doc.fields.type?.stringValue || '';
      });
    }

    const catalogueMap = {};
    if (catalogueData.documents) {
      catalogueData.documents.forEach(doc => {
        const id = doc.name.split('/').pop();
        catalogueMap[id] = {
          productName: doc.fields.productName?.stringValue || '',
          packageType: doc.fields.packageType?.stringValue || '',
          productCode: doc.fields.productCode?.stringValue || '',
          comment: doc.fields.comment?.stringValue || ''
        };
      });
    }

    // 4. Parse invoice data and resolve product names
    const invoiceNumber = invoiceFields.invoiceNumber?.stringValue || '';
    const senderCompany = invoiceFields.senderCompany?.stringValue || 'White Ray';
    const customRestaurantName = invoiceFields.customRestaurantName?.stringValue || '';
    const orgName = invoiceFields.orgName?.stringValue || '';
    const invoiceType = invoiceFields.type?.stringValue || '';
    const dateCreated = invoiceFields.dateCreated?.timestampValue || '';

    const rawProducts = invoiceFields.products?.arrayValue?.values || [];
    const resolvedProducts = rawProducts.map(item => {
      const fields = item.mapValue?.fields || {};
      const productID_2 = fields.productID_2?.stringValue || '';
      const packageID = fields.packageID?.stringValue || '';
      const catalogueItemID = fields.catalogueItemID?.stringValue || '';
      const quantity = parseInt(fields.quantity?.integerValue || fields.quantity?.doubleValue || '0');
      const price = parseInt(fields.price?.integerValue || fields.price?.doubleValue || '0');
      const gramm = fields.gramm?.integerValue || fields.gramm?.doubleValue || fields.gramm?.stringValue || '';

      let productName = '';
      let packageType = '';

      if (invoiceType === 'standard' && catalogueItemID) {
        const catItem = catalogueMap[catalogueItemID];
        if (catItem) {
          productName = catItem.productName;
          packageType = catItem.packageType;
        }
      } else {
        productName = productsMap[productID_2] || productID_2;
        packageType = packagesMap[packageID] || packageID;
      }

      return { productName, packageType, gramm, quantity, price };
    });

    // 5. Build invoice HTML
    const invoiceHTML = buildInvoiceHTML({
      invoiceNumber,
      senderCompany,
      customRestaurantName,
      orgName,
      dateCreated,
      products: resolvedProducts
    });

    // 6. Convert HTML to PDF via html2pdf.app
    const pdfResponse = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: HTML2PDF_API_KEY,
        html: invoiceHTML,
        format: 'A4',
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0
      })
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('html2pdf.app error:', errorText);
      return res.status(502).json({ success: false, error: 'PDF generation failed' });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // 7. Send PDF to Telegram via sendDocument
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', new Blob([pdfBuffer], { type: 'application/pdf' }), `Nakladnaya_${invoiceNumber}.pdf`);
    formData.append('caption', `📄 Накладная № ${invoiceNumber}\n${customRestaurantName || orgName}`);

    const telegramResponse = await fetch(`${TELEGRAM_API_URL}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    const telegramResult = await telegramResponse.json();

    if (!telegramResult.ok) {
      console.error('Telegram sendDocument error:', telegramResult);
      return res.status(502).json({ success: false, error: 'Failed to send to Telegram', details: telegramResult.description });
    }

    res.json({ success: true, message: 'Invoice sent to Telegram successfully' });

  } catch (error) {
    console.error('Error in send-invoice-telegram:', error);
    res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}

function buildInvoiceHTML({ invoiceNumber, senderCompany, customRestaurantName, orgName, dateCreated, products }) {
  const totalAmount = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  const senderName = senderCompany === 'White Ray' ? '"WHITE RAY" MCHJ' : '"PURE PACK" MCHJ';
  const orgNameToDisplay = orgName || customRestaurantName;

  const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
  let currentDate;
  if (dateCreated) {
    const d = new Date(dateCreated);
    currentDate = `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  } else {
    const d = new Date();
    currentDate = `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  }

  const productRowsHtml = products.map((product, index) => {
    const productDescription = `( В ${product.packageType} упаковках ${product.gramm} гр )`;
    const productTotal = product.quantity * product.price;
    return `
      <tr class="table-row">
        <td class="col-number">${index + 1}.</td>
        <td class="col-name">
          <div class="product-name">${product.productName}</div>
          <div class="product-description">${productDescription}</div>
        </td>
        <td class="col-unit">шт</td>
        <td class="col-quantity">${product.quantity.toLocaleString('ru-RU')}</td>
        <td class="col-price">${product.price} сум</td>
        <td class="col-total">${productTotal.toLocaleString('ru-RU')} сум</td>
      </tr>
    `;
  }).join('');

  const showRestaurant = orgNameToDisplay !== customRestaurantName && customRestaurantName;
  const restaurantLine = showRestaurant ? `<div class="restaurant-name">( ${customRestaurantName} )</div>` : '';

  const invoiceCopy = `
    <div class="invoice-container">
      <div class="header-section">
        <img src="https://whiteray.uz/images/whiteray_1200px_logo_green.png" alt="WhiteRay Logo" class="logo">
        <div class="date-section">
          <div class="date-label">Дата</div>
          <div class="date-value">${currentDate}</div>
        </div>
      </div>
      <div class="invoice-title">
        <span style="font-weight: 700;">YUK XATI /</span>
        <span style="font-weight: 700;">НАКЛАДНАЯ</span>
        <span class="invoice-number">№ ${invoiceNumber}</span>
      </div>
      <div class="sender-recipient-section">
        <div class="sender-recipient-content">
          <div class="info-block">
            <div class="info-label">Kimdan / От кого</div>
            <div class="info-value">${senderName}</div>
          </div>
          <div class="info-block">
            <div class="info-label">Kimga / Кому</div>
            <div class="info-value">${orgNameToDisplay}</div>
            ${restaurantLine}
          </div>
        </div>
      </div>
      <div class="table-section">
        <table class="products-table">
          <thead>
            <tr class="table-header">
              <th class="col-number">#</th>
              <th class="col-name">Nomi<span class="sub-label">Наименование</span></th>
              <th class="col-unit">O'lchov bir.<span class="sub-label">Ед.изм</span></th>
              <th class="col-quantity">Soni<span class="sub-label">Кол-во</span></th>
              <th class="col-price">Narxi<span class="sub-label">Цена</span></th>
              <th class="col-total">Summasi<span class="sub-label">Сумма</span></th>
            </tr>
          </thead>
          <tbody>
            ${productRowsHtml}
          </tbody>
        </table>
        <div class="total-section">
          <div class="total-box">
            <div class="total-label">Итого</div>
            <div class="total-amount">${totalAmount.toLocaleString('ru-RU')} сум</div>
          </div>
        </div>
      </div>
      <div class="signatures-section">
        <div class="signature-block">
          <div class="signature-label">Berdim / Отпустил</div>
          <div class="signature-line">__________________</div>
        </div>
        <div class="signature-block">
          <div class="signature-label">Oldim / Получил</div>
          <div class="signature-line">__________________</div>
        </div>
      </div>
      <div class="credits">By D&A</div>
      <div class="footer">
        <div class="footer-left">
          <img src="https://whiteray.uz/images/favicon.png" alt="Logo" class="footer-logo">
          <div class="footer-text">www.whiteray.uz</div>
        </div>
        <div class="footer-text">+998 97 716 61 33</div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Накладная № ${invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background-color: white; color: #000; line-height: 1.4; }
    .page-container { width: 210mm; height: 297mm; margin: 0 auto; background: white; position: relative; display: flex; flex-direction: column; }
    .invoice-container { width: 210mm; height: 148.5mm; position: relative; border-bottom: 2px dashed #888888; padding: 3mm; box-sizing: border-box; flex: 1; }
    .invoice-container:last-child { border-bottom: none; }
    .header-section { padding: 15px 12px 12px 20px; position: relative; display: flex; justify-content: space-between; align-items: flex-start; }
    .logo { width: 84px; height: 22px; }
    .date-section { width: 70px; margin-right: 40px; text-align: right; }
    .date-label { font-size: 11px; font-weight: 500; color: #949494; margin-bottom: 2px; letter-spacing: -0.09px; }
    .date-value { font-size: 12.1px; font-weight: 600; color: #28352f; letter-spacing: -0.1px; white-space: nowrap; }
    .invoice-title { text-align: center; margin-top: 15px; margin-bottom: 12px; font-size: 15.4px; font-weight: 700; color: black; letter-spacing: -0.12px; }
    .invoice-number { font-weight: 600; margin-left: 6px; }
    .sender-recipient-section { background-color: #eeeeee; padding: 8px 15px 10px 15px; margin: 0; }
    .sender-recipient-content { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
    .info-block { width: 45%; }
    .info-label { font-size: 11px; font-weight: 500; color: #5c5c5c; margin-bottom: 2px; letter-spacing: -0.09px; }
    .info-value { font-size: 12.1px; font-weight: 700; color: #000; letter-spacing: -0.1px; }
    .restaurant-name { font-size: 11px; font-weight: 500; color: #000; letter-spacing: -0.09px; margin-top: 1px; }
    .table-section { padding: 0 12px; margin-top: 12px; }
    .products-table { width: 100%; border-collapse: collapse; border: 1px solid #888888; }
    .table-header { background-color: #f8f8f8; height: 32px; border-bottom: 1px solid black; }
    .table-header th { padding: 4px 6px; text-align: left; vertical-align: top; font-size: 11px; font-weight: 700; color: black; letter-spacing: -0.08px; border-right: 1px solid #888888; }
    .table-header th:last-child { border-right: none; }
    .table-header .sub-label { font-size: 9.9px; color: #666666; letter-spacing: -0.07px; margin-top: 1px; display: block; font-weight: 500; }
    .col-number { width: 25px; text-align: center; }
    .col-name { width: 45%; }
    .col-unit { width: 35px; }
    .col-quantity { width: 40px; text-align: center; }
    .col-price { width: 50px; text-align: center; }
    .col-total { width: 60px; text-align: right; }
    .table-row { height: 30px; border-bottom: 0.5px solid #d2d2d2; }
    .table-row td { padding: 4px 6px; vertical-align: center; font-size: 11px; font-weight: 500; color: #212121; letter-spacing: -0.08px; border-right: 1px solid #d2d2d2; }
    .table-row td:last-child { border-right: none; }
    .product-name { font-weight: 700; color: black; margin-bottom: 1px; font-size: 11px; }
    .product-description { color: #2d2d2d; font-weight: 500; font-size: 9.9px; }
    .total-section { margin-top: 10px; display: flex; justify-content: flex-end; padding-right: 12px; }
    .total-box { background-color: #f8f8f8; border: 1px solid #888888; border-radius: 3px; padding: 5px 8px 6px 8px; width: 125px; }
    .total-label { font-size: 11px; font-weight: 500; color: #484848; margin-bottom: 1px; letter-spacing: -0.08px; }
    .total-amount { font-size: 13.2px; font-weight: 700; color: black; letter-spacing: -0.1px; }
    .signatures-section { margin-top: 15px; padding: 0 20px; display: flex; justify-content: space-between; }
    .signature-block { width: 45%; }
    .signature-label { font-size: 11px; font-weight: 500; color: #282828; margin-bottom: 2px; letter-spacing: -0.09px; }
    .signature-line { font-size: 12.1px; font-weight: 700; color: #000; letter-spacing: -0.1px; }
    .credits { position: absolute; bottom: 38px; left: 50%; transform: translateX(-50%); font-size: 8.8px; font-weight: 500; color: #8d8d8d; letter-spacing: -0.08px; }
    .footer { position: absolute; bottom: 7px; left: 0; right: 0; height: 31px; background-color: #d6eae6; display: flex; align-items: center; justify-content: space-between; padding: 0 25px; }
    .footer-logo { width: 18px; height: 18px; border-radius: 50%; }
    .footer-text { font-size: 12.1px; font-weight: 500; color: #303030; letter-spacing: -0.08px; }
    .footer-left { display: flex; align-items: center; gap: 5px; }
  </style>
</head>
<body>
  <div class="page-container">
    ${invoiceCopy}
    ${invoiceCopy}
  </div>
</body>
</html>`;
}
