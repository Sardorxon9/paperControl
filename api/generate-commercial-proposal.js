// api/generate-commercial-proposal.js - PDF Generation API
const fs = require('fs');
const path = require('path');
const config = require('./proposal-config');

// Lazy-load Puppeteer dependencies (only when needed)
let puppeteer;
let chromium;

// Helper function to format numbers with spaces
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Helper function to format date in Russian
function formatDate(date) {
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month}, ${year}`;
}

// Calculate product costs
function calculateProduct(product) {
  const batchCost = product.pricePerUnit * product.minBatch;
  const clicheCost = product.clicheColors * product.clichePricePerColor;
  const total = batchCost + clicheCost;

  return {
    batchCost,
    clicheCost,
    total
  };
}

// Generate HTML with replaced placeholders
function generateHTML(clientName) {
  const templatePath = path.join(__dirname, 'templates', 'commercial-proposal.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  // Calculate values
  const product1Calc = calculateProduct(config.product1);
  const product2Calc = calculateProduct(config.product2);
  const today = new Date();

  // Prepare replacements
  const replacements = {
    '{{CLIENT_NAME}}': clientName.toUpperCase(),
    '{{PROPOSAL_DATE}}': formatDate(today),
    '{{COMPANY_WEBSITE}}': config.company.website,
    '{{COMPANY_PHONE}}': config.company.phone,
    '{{COMPANY_ADDRESS}}': config.company.address,

    // Product 1
    '{{P1_NAME}}': config.product1.name,
    '{{P1_DESC}}': config.product1.description,
    '{{P1_PRICE}}': formatNumber(config.product1.pricePerUnit) + ' сум',
    '{{P1_FORMAT}}': config.product1.format,
    '{{P1_MINBATCH}}': formatNumber(config.product1.minBatch) + ' шт',
    '{{P1_BATCHCOST}}': formatNumber(product1Calc.batchCost) + ' сум',
    '{{P1_CLICHE_COLORS}}': config.product1.clicheColors + ' цвет',
    '{{P1_CLICHE_PRICE}}': formatNumber(config.product1.clichePricePerColor) + ' сум',
    '{{P1_TOTAL}}': formatNumber(product1Calc.batchCost) + ' UZS',

    // Product 2
    '{{P2_NAME}}': config.product2.name,
    '{{P2_DESC}}': config.product2.description,
    '{{P2_PRICE}}': formatNumber(config.product2.pricePerUnit) + ' сум',
    '{{P2_FORMAT}}': config.product2.format,
    '{{P2_MINBATCH}}': formatNumber(config.product2.minBatch) + ' шт',
    '{{P2_BATCHCOST}}': formatNumber(product2Calc.batchCost) + ' сум',
    '{{P2_CLICHE_COLORS}}': config.product2.clicheColors + ' цвета',
    '{{P2_CLICHE_PRICE}}': formatNumber(config.product2.clichePricePerColor) + ' сум',
    '{{P2_TOTAL}}': formatNumber(product2Calc.batchCost) + ' UZS',

    // Cliche info
    '{{CLICHE_INFO_PRICE}}': formatNumber(config.product1.clichePricePerColor) + ' сум'
  };

  // Replace all placeholders
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(placeholder, 'g'), value);
  }

  return html;
}

// Generate PDF using Puppeteer
async function generatePDF(clientName) {
  try {
    console.log('Generating PDF for:', clientName);

    // Lazy-load Puppeteer (only when needed to reduce cold start time)
    if (!puppeteer) {
      console.log('Loading Puppeteer...');
      puppeteer = require('puppeteer-core');
      chromium = require('@sparticuz/chromium');
    }

    // Generate HTML content
    const htmlContent = generateHTML(clientName);

    console.log('Launching browser...');

    // Launch browser with Chromium
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    console.log('Browser launched. Creating page...');
    const page = await browser.newPage();

    // Set content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    console.log('Generating PDF...');

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    });

    console.log('PDF generated successfully. Size:', pdfBuffer.length, 'bytes');

    await browser.close();
    console.log('Browser closed.');

    return pdfBuffer;

  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    throw error;
  }
}

// Vercel API handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({
      success: false,
      error: `Method ${req.method} Not Allowed`
    });
    return;
  }

  try {
    const { clientName } = req.body;

    // Validate input
    if (!clientName || typeof clientName !== 'string' || clientName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Client name is required'
      });
    }

    console.log('Generating commercial proposal for:', clientName);

    // Generate PDF
    const pdfBuffer = await generatePDF(clientName.trim());

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="WhiteRay-Proposal-${clientName.trim().replace(/\s+/g, '-')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('Error in generate-commercial-proposal handler:', error);
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF',
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack ? error.stack.substring(0, 1000) : 'N/A',
      details: error.message
    });
  }
}
