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
  CardContent
} from '@mui/material';
import {
  ArrowBack,
  Receipt,
  Download,
  Print
} from '@mui/icons-material';
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

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
  const generateInvoiceHTML = (client, quantity, price, invoiceNumber) => {
    const totalAmount = quantity * price;
    
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
        
        .invoice-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 0;
            background: white;
            position: relative;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        @media print {
            .invoice-container {
                box-shadow: none;
                margin: 0;
            }
            
            @page {
                size: A4;
                margin: 0;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        .header-section {
            padding: 51px 25px 40px 25px;
            position: relative;
        }
        
        .logo {
            width: 114px;
            height: 28px;
        }
        
        .date-section {
            position: absolute;
            top: 40px;
            right: 25px;
            width: 110px;
        }
        
        .date-label {
            font-size: 11px;
            font-weight: 500;
            color: #949494;
            margin-bottom: 2px;
            letter-spacing: -0.11px;
        }
        
        .date-value {
            font-size: 13px;
            font-weight: 600;
            color: #28352f;
            letter-spacing: -0.13px;
        }
        
        .invoice-title {
            text-align: center;
            margin-top: 45px;
            font-size: 16px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.16px;
        }
        
        .invoice-number {
            font-weight: 600;
            margin-left: 8px;
        }
        
        .sender-recipient-section {
            background-color: #eeeeee;
            padding: 15px 37px 20px 37px;
            margin: 0;
        }
        
        .sender-recipient-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            width: 100%;
            max-width: 472px;
        }
        
        .info-block {
            width: 134px;
        }
        
        .info-label {
            font-size: 12px;
            font-weight: 500;
            color: #5c5c5c;
            margin-bottom: 3px;
            letter-spacing: -0.12px;
        }
        
        .info-value {
            font-size: 13px;
            font-weight: 700;
            color: #000;
            letter-spacing: -0.13px;
        }
        
        .restaurant-name {
            font-size: 12px;
            font-weight: 500;
            color: #000;
            letter-spacing: -0.12px;
            margin-top: 2px;
        }
        
        .table-section {
            padding: 0 30px;
            margin-top: 42px;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table-header {
            background-color: #f8f8f8;
            height: 41px;
            border-bottom: 1px solid black;
        }
        
        .table-header th {
            padding: 4px 8px;
            text-align: left;
            vertical-align: top;
            font-size: 10.5px;
            font-weight: 500;
            color: black;
            letter-spacing: -0.105px;
        }
        
        .table-header .sub-label {
            font-size: 9.5px;
            color: grey;
            letter-spacing: -0.095px;
            margin-top: 2px;
            display: block;
        }
        
        .col-number {
            width: 38px;
            text-align: center;
        }
        
        .col-name {
            width: 174px;
        }
        
        .col-unit {
            width: 60px;
        }
        
        .col-quantity {
            width: 77px;
            text-align: center;
        }
        
        .col-price {
            width: 81px;
            text-align: center;
        }
        
        .col-total {
            width: 106px;
            text-align: right;
        }
        
        .table-row {
            height: 52px;
            border-bottom: 0.95px solid #d2d2d2;
        }
        
        .table-row td {
            padding: 9.5px;
            vertical-align: center;
            font-size: 10.5px;
            font-weight: 500;
            color: #212121;
            letter-spacing: -0.105px;
        }
        
        .product-name {
            font-weight: 700;
            color: black;
            margin-bottom: 2px;
        }
        
        .product-description {
            color: #2d2d2d;
            font-weight: 500;
        }
        
        .total-section {
            margin-top: 35px;
            display: flex;
            justify-content: flex-end;
            padding-right: 30px;
        }
        
        .total-box {
            background-color: #f8f8f8;
            border: 1px solid rgba(172,172,172,0.21);
            border-radius: 5px;
            padding: 6px 9px 10px 9px;
            width: 158px;
        }
        
        .total-label {
            font-size: 11.5px;
            font-weight: 500;
            color: #484848;
            margin-bottom: 1px;
            letter-spacing: -0.115px;
        }
        
        .total-amount {
            font-size: 14px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.14px;
        }
        
        .signatures-section {
            margin-top: 100px;
            padding: 0 45px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-block {
            width: 134px;
        }
        
        .signature-label {
            font-size: 12px;
            font-weight: 500;
            color: #282828;
            margin-bottom: 3px;
            letter-spacing: -0.12px;
        }
        
        .signature-line {
            font-size: 14px;
            font-weight: 700;
            color: #000;
            letter-spacing: -0.14px;
        }
        
        .credits {
            position: absolute;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            font-weight: 500;
            color: #8d8d8d;
            letter-spacing: -0.12px;
        }
        
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 51px;
            background-color: #d6eae6;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 66px;
        }
        
        .footer-logo {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background-color: #148274;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: 600;
        }
        
        .footer-text {
            font-size: 11px;
            font-weight: 500;
            color: #303030;
            letter-spacing: -0.11px;
        }
        
        .footer-left {
            display: flex;
            align-items: center;
            gap: 8px;
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
                    <div class="info-value">"WHITE RAY" MCHJ</div>
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
                <div class="footer-logo">W</div>
                <div class="footer-text">www.whiteray.uz</div>
            </div>
            <div class="footer-text">+998 97 716 61 33</div>
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
      const htmlContent = generateInvoiceHTML(selectedClient, quantityNum, priceNum, newInvoiceNumber);

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
        userName: currentUser?.name || 'Unknown User'
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
  };

  // Handle opening modal
  const handleOpenModal = (client) => {
    setSelectedClient(client);
    setModalOpen(true);
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

      {/* Clients Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Организация
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Ресторан
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
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  sx={{
                    '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                    '&:hover': { backgroundColor: '#e3f2fd' }
                  }}
                >
                  <TableCell>{client.displayOrgName}</TableCell>
                  <TableCell>{client.displayRestaurantName}</TableCell>
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
              
              <TextField
                fullWidth
                label="Количество"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                sx={{ mt: 2, mb: 2 }}
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