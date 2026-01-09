// api/generate-proposal-v2.js - PDF Generation API (Version 2 - Clean)
const fs = require('fs');
const path = require('path');
const config = require('./proposal-config');

// Lazy-load Puppeteer dependencies
let puppeteer;
let chromium;

// Helper functions
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

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

function calculateProduct(product) {
  const batchCost = product.pricePerUnit * product.minBatch;
  const clicheCost = product.clicheColors * product.clichePricePerColor;
  return { batchCost, clicheCost, total: batchCost + clicheCost };
}

function generateHTML(clientName) {
  const templatePath = path.join(__dirname, 'templates', 'commercial-proposal.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const product1Calc = calculateProduct(config.product1);
  const product2Calc = calculateProduct(config.product2);
  const today = new Date();

  const replacements = {
    '{{CLIENT_NAME}}': clientName.toUpperCase(),
    '{{PROPOSAL_DATE}}': formatDate(today),
    '{{COMPANY_WEBSITE}}': config.company.website,
    '{{COMPANY_PHONE}}': config.company.phone,
    '{{COMPANY_ADDRESS}}': config.company.address,
    '{{P1_NAME}}': config.product1.name,
    '{{P1_DESC}}': config.product1.description,
    '{{P1_PRICE}}': formatNumber(config.product1.pricePerUnit) + ' сум',
    '{{P1_FORMAT}}': config.product1.format,
    '{{P1_MINBATCH}}': formatNumber(config.product1.minBatch) + ' шт',
    '{{P1_BATCHCOST}}': formatNumber(product1Calc.batchCost) + ' сум',
    '{{P1_CLICHE_COLORS}}': config.product1.clicheColors + ' цвет',
    '{{P1_CLICHE_PRICE}}': formatNumber(config.product1.clichePricePerColor) + ' сум',
    '{{P1_TOTAL}}': formatNumber(product1Calc.batchCost) + ' UZS',
    '{{P2_NAME}}': config.product2.name,
    '{{P2_DESC}}': config.product2.description,
    '{{P2_PRICE}}': formatNumber(config.product2.pricePerUnit) + ' сум',
    '{{P2_FORMAT}}': config.product2.format,
    '{{P2_MINBATCH}}': formatNumber(config.product2.minBatch) + ' шт',
    '{{P2_BATCHCOST}}': formatNumber(product2Calc.batchCost) + ' сум',
    '{{P2_CLICHE_COLORS}}': config.product2.clicheColors + ' цвета',
    '{{P2_CLICHE_PRICE}}': formatNumber(config.product2.clichePricePerColor) + ' сум',
    '{{P2_TOTAL}}': formatNumber(product2Calc.batchCost) + ' UZS',
    '{{CLICHE_INFO_PRICE}}': formatNumber(config.product1.clichePricePerColor) + ' сум'
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(placeholder, 'g'), value);
  }

  return html;
}

async function generatePDF(clientName) {
  if (!puppeteer) {
    puppeteer = require('puppeteer-core');
    chromium = require('@sparticuz/chromium');
  }

  const htmlContent = generateHTML(clientName);

  const browser = await puppeteer.launch({
    args: [...chromium.args, '--disable-gpu', '--single-process'],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    timeout: 30000,
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });

  await browser.close();
  return pdfBuffer;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientName } = req.body;

    if (!clientName || typeof clientName !== 'string' || clientName.trim() === '') {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const pdfBuffer = await generatePDF(clientName.trim());

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="WhiteRay-${clientName.trim().replace(/\s+/g, '-')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: 'PDF generation failed',
      message: error.message,
      stack: error.stack ? error.stack.substring(0, 500) : 'N/A'
    });
  }
}
