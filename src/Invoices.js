import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  CircularProgress,
  Link,
  IconButton,
  Snackbar,
  Alert,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment
} from '@mui/material';
import { ArrowBack, Receipt, Download, Print, Search } from '@mui/icons-material';
import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore';
import BorderColorRoundedIcon from '@mui/icons-material/BorderColorRounded';

const Invoices = ({ onNavigateToWelcome, currentUser }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedInvoiceUrl, setGeneratedInvoiceUrl] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [senderCompany, setSenderCompany] = useState('White Ray');
  const [searchQuery, setSearchQuery] = useState("");
const [customRestaurantName, setCustomRestaurantName] = useState('');
const [isEditingRestaurant, setIsEditingRestaurant] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

    const filteredClients = clients.filter(client =>
    client.displayRestaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.displayOrgName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  // Fetch clients data on component mount
  useEffect(() => {
    fetchClientsData();
  }, []);

  const fetchClientsData = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "clients"));
      
      
      const clientsArray = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          try {
            const data = docSnap.data();
            if (!data) return null;

            // Fetch product name
            let productName = '';
            if (data.productID_2) {
              try {
                const productRef = doc(db, "products", data.productID_2);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                  productName = productSnap.data().productName || '';
                }
              } catch (error) {
                console.error("Error fetching product name:", error);
              }
            }

            // Fetch package type
            let packageType = '';
            if (data.packageID) {
              try {
                const packageRef = doc(db, "packageTypes", data.packageID);
                const packageSnap = await getDoc(packageRef);
                if (packageSnap.exists()) {
                  packageType = packageSnap.data().type || '';
                }
              } catch (error) {
                console.error("Error fetching package type:", error);
              }
            }

            // Get gramm value (try multiple sources)
            let grammValue = '';
            if (data.designType === "unique" && data.gramm) {
              grammValue = data.gramm;
            } else if (data.productID_2 || data.packageID) {
              // Try to get from productTypes
              try {
                const productTypesQuery = await getDocs(collection(db, "productTypes"));
                for (const ptDoc of productTypesQuery.docs) {
                  const ptData = ptDoc.data();
                  const matchesProduct = !data.productID_2 || ptData.productID_2 === data.productID_2;
                  const matchesPackage = !data.packageID || ptData.packageID === data.packageID;
                  
                  if (matchesProduct && matchesPackage && ptData.gramm) {
                    grammValue = ptData.gramm;
                    break;
                  }
                }
              } catch (error) {
                console.error("Error fetching gramm from productTypes:", error);
              }
            }

            return {
              id: docSnap.id,
              ...data,
              fetchedProductName: productName,
              fetchedPackageType: packageType,
              fetchedGramm: grammValue,
              displayOrgName: data.orgName && data.orgName !== '-' ? data.orgName : (data.name || data.restaurant || ''),
              displayRestaurantName: data.name || data.restaurant || ''
            };
          } catch (error) {
            console.error("Error processing client document:", docSnap.id, error);
            return null;
          }
        })
      );
      

      const validClients = clientsArray.filter(client => 
        client !== null && 
        client.fetchedProductName && 
        client.fetchedPackageType
      );
      
      setClients(validClients);
     



    } catch (error) {
      console.error("Error fetching clients data:", error);
      setSnackbar({
        open: true,
        message: 'Ошибка при загрузке данных клиентов',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate random invoice number with date
  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    return `${year}${month}${day}${random}`;
  };

  // Generate invoice HTML
  const generateInvoiceHTML = (client, quantity, price, invoiceNumber, senderCompany) => {
    const totalAmount = quantity * price;
    const senderName = senderCompany === 'White Ray' ? '"WHITE RAY" MCHJ' : '"PURE PACK" MCHJ';
    
    // Manual date formatting to avoid date-fns conflicts
    const now = new Date();
    const months = [
      'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
      'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
    ];
    const currentDate = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}`;

    // Format product description
    const productDescription = `( В ${client.fetchedPackageType} упаковках ${client.fetchedGramm} гр )`;


    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Накладная № ${invoiceNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: white;
            color: #000;
            line-height: 1.52;
        }
        
        .page-container {
            width: 297mm;
            height: 210mm;
            margin: 0 auto;
            background: white;
            position: relative;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            display: flex;
        }
        
        @media print {
            .page-container {
                box-shadow: none;
                margin: 0;
            }
            
            @page {
                size: A4 landscape;
                margin: 2;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
     .invoice-container {
    width: 148.5mm;
    height: 210mm;
    position: relative;
    border-right: 1px dashed #ccc;
    padding: 4mm; /* ✅ safe area padding inside invoice */
    box-sizing: border-box; /* ✅ ensures content shrinks, doesn’t overflow */
}

        
        .invoice-container:last-child {
            border-right: none;
        }
        
        .header-section {
            padding: 25px 15px 20px 15px;
            position: relative;
        }
        
        .logo {
            width: 80px;
            height: 20px;
        }
        
        .date-section {
            position: absolute;
            top: 20px;
            right: 15px;
            width: 80px;
        }
        
        .date-label {
            font-size: 9px;
            font-weight: 500;
            color: #949494;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
       .date-value {
    font-size: 10px;
    font-weight: 600;
    color: #28352f;
    letter-spacing: -0.1px;
    white-space: nowrap; /* ✅ Prevent year from jumping to new line */
}
        
        .invoice-title {
            text-align: center;
            margin-top: 25px;
            font-size: 12px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.12px;
        }
        
        .invoice-number {
            font-weight: 600;
            margin-left: 6px;
        }
        
        .sender-recipient-section {
            background-color: #eeeeee;
            padding: 10px 20px 12px 20px;
            margin: 0;
        }
        
        .sender-recipient-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            width: 100%;
        }
        
        .info-block {
            width: 45%;
        }
        
        .info-label {
            font-size: 9px;
            font-weight: 500;
            color: #5c5c5c;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
        .info-value {
            font-size: 10px;
            font-weight: 700;
            color: #000;
            letter-spacing: -0.1px;
        }
        
        .restaurant-name {
            font-size: 9px;
            font-weight: 500;
            color: #000;
            letter-spacing: -0.09px;
            margin-top: 1px;
        }
        
        .table-section {
            padding: 0 18px;
            margin-top: 20px;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table-header {
            background-color: #f8f8f8;
            height: 30px;
            border-bottom: 1px solid black;
        }
        
        .table-header th {
            padding: 3px 6px;
            text-align: left;
            vertical-align: top;
            font-size: 8px;
            font-weight: 500;
            color: black;
            letter-spacing: -0.08px;
        }
        
        .table-header .sub-label {
            font-size: 7px;
            color: grey;
            letter-spacing: -0.07px;
            margin-top: 1px;
            display: block;
        }
        
        .col-number {
            width: 20px;
            text-align: center;
        }
        
        .col-name {
            width: 45%;
        }
        
        .col-unit {
            width: 30px;
        }
        
        .col-quantity {
            width: 35px;
            text-align: center;
        }
        
        .col-price {
            width: 40px;
            text-align: center;
        }
        
        .col-total {
            width: 50px;
            text-align: right;
        }
        
        .table-row {
            height: 35px;
            border-bottom: 0.5px solid #d2d2d2;
        }
        
        .table-row td {
            padding: 6px;
            vertical-align: center;
            font-size: 8px;
            font-weight: 500;
            color: #212121;
            letter-spacing: -0.08px;
        }
        
        .product-name {
            font-weight: 700;
            color: black;
            margin-bottom: 1px;
        }
        
        .product-description {
            color: #2d2d2d;
            font-weight: 500;
            font-size: 7px;
        }
        
        .total-section {
            margin-top: 15px;
            display: flex;
            justify-content: flex-end;
            padding-right: 18px;
        }
        
        .total-box {
            background-color: #f8f8f8;
            border: 1px solid rgba(172,172,172,0.21);
            border-radius: 3px;
            padding: 4px 6px 6px 6px;
            width: 100px;
        }
        
        .total-label {
            font-size: 8px;
            font-weight: 500;
            color: #484848;
            margin-bottom: 1px;
            letter-spacing: -0.08px;
        }
        
        .total-amount {
            font-size: 10px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.1px;
        }
        
        .signatures-section {
            margin-top: 40px;
            padding: 0 25px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-block {
            width: 45%;
        }
        
        .signature-label {
            font-size: 9px;
            font-weight: 500;
            color: #282828;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
        .signature-line {
            font-size: 10px;
            font-weight: 700;
            color: #000;
            letter-spacing: -0.1px;
        }
        
        .credits {
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8px;
            font-weight: 500;
            color: #8d8d8d;
            letter-spacing: -0.08px;
        }
        
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 30px;
            background-color: #d6eae6;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 35px;
        }
        
        .footer-logo {
            width: 18px;
            height: 18px;
            border-radius: 50%;
        }
        
        .footer-text {
            font-size: 8px;
            font-weight: 500;
            color: #303030;
            letter-spacing: -0.08px;
        }
        
        .footer-left {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .print-section {
            text-align: center;
            margin: 20px 0;
            padding: 20px;
            background: #f5f5f5;
        }

        .print-button {
            background-color: #148274;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .print-button:hover {
            background-color: #0c6b5e;
        }

        @media print {
            .print-section {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="print-section">
        <button class="print-button" onclick="window.print()">
            🖨️ Печать накладной
        </button>
    </div>

    <div class="page-container">
        <!-- First Invoice Copy -->
        <div class="invoice-container">
            <!-- Header Section -->
            <div class="header-section">
                <img src="https://whiteray.uz/images/whiteray_1200px_logo_green.png" alt="WhiteRay Logo" class="logo">
                
                <div class="date-section">
                    <div class="date-label">Дата</div>
                    <div class="date-value">${currentDate}</div>
                </div>
                
                <div class="invoice-title">
                    <span style="font-weight: 700;">YUK XATI /</span>
                    <span style="font-weight: 700;">НАКЛАДНАЯ</span>
                    <span class="invoice-number">№ ${invoiceNumber}</span>
                </div>
            </div>
            
            <!-- Sender/Recipient Section -->
            <div class="sender-recipient-section">
                <div class="sender-recipient-content">
                    <div class="info-block">
                        <div class="info-label">От кого / Kimdan</div>
                        <div class="info-value">${senderName}</div>
                    </div>
                <div class="info-block">
  <div class="info-label">Кому / Kimga</div>
  <div class="info-value">${client.displayOrgName}</div>
  ${
    client.displayOrgName !== (customRestaurantName || client.displayRestaurantName)
      ? `<div class="restaurant-name">( ${customRestaurantName || client.displayRestaurantName} )</div>`
      : ''
  }
</div>
                </div>
            </div>
            
            <!-- Table Section -->
            <div class="table-section">
                <table class="products-table">
                    <thead>
                        <tr class="table-header">
                            <th class="col-number">#</th>
                            <th class="col-name">
                                Наименование
                                <span class="sub-label">Nomi</span>
                            </th>
                            <th class="col-unit">
                                Ед.изм
                                <span class="sub-label">Ulchov bir.</span>
                            </th>
                            <th class="col-quantity">
                                Кол-во
                                <span class="sub-label">Soni</span>
                            </th>
                            <th class="col-price">
                                Цена
                                <span class="sub-label">Narxi</span>
                            </th>
                            <th class="col-total">
                                Сумма
                                <span class="sub-label">Summasi</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="table-row">
                            <td class="col-number">1.</td>
                            <td class="col-name">
                                <div class="product-name">${client.fetchedProductName}</div>
                                <div class="product-description">${productDescription}</div>
                            </td>
                            <td class="col-unit">шт</td>
                            <td class="col-quantity">${quantity.toLocaleString('ru-RU')}</td>
                            <td class="col-price">${price} сум</td>
                            <td class="col-total">${totalAmount.toLocaleString('ru-RU')} сум</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div class="total-box">
                        <div class="total-label">Итого</div>
                        <div class="total-amount">${totalAmount.toLocaleString('ru-RU')} сум</div>
                    </div>
                </div>
            </div>
            
            <!-- Signatures Section -->
            <div class="signatures-section">
                <div class="signature-block">
                    <div class="signature-label">Отпустил / Berdim</div>
                    <div class="signature-line">__________________</div>
                </div>
                <div class="signature-block">
                    <div class="signature-label">Получил / Oldim</div>
                    <div class="signature-line">__________________</div>
                </div>
            </div>
            
            <!-- Credits -->
            <div class="credits">By D&A</div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="footer-left">
                    <img src="https://whiteray.uz/images/favicon.png" alt="Logo" class="footer-logo">
                    <div class="footer-text">www.whiteray.uz</div>
                </div>
                <div class="footer-text">+998 97 716 61 33</div>
            </div>
        </div>

        <!-- Second Invoice Copy -->
        <div class="invoice-container">
            <!-- Header Section -->
            <div class="header-section">
                <img src="https://whiteray.uz/images/whiteray_1200px_logo_green.png" alt="WhiteRay Logo" class="logo">
                
                <div class="date-section">
                    <div class="date-label">Дата</div>
                    <div class="date-value">${currentDate}</div>
                </div>
                
                <div class="invoice-title">
                    <span style="font-weight: 700;">YUK XATI /</span>
                    <span style="font-weight: 700;">НАКЛАДНАЯ</span>
                    <span class="invoice-number">№ ${invoiceNumber}</span>
                </div>
            </div>
            
            <!-- Sender/Recipient Section -->
            <div class="sender-recipient-section">
                <div class="sender-recipient-content">
                    <div class="info-block">
                        <div class="info-label">От кого / Kimdan</div>
                        <div class="info-value">${senderName}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-label">Кому / Kimga</div>
                        <div class="info-value">${client.displayOrgName}</div>
                        ${client.displayOrgName !== client.displayRestaurantName ? 
                          `<div class="restaurant-name">( ${client.displayRestaurantName} )</div>` : 
                          ''
                        }
                    </div>
                </div>
            </div>
            
            <!-- Table Section -->
            <div class="table-section">
                <table class="products-table">
                    <thead>
                        <tr class="table-header">
                            <th class="col-number">#</th>
                            <th class="col-name">
                                Наименование
                                <span class="sub-label">Nomi</span>
                            </th>
                            <th class="col-unit">
                                Ед.изм
                                <span class="sub-label">Ulchov bir.</span>
                            </th>
                            <th class="col-quantity">
                                Кол-во
                                <span class="sub-label">Soni</span>
                            </th>
                            <th class="col-price">
                                Цена
                                <span class="sub-label">Narxi</span>
                            </th>
                            <th class="col-total">
                                Сумма
                                <span class="sub-label">Summasi</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="table-row">
                            <td class="col-number">1.</td>
                            <td class="col-name">
                                <div class="product-name">${client.fetchedProductName}</div>
                                <div class="product-description">${productDescription}</div>
                            </td>
                            <td class="col-unit">шт</td>
                            <td class="col-quantity">${quantity.toLocaleString('ru-RU')}</td>
                            <td class="col-price">${price} сум</td>
                            <td class="col-total">${totalAmount.toLocaleString('ru-RU')} сум</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="total-section">
                    <div class="total-box">
                        <div class="total-label">Итого</div>
                        <div class="total-amount">${totalAmount.toLocaleString('ru-RU')} сум</div>
                    </div>
                </div>
            </div>
            
            <!-- Signatures Section -->
            <div class="signatures-section">
                <div class="signature-block">
                    <div class="signature-label">Отпустил / Berdim</div>
                    <div class="signature-line">__________________</div>
                </div>
                <div class="signature-block">
                    <div class="signature-label">Получил / Oldim</div>
                    <div class="signature-line">__________________</div>
                </div>
            </div>
            
            <!-- Credits -->
            <div class="credits">By D&A</div>
            
            <!-- Footer -->
            <div class="footer">
                <div class="footer-left">
                    <img src="https://whiteray.uz/images/favicon.png" alt="Logo" class="footer-logo">
                    <div class="footer-text">www.whiteray.uz</div>
                </div>
                <div class="footer-text">+998 97 716 61 33</div>
            </div>
        </div>
    </div>
</body>
</html>`;

    return htmlTemplate;
  };

  // Handle creating invoice
  const handleCreateInvoice = async () => {
    if (!quantity || !price || !selectedClient) {
      setSnackbar({
        open: true,
        message: 'Пожалуйста, заполните все поля',
        severity: 'warning'
      });
      return;
    }

    const quantityNum = parseFloat(quantity);
    const priceNum = parseFloat(price);

    if (isNaN(quantityNum) || isNaN(priceNum) || quantityNum <= 0 || priceNum <= 0) {
      setSnackbar({
        open: true,
        message: 'Пожалуйста, введите корректные числовые значения',
        severity: 'warning'
      });
      return;
    }

    setGenerating(true);

    try {
      // Generate invoice number
      const newInvoiceNumber = generateInvoiceNumber();
      setInvoiceNumber(newInvoiceNumber);

      // Generate HTML content
      const htmlContent = generateInvoiceHTML(selectedClient, quantityNum, priceNum, newInvoiceNumber, senderCompany);

      // Create blob URL
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setGeneratedInvoiceUrl(url);

      // Save invoice record to Firestore
      const invoiceData = {
        dateCreated: Timestamp.now(),
        quantity: quantityNum,
        price: priceNum,
        totalPrice: quantityNum * priceNum,
        productID_2: selectedClient.productID_2,
        packageID: selectedClient.packageID,
        invoiceNumber: newInvoiceNumber,
        userID: currentUser?.uid || 'unknown',
        userName: currentUser?.name || 'Unknown User',
        senderCompany: senderCompany
      };

      await addDoc(collection(db, `clients/${selectedClient.id}/invoices`), invoiceData);

      setSnackbar({
        open: true,
        message: 'Накладная успешно создана!',
        severity: 'success'
      });

    } catch (error) {
      console.error('Error creating invoice:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при создании накладной',
        severity: 'error'
      });
    } finally {
      setGenerating(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!generatedInvoiceUrl || !selectedClient || !invoiceNumber) return;

    const link = document.createElement('a');
    link.href = generatedInvoiceUrl;
    link.download = `Накладная_${selectedClient.displayRestaurantName}_${invoiceNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedClient(null);
    setQuantity('');
    setPrice('');
    setGeneratedInvoiceUrl('');
    setInvoiceNumber('');
    setSenderCompany('White Ray');
  };

  // Handle opening modal
  const handleOpenModal = (client) => {
    setSelectedClient(client);
     setCustomRestaurantName(client.displayRestaurantName || ""); // prefill with DB value
  setIsEditingRestaurant(false); // start in read-only
    setModalOpen(true);
  };

  // Handle sender company change
  const handleSenderCompanyChange = (event, newCompany) => {
    if (newCompany !== null) {
      setSenderCompany(newCompany);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={onNavigateToWelcome} color="primary">
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" color="primary">
          Генератор накладных
        </Typography>
      </Box>

      {/* Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <Receipt color="primary" />
            <Box>
              <Typography variant="h6">
                Создание накладных для клиентов
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Выберите клиента из списка и создайте накладную с указанием количества и цены
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
{/* Search Input */}
<Box mb={2}>
  <TextField
    fullWidth
    variant="outlined"
    placeholder="Поиск по ресторану или организации..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <Search />
        </InputAdornment>
      )
    }}
  />
</Box>
      {/* Clients Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
        <TableHead>
  <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
      Ресторан
    </TableCell>
    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
      Организация
    </TableCell>
    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
      Продукт
    </TableCell>
    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
      Граммаж
    </TableCell>
    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
      Тип упаковки
    </TableCell>
    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
      Действия
    </TableCell>
  </TableRow>
</TableHead>
     <TableBody>
  {filteredClients.map((client) => (
    <TableRow
      key={client.id}
      sx={{
        '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
        '&:hover': { backgroundColor: '#e3f2fd' }
      }}
    >
      <TableCell sx={{ fontWeight: 600 }}>
        {client.displayRestaurantName}
      </TableCell>
      <TableCell>{client.displayOrgName}</TableCell>
      <TableCell>{client.fetchedProductName}</TableCell>
      <TableCell>{client.fetchedGramm} гр</TableCell>
      <TableCell>{client.fetchedPackageType}</TableCell>
      <TableCell>
        <Button
          variant="contained"
          startIcon={<Receipt />}
          sx={{
            backgroundColor: '#0F9D8C',
            '&:hover': { backgroundColor: '#0c7a6e' }
          }}
          onClick={() => handleOpenModal(client)}
        >
          Создать накладную
        </Button>
      </TableCell>
    </TableRow>
  ))}
</TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Invoice Creation Modal */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          Создание накладной
          {selectedClient && (
            <Typography variant="subtitle2" color="text.secondary">
              {selectedClient.displayOrgName} - {selectedClient.displayRestaurantName}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedClient && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Продукт:</strong> {selectedClient.fetchedProductName}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Упаковка:</strong> {selectedClient.fetchedPackageType} ({selectedClient.fetchedGramm} гр)
              </Typography>
              {/* Restaurant Name (editable) */}
<Box sx={{ mb: 2 }}>
  <TextField
    label="Ресторан"
    fullWidth
    value={customRestaurantName}
    onChange={(e) => setCustomRestaurantName(e.target.value)}
  />
</Box>

              {/* Sender Company Selection */}
             <Box sx={{ mt: 2, mb: 2 }}>
  <Typography variant="body2" gutterBottom>
    <strong>От имени компании:</strong>
  </Typography>
  <ToggleButtonGroup
    value={senderCompany}
    exclusive
    onChange={handleSenderCompanyChange}
    aria-label="sender company"
  >
    <ToggleButton
      value="White Ray"
      aria-label="white ray"
      sx={{
        "&.Mui-selected": {
          backgroundColor: "#b2ded9",
          color: "#025249",
          "&:hover": {
            backgroundColor: "#a0d3cd"
          }
        }
      }}
    >
      White Ray
    </ToggleButton>
    <ToggleButton
      value="Pure Pack"
      aria-label="pure pack"
      sx={{
        "&.Mui-selected": {
          backgroundColor: "#b2ded9",
          color: "#025249",
          "&:hover": {
            backgroundColor: "#a0d3cd"
          }
        }
      }}
    >
      Pure Pack
    </ToggleButton>
  </ToggleButtonGroup>
</Box>

              
              <TextField
                fullWidth
                label="Количество"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                sx={{ mb: 2 }}
                inputProps={{ min: 1, step: 1 }}
              />
              
              <TextField
                fullWidth
                label="Цена за единицу (сум)"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                sx={{ mb: 2 }}
                inputProps={{ min: 0, step: 0.01 }}
              />

              {quantity && price && (
                <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                  Общая сумма: {(parseFloat(quantity) * parseFloat(price)).toLocaleString('ru-RU')} сум
                </Typography>
              )}

              {generatedInvoiceUrl && (
                <Box sx={{ mt: 3, p: 2, backgroundColor: '#f0f8ff', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    ✅ Накладная создана успешно!
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Link
                      href={generatedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ textDecoration: 'none' }}
                    >
                      <Button
                        variant="outlined"
                        startIcon={<Print />}
                        color="primary"
                      >
                        Открыть накладную
                      </Button>
                    </Link>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      onClick={handleDownload}
                      sx={{
                        backgroundColor: '#0F9D8C',
                        '&:hover': { backgroundColor: '#0c7a6e' }
                      }}
                    >
                      Скачать HTML
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit">
            Отмена
          </Button>
          <Button
            onClick={handleCreateInvoice}
            variant="contained"
            disabled={generating || !quantity || !price}
            sx={{
              backgroundColor: '#0F9D8C',
              '&:hover': { backgroundColor: '#0c7a6e' }
            }}
          >
            {generating ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Создать накладную'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Invoices;