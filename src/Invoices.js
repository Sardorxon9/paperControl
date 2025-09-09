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
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import { 
  ArrowBack, 
  Receipt, 
  Download, 
  Print, 
  Search, 
  Add, 
  Delete 
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
import BorderColorRoundedIcon from '@mui/icons-material/BorderColorRounded';
import { NumericFormat } from "react-number-format";

const Invoices = ({ onNavigateToWelcome, currentUser }) => {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [packageTypes, setPackageTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  // New state for multiple products
  const [invoiceProducts, setInvoiceProducts] = useState([
    {
      id: 1,
      isDefault: true,
      productName: '',
      packageType: '',
      gramm: '',
      quantity: '',
      price: ''
    }
  ]);

  const grammOptions = [
    { value: '1', label: '1 гр' },
    { value: '2', label: '2 гр' },
    { value: '3', label: '3 гр' },
    { value: '4', label: '4 гр' },
    { value: '5', label: '5 гр' },
    { value: '6', label: '6 гр' }
  ];

  const filteredClients = clients.filter(client =>
    client.displayRestaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.displayOrgName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch all required data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchClientsData(),
        fetchProducts(),
        fetchPackageTypes()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setSnackbar({
        open: true,
        message: 'Ошибка при загрузке данных',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productsArray = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsArray);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchPackageTypes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "packageTypes"));
      const packageTypesArray = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPackageTypes(packageTypesArray);
    } catch (error) {
      console.error("Error fetching package types:", error);
    }
  };

  const fetchClientsData = async () => {
    try {
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

            // Get gramm value
            let grammValue = '';
            if (data.designType === "unique" && data.gramm) {
              grammValue = data.gramm;
            } else if (data.productID_2 || data.packageID) {
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
    }
  };

  // Generate random invoice number with date
  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    return `${year}${month}${day}${random}`;
  };

  // Add new product row
  const addProductRow = () => {
    const newProduct = {
      id: Date.now(),
      isDefault: false,
      productName: '',
      packageType: '',
      gramm: '',
      quantity: '',
      price: ''
    };
    setInvoiceProducts([...invoiceProducts, newProduct]);
  };

  // Remove product row
  const removeProductRow = (productId) => {
    if (invoiceProducts.length > 1) {
      setInvoiceProducts(invoiceProducts.filter(product => product.id !== productId));
    }
  };

  // Update product field
  const updateProductField = (productId, field, value) => {
    setInvoiceProducts(invoiceProducts.map(product =>
      product.id === productId ? { ...product, [field]: value } : product
    ));
  };

  // Calculate total amount for all products
  const calculateTotalAmount = () => {
    return invoiceProducts.reduce((total, product) => {
      const quantity = parseFloat(product.quantity) || 0;
      const price = parseFloat(product.price) || 0;
      return total + (quantity * price);
    }, 0);
  };

  // Validate all products
  const validateProducts = () => {
    for (const product of invoiceProducts) {
      if (product.isDefault) {
        // For default product, it uses client's existing data
        if (!product.quantity || !product.price) {
          return false;
        }
      } else {
        // For additional products, all fields are required
        if (!product.productName || !product.packageType || !product.gramm || !product.quantity || !product.price) {
          return false;
        }
      }
      
      const quantity = parseFloat(product.quantity);
      const price = parseFloat(product.price);
      if (isNaN(quantity) || isNaN(price) || quantity <= 0 || price <= 0) {
        return false;
      }
    }
    return true;
  };

  // Handle creating invoice
  const handleCreateInvoice = async () => {
    if (!selectedClient || !validateProducts()) {
      setSnackbar({
        open: true,
        message: 'Пожалуйста, заполните все поля',
        severity: 'warning'
      });
      return;
    }

    setGenerating(true);

    try {
      // Generate invoice number
      const newInvoiceNumber = generateInvoiceNumber();
      setInvoiceNumber(newInvoiceNumber);

      // Prepare products data for HTML generation
      const productsForInvoice = invoiceProducts.map(product => {
        if (product.isDefault) {
          return {
            productName: selectedClient.fetchedProductName,
            packageType: selectedClient.fetchedPackageType,
            gramm: selectedClient.fetchedGramm,
            quantity: parseFloat(product.quantity),
            price: parseFloat(product.price)
          };
        } else {
          const selectedProductObj = products.find(p => p.id === product.productName);
          const selectedPackageObj = packageTypes.find(p => p.id === product.packageType);
          
          return {
            productName: selectedProductObj?.productName || '',
            packageType: selectedPackageObj?.type || '',
            gramm: product.gramm,
            quantity: parseFloat(product.quantity),
            price: parseFloat(product.price)
          };
        }
      });

      // Generate HTML content
      const htmlContent = generateInvoiceHTML(
        selectedClient, 
        productsForInvoice, 
        newInvoiceNumber, 
        senderCompany,
        customRestaurantName
      );

      // Create blob URL
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setGeneratedInvoiceUrl(url);

      // Save invoice record to Firestore with multiple products
      const invoiceData = {
        dateCreated: Timestamp.now(),
        products: productsForInvoice.map(product => ({
          productName: product.productName,
          packageType: product.packageType,
          gramm: product.gramm,
          quantity: product.quantity,
          price: product.price,
          totalPrice: product.quantity * product.price
        })),
        totalInvoiceAmount: calculateTotalAmount(),
        invoiceNumber: newInvoiceNumber,
        userID: currentUser?.uid || 'unknown',
        userName: currentUser?.name || 'Unknown User',
        senderCompany: senderCompany,
        customRestaurantName: customRestaurantName || selectedClient.displayRestaurantName
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
    setInvoiceProducts([
      {
        id: 1,
        isDefault: true,
        productName: '',
        packageType: '',
        gramm: '',
        quantity: '',
        price: ''
      }
    ]);
    setGeneratedInvoiceUrl('');
    setInvoiceNumber('');
    setSenderCompany('White Ray');
    setCustomRestaurantName('');
  };

  // Handle opening modal
  const handleOpenModal = (client) => {
    setSelectedClient(client);
    setCustomRestaurantName(client.displayRestaurantName || "");
    setIsEditingRestaurant(false);
    setInvoiceProducts([
      {
        id: 1,
        isDefault: true,
        productName: client.fetchedProductName,
        packageType: client.fetchedPackageType,
        gramm: client.fetchedGramm,
        quantity: '',
        price: ''
      }
    ]);
    setModalOpen(true);
  };

  // Handle sender company change
  const handleSenderCompanyChange = (event, newCompany) => {
    if (newCompany !== null) {
      setSenderCompany(newCompany);
    }
  };

  // This function will be replaced with the HTML template from the second artifact
 // Replace the generateInvoiceHTML function in your Invoices.js with this:

const generateInvoiceHTML = (client, productsData, invoiceNumber, senderCompany, customRestaurantName) => {
  const totalAmount = productsData.reduce((sum, product) => sum + (product.quantity * product.price), 0);
  const senderName = senderCompany === 'White Ray' ? '"WHITE RAY" MCHJ' : '"PURE PACK" MCHJ';
  
  // Manual date formatting
  const now = new Date();
  const months = [
    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
  ];
  const currentDate = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}`;

  // Generate table rows for multiple products
  const generateProductRows = (products) => {
    return products.map((product, index) => {
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
  };

  const productRowsHtml = generateProductRows(productsData);

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
            line-height: 1.4;
        }
        
        .page-container {
            width: 210mm;
            height: 297mm;
            margin: 0 auto;
            background: white;
            position: relative;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
        }
        
        @media print {
            .page-container {
                box-shadow: none;
                margin: 0;
            }
            
            @page {
                size: A4 portrait;
                margin: 0;
            }
            
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        
        .invoice-container {
            width: 210mm;
            height: 148.5mm;
            position: relative;
            border-bottom: 2px dashed #888888;
            padding: 3mm;
            box-sizing: border-box;
            flex: 1;
        }
        
        .invoice-container:last-child {
            border-bottom: none;
        }
        
        .header-section {
            padding: 15px 12px 12px 20px;
            position: relative;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .logo {
            width: 84px;
            height: 22px;
        }
        
        .date-section {
            width: 70px;
            margin-right: 40px;
            text-align: right;
        }
        
        .date-label {
            font-size: 11px;
            font-weight: 500;
            color: #949494;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
        .date-value {
            font-size: 12.1px;
            font-weight: 600;
            color: #28352f;
            letter-spacing: -0.1px;
            white-space: nowrap;
        }
        
        .invoice-title {
            text-align: center;
            margin-top: 15px;
            margin-bottom: 12px;
            font-size: 15.4px;
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
            padding: 8px 15px 10px 15px;
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
            font-size: 11px;
            font-weight: 500;
            color: #5c5c5c;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
        .info-value {
            font-size: 12.1px;
            font-weight: 700;
            color: #000;
            letter-spacing: -0.1px;
        }
        
        .restaurant-name {
            font-size: 11px;
            font-weight: 500;
            color: #000;
            letter-spacing: -0.09px;
            margin-top: 1px;
        }
        
        .table-section {
            padding: 0 12px;
            margin-top: 12px;
        }
        
        .products-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #888888;
        }
        
        .table-header {
            background-color: #f8f8f8;
            height: 32px;
            border-bottom: 1px solid black;
        }
        
        .table-header th {
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
            font-size: 11px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.08px;
            border-right: 1px solid #888888;
        }
        
        .table-header th:last-child {
            border-right: none;
        }
        
        .table-header .sub-label {
            font-size: 9.9px;
            color: #666666;
            letter-spacing: -0.07px;
            margin-top: 1px;
            display: block;
            font-weight: 500;
        }
        
        .col-number {
            width: 25px;
            text-align: center;
        }
        
        .col-name {
            width: 45%;
        }
        
        .col-unit {
            width: 35px;
        }
        
        .col-quantity {
            width: 40px;
            text-align: center;
        }
        
        .col-price {
            width: 50px;
            text-align: center;
        }
        
        .col-total {
            width: 60px;
            text-align: right;
        }
        
        .table-row {
            height: 30px;
            border-bottom: 0.5px solid #d2d2d2;
        }
        
        .table-row td {
            padding: 4px 6px;
            vertical-align: center;
            font-size: 11px;
            font-weight: 500;
            color: #212121;
            letter-spacing: -0.08px;
            border-right: 1px solid #d2d2d2;
        }
        
        .table-row td:last-child {
            border-right: none;
        }
        
        .product-name {
            font-weight: 700;
            color: black;
            margin-bottom: 1px;
            font-size: 11px;
        }
        
        .product-description {
            color: #2d2d2d;
            font-weight: 500;
            font-size: 9.9px;
        }
        
        .total-section {
            margin-top: 10px;
            display: flex;
            justify-content: flex-end;
            padding-right: 12px;
        }
        
        .total-box {
            background-color: #f8f8f8;
            border: 1px solid #888888;
            border-radius: 3px;
            padding: 5px 8px 6px 8px;
            width: 125px;
        }
        
        .total-label {
            font-size: 11px;
            font-weight: 500;
            color: #484848;
            margin-bottom: 1px;
            letter-spacing: -0.08px;
        }
        
        .total-amount {
            font-size: 13.2px;
            font-weight: 700;
            color: black;
            letter-spacing: -0.1px;
        }
        
        .signatures-section {
            margin-top: 15px;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
        }
        
        .signature-block {
            width: 45%;
        }
        
        .signature-label {
            font-size: 11px;
            font-weight: 500;
            color: #282828;
            margin-bottom: 2px;
            letter-spacing: -0.09px;
        }
        
        .signature-line {
            font-size: 12.1px;
            font-weight: 700;
            color: #000;
            letter-spacing: -0.1px;
        }
        
        .credits {
            position: absolute;
            bottom: 38px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 8.8px;
            font-weight: 500;
            color: #8d8d8d;
            letter-spacing: -0.08px;
        }
        
        .footer {
            position: absolute;
            bottom: 7px;
            left: 0;
            right: 0;
            height: 31px;
            background-color: #d6eae6;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 25px;
        }
        
        .footer-logo {
            width: 18px;
            height: 18px;
            border-radius: 50%;
        }
        
        .footer-text {
            font-size: 12.1px;
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
            font-size: 19.4px;
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
                        <div class="info-value">${client.displayOrgName}</div>
                        ${
                          client.displayOrgName !== (customRestaurantName || client.displayRestaurantName)
                            ? `<div class="restaurant-name">( ${customRestaurantName || client.displayRestaurantName} )</div>`
                            : ''
                        }
                    </div>
                </div>
            </div>
            
            <div class="table-section">
                <table class="products-table">
                    <thead>
                        <tr class="table-header">
                            <th class="col-number">#</th>
                            <th class="col-name">
                                Nomi
                                <span class="sub-label">Наименование</span>
                            </th>
                            <th class="col-unit">
                                O'lchov bir.
                                <span class="sub-label">Ед.изм</span>
                            </th>
                            <th class="col-quantity">
                                Soni
                                <span class="sub-label">Кол-во</span>
                            </th>
                            <th class="col-price">
                                Narxi
                                <span class="sub-label">Цена</span>
                            </th>
                            <th class="col-total">
                                Summasi
                                <span class="sub-label">Сумма</span>
                            </th>
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
        </div>

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
                        <div class="info-value">${client.displayOrgName}</div>
                        ${
                          client.displayOrgName !== (customRestaurantName || client.displayRestaurantName)
                            ? `<div class="restaurant-name">( ${customRestaurantName || client.displayRestaurantName} )</div>`
                            : ''
                        }
                    </div>
                </div>
            </div>
            
            <div class="table-section">
                <table class="products-table">
                    <thead>
                        <tr class="table-header">
                            <th class="col-number">#</th>
                            <th class="col-name">
                                Nomi
                                <span class="sub-label">Наименование</span>
                            </th>
                            <th class="col-unit">
                                O'lchov bir.
                                <span class="sub-label">Ед.изм</span>
                            </th>
                            <th class="col-quantity">
                                Soni
                                <span class="sub-label">Кол-во</span>
                            </th>
                            <th class="col-price">
                                Narxi
                                <span class="sub-label">Цена</span>
                            </th>
                            <th class="col-total">
                                Summasi
                                <span class="sub-label">Сумма</span>
                            </th>
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
        </div>
    </div>
</body>
</html>`;

    return htmlTemplate;
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
                        fontSize: '12px',
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
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
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

              <Divider sx={{ my: 2 }} />

              {/* Products Section */}
              <Typography variant="h6" gutterBottom>
                Товары в накладной
              </Typography>

              {invoiceProducts.map((product, index) => (
                <Card key={product.id} sx={{ mb: 2, p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {product.isDefault ? `Основной товар` : `Дополнительный товар ${index}`}
                    </Typography>
                    {!product.isDefault && (
                      <IconButton
                        onClick={() => removeProductRow(product.id)}
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>

                  {product.isDefault ? (
                    <Box>
                      <Typography variant="body2" gutterBottom>
                        <strong>Продукт:</strong> {selectedClient.fetchedProductName}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Упаковка:</strong> {selectedClient.fetchedPackageType} ({selectedClient.fetchedGramm} гр)
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Продукт</InputLabel>
                        <Select
                          value={product.productName}
                          onChange={(e) => updateProductField(product.id, 'productName', e.target.value)}
                          label="Продукт"
                        >
                          {products.map((prod) => (
                            <MenuItem key={prod.id} value={prod.id}>
                              {prod.productName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel>Упаковка</InputLabel>
                        <Select
                          value={product.packageType}
                          onChange={(e) => updateProductField(product.id, 'packageType', e.target.value)}
                          label="Упаковка"
                        >
                          {packageTypes.map((pkg) => (
                            <MenuItem key={pkg.id} value={pkg.id}>
                              {pkg.type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth>
                        <InputLabel>Граммаж</InputLabel>
                        <Select
                          value={product.gramm}
                          onChange={(e) => updateProductField(product.id, 'gramm', e.target.value)}
                          label="Граммаж"
                        >
                          {grammOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                    <NumericFormat
                      customInput={TextField}
                      fullWidth
                      label="Количество"
                      value={product.quantity}
                      onValueChange={(values) => {
                        updateProductField(product.id, 'quantity', values.value);
                      }}
                      thousandSeparator=" "
                      allowNegative={false}
                      decimalScale={0}
                    />
                    <TextField
                      fullWidth
                      label="Цена за единицу (сум)"
                      type="number"
                      value={product.price}
                      onChange={(e) => updateProductField(product.id, 'price', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </Box>

                  {product.quantity && product.price && (
                    <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                      Сумма: {(parseFloat(product.quantity) * parseFloat(product.price)).toLocaleString('ru-RU')} сум
                    </Typography>
                  )}
                </Card>
              ))}

              {/* Add Product Button */}
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={addProductRow}
                sx={{ mb: 2 }}
              >
                Добавить товар
              </Button>

              {/* Total Amount */}
              {calculateTotalAmount() > 0 && (
                <Typography variant="h6" color="primary" sx={{ mt: 2, mb: 2 }}>
                  Общая сумма: {calculateTotalAmount().toLocaleString('ru-RU')} сум
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
            disabled={generating || !validateProducts()}
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