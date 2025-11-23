import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
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
  Divider,
  Grid,
  Chip
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
import { History } from '@mui/icons-material';
import InvoiceHistory from './InvoiceHistory';

const Invoices = ({ currentUser }) => {
  const navigate = useNavigate();
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
  
  // Payment type for entire invoice - NOT pre-selected
  const [paymentType, setPaymentType] = useState('');

  // New state for multiple products - starts empty
  const [invoiceProducts, setInvoiceProducts] = useState([]);

  // Branch selection state
  const [clientBranches, setClientBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);

  const grammOptions = [
    { value: '1', label: '1 гр' },
    { value: '2', label: '2 гр' },
    { value: '3', label: '3 гр' },
    { value: '4', label: '4 гр' },
    { value: '5', label: '5 гр' },
    { value: '6', label: '6 гр' }
  ];

  // Payment type options
  const paymentTypeOptions = [
    { value: 'cash', label: 'Наличные' },
    { value: 'transfer', label: 'Перечисление' }
  ];

  const filteredClients = clients.filter(client =>
    (client.displayName || client.displayRestaurantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.displayOrgName || client.branchOrgName || '').toLowerCase().includes(searchQuery.toLowerCase())
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

            const baseClient = {
              id: docSnap.id,
              ...data,
              fetchedProductName: productName,
              fetchedPackageType: packageType,
              fetchedGramm: grammValue,
              displayOrgName: data.orgName && data.orgName !== '-' ? data.orgName : (data.name || data.restaurant || ''),
              displayRestaurantName: data.name || data.restaurant || ''
            };

            // Fetch branches for this client
            let branches = [];
            try {
              const branchesSnapshot = await getDocs(collection(db, `clients/${docSnap.id}/branches`));
              if (!branchesSnapshot.empty) {
                branches = branchesSnapshot.docs.map(branchDoc => ({
                  id: branchDoc.id,
                  ...branchDoc.data()
                }));
              }
            } catch (error) {
              console.error(`Error fetching branches for client:`, error);
            }

            // If client has branches, return an array of client rows (one per branch)
            if (branches.length > 0) {
              return branches.map((branch, index) => ({
                ...baseClient,
                branchId: branch.id,
                branchName: branch.branchName || `Филиал ${index + 1}`,
                branchOrgName: branch.orgName,
                selectedBranchData: branch, // Store full branch data for invoice
                displayName: `${data.name || data.restaurant} (${branch.branchName || `Филиал ${index + 1}`})`,
                displayOrgName: branch.orgName,
                hasBranches: true
              }));
            } else {
              // No branches - return single client row
              return [{
                ...baseClient,
                displayName: data.name || data.restaurant || '',
                hasBranches: false
              }];
            }
          } catch (error) {
            console.error("Error processing client document:", docSnap.id, error);
            return null;
          }
        })
      );

      // Flatten the array since each client can return multiple rows (branches)
      const flattenedClients = clientsArray
        .filter(client => client !== null)
        .flat()
        .filter(client =>
          client &&
          client.id &&
          client.fetchedProductName &&
          client.fetchedPackageType
        );

      setClients(flattenedClients);
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

  // Remove product row - now works for all products including default
  const removeProductRow = (productId) => {
    setInvoiceProducts(invoiceProducts.filter(product => product.id !== productId));
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

  // Validate all products and payment type
  const validateProducts = () => {
    // Check if payment type is selected
    if (!paymentType) {
      return false;
    }

    // Check if there are any products
    if (invoiceProducts.length === 0) {
      return false;
    }

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

 const handleCreateInvoice = async () => {
    if (!selectedClient || !validateProducts()) {
      let message = 'Пожалуйста, заполните все поля';
      if (!paymentType) {
        message = 'Пожалуйста, выберите тип оплаты';
      } else if (invoiceProducts.length === 0) {
        message = 'Пожалуйста, добавьте хотя бы один товар';
      }

      setSnackbar({
        open: true,
        message: message,
        severity: 'warning'
      });
      return;
    }

    setGenerating(true);

    try {
      // Generate invoice number
      const newInvoiceNumber = generateInvoiceNumber();
      setInvoiceNumber(newInvoiceNumber);

      // Prepare products data for HTML generation (with resolved names)
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

      // Use selected branch orgName if branch is selected, otherwise use client's orgName
      const orgNameToUse = selectedBranch ? selectedBranch.orgName : selectedClient.displayOrgName;

      // Generate HTML content
      const htmlContent = generateInvoiceHTML(
        selectedClient,
        productsForInvoice,
        newInvoiceNumber,
        senderCompany,
        customRestaurantName,
        paymentType,
        orgNameToUse // Pass the selected branch orgName
      );

      // Create blob URL
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setGeneratedInvoiceUrl(url);

      // Save invoice record with consistent ID structure
      const invoiceData = {
        dateCreated: Timestamp.now(),
        products: invoiceProducts.map(product => {
          if (product.isDefault) {
            return {
              productID_2: selectedClient.productID_2,
              packageID: selectedClient.packageID,
              gramm: selectedClient.fetchedGramm,
              quantity: parseFloat(product.quantity),
              price: parseFloat(product.price),
              totalPrice: parseFloat(product.quantity) * parseFloat(product.price)
            };
          } else {
            return {
              productID_2: product.productName,
              packageID: product.packageType,
              gramm: product.gramm,
              quantity: parseFloat(product.quantity),
              price: parseFloat(product.price),
              totalPrice: parseFloat(product.quantity) * parseFloat(product.price)
            };
          }
        }),
        totalInvoiceAmount: calculateTotalAmount(),
        invoiceNumber: newInvoiceNumber,
        userID: currentUser?.uid || "unknown",
        userName: currentUser?.name || "Unknown User",
        senderCompany: senderCompany,
        customRestaurantName: customRestaurantName || selectedClient.displayRestaurantName,
        paymentType: paymentType
      };

      // Save to client's invoices subcollection
      await addDoc(collection(db, `clients/${selectedClient.id}/invoices`), invoiceData);

      // Also save to all-invoices collection for centralized history
      const allInvoicesData = {
        ...invoiceData,
        clientId: selectedClient.id,
        orgName: selectedClient.displayOrgName || ''
      };
      await addDoc(collection(db, 'all-invoices'), allInvoicesData);

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
    setInvoiceProducts([]);
    setGeneratedInvoiceUrl('');
    setInvoiceNumber('');
    setSenderCompany('White Ray');
    setCustomRestaurantName('');
    setPaymentType(''); // Reset to unselected
    setClientBranches([]);
    setSelectedBranch(null);
  };

  // Handle opening modal - branch is already selected from the table row
  const handleOpenModal = async (client) => {
    setSelectedClient(client);
    setCustomRestaurantName(client.displayRestaurantName || client.displayName || "");
    setIsEditingRestaurant(false);
    setPaymentType(''); // Reset to unselected

    // If client has branches, set the selected branch automatically
    if (client.hasBranches && client.selectedBranchData) {
      setSelectedBranch(client.selectedBranchData);
    } else {
      setSelectedBranch(null);
    }

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

  // Handle payment type change - now uses regular event handler
  const handlePaymentTypeChange = (event) => {
    setPaymentType(event.target.value);
  };

  // This function will be replaced with the HTML template from the second artifact
  const generateInvoiceHTML = (client, productsData, invoiceNumber, senderCompany, customRestaurantName, paymentType, orgName) => {
    const totalAmount = productsData.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    const senderName = senderCompany === 'White Ray' ? '"WHITE RAY" MCHJ' : '"PURE PACK" MCHJ';
    const paymentTypeDisplay = paymentType === 'cash' ? 'Наличные' : 'Перечисление';
    const orgNameToDisplay = orgName || client.displayOrgName;
    
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
                        <div class="info-value">${orgNameToDisplay}</div>
                        ${
                          orgNameToDisplay !== (customRestaurantName || client.displayRestaurantName)
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
                        <div class="info-value">${orgNameToDisplay}</div>
                        ${
                          orgNameToDisplay !== (customRestaurantName || client.displayRestaurantName)
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
        <IconButton onClick={() => navigate('/paper-control')} color="primary">
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" color="primary">
          Генератор накладных
        </Typography>
      </Box>

      {/* Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
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
            <Button
              variant="outlined"
              startIcon={<History />}
              onClick={() => navigate('/invoices/history')}
              sx={{
                borderColor: '#3c7570ff',
                color: '#3c7570ff',
                '&:hover': {
                  backgroundColor: '#3c75701a',
                  borderColor: '#2c5954'
                }
              }}
            >
              История созданных накладных
            </Button>
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
                  key={client.hasBranches ? `${client.id}-${client.branchId}` : client.id}
                  sx={{
                    '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                    '&:hover': { backgroundColor: '#e3f2fd' }
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>
                    {client.displayName || client.displayRestaurantName}
                  </TableCell>
                  <TableCell>
                    {client.hasBranches ? client.branchOrgName : client.displayOrgName}
                  </TableCell>
                  <TableCell>{client.fetchedProductName}</TableCell>
                  <TableCell>{client.fetchedGramm} гр</TableCell>
                  <TableCell>{client.fetchedPackageType}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      startIcon={<Receipt />}
                      sx={{
                        backgroundColor: '#04907F',
                        fontSize: '12px',
                        '&:hover': { backgroundColor: '#037569' }
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
        <DialogTitle sx={{ pb: 1.5 }}>
          <Typography variant="h5" fontWeight="600">
            Создание накладной
          </Typography>
          {selectedClient && (
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedClient.displayOrgName} - {selectedClient.displayRestaurantName}
            </Typography>
          )}
        </DialogTitle>
        
        <DialogContent dividers sx={{ pt: 2.5 }}>
          {selectedClient && (
            <Box>
              {/* Restaurant Name (editable) */}
              <TextField
                label="Название ресторана"
                fullWidth
                value={customRestaurantName}
                onChange={(e) => setCustomRestaurantName(e.target.value)}
                sx={{ mb: 3 }}
                size="medium"
              />

              {/* Sender Company Selection */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="500" gutterBottom>
                  От имени компании:
                </Typography>
                <ToggleButtonGroup
                  value={senderCompany}
                  exclusive
                  onChange={handleSenderCompanyChange}
                  aria-label="sender company"
                  fullWidth
                >
                  <ToggleButton
                    value="White Ray"
                    aria-label="white ray"
                    sx={{
                      py: 1.5,
                      "&.Mui-selected": {
                        backgroundColor: "#e0f2f1",
                        color: "#025249",
                        "&:hover": {
                          backgroundColor: "#b2dfdb"
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
                      py: 1.5,
                      "&.Mui-selected": {
                        backgroundColor: "#e0f2f1",
                        color: "#025249",
                        "&:hover": {
                          backgroundColor: "#b2dfdb"
                        }
                      }
                    }}
                  >
                    Pure Pack
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Payment Type Selection - NOT pre-selected */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="500" gutterBottom>
                  Тип оплаты:
                </Typography>
                <RadioGroup
                  row
                  value={paymentType}
                  onChange={handlePaymentTypeChange}
                  name="payment-type"
                >
                  <FormControlLabel
                    value="cash"
                    control={<Radio />}
                    label="Наличные"
                  />
                  <FormControlLabel
                    value="transfer"
                    control={<Radio />}
                    label="Перечисление"
                  />
                </RadioGroup>
              </Box>

              <Divider sx={{ 
                my: 3, 
                borderColor: 'rgba(0, 0, 0, 0.2)', 
                borderWidth: '1px' 
              }} />

              {/* Products Section */}
              <Box sx={{ mb: 2.5 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" fontWeight="500" color="#105f58">
                    Товары в накладной
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={addProductRow}
                    size="medium"
                  >
                    Добавить товар
                  </Button>
                </Box>
              </Box>

              {/* No Products Message */}
              {invoiceProducts.length === 0 && (
                <Box 
                  sx={{ 
                    mt: 3.5, 
                    p: 4, 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: 2,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Товары не добавлены. Пожалуйста, нажмите кнопку "Добавить товар" и укажите товар
                  </Typography>
                </Box>
              )}

              {invoiceProducts.map((product, index) => (
                <Card 
                  key={product.id} 
                  sx={{ 
                    mb: 2.5, 
                    p: 3,
                    boxShadow: product.isDefault ? '0px 4px 12px rgba(0, 0, 0, 0.12)' : 'none',
                    border: product.isDefault ? 'none' : '1px solid #e0e0e0',
                    backgroundColor: product.isDefault ? 'transparent' : '#f8fdff',
                    borderRadius: '10px'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="500">
                        {product.isDefault ? `Основной товар` : `Дополнительный товар`}
                      </Typography>
                    </Box>
                    <IconButton
                      onClick={() => removeProductRow(product.id)}
                      color="error"
                      size="medium"
                      sx={{ 
                        backgroundColor: 'rgba(244, 67, 54, 0.08)',
                        '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.12)' }
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>

                  {product.isDefault ? (
                    <Box sx={{ mb: 2.5 }}>
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Продукт"
                            value={selectedClient.fetchedProductName}
                            fullWidth
                            size="medium"
                            InputProps={{ 
                              readOnly: true,
                              sx: {
                                padding: '8px 14px',
                                fontSize: '15px'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                fontSize: '15px'
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="Упаковка"
                            value={selectedClient.fetchedPackageType}
                            fullWidth
                            size="medium"
                            InputProps={{ 
                              readOnly: true,
                              sx: {
                                padding: '8px 14px',
                                fontSize: '15px'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                fontSize: '15px'
                              }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            label="Граммаж"
                            value={`${selectedClient.fetchedGramm} гр`}
                            fullWidth
                            size="medium"
                            InputProps={{ 
                              readOnly: true,
                              sx: {
                                padding: '8px 14px',
                                fontSize: '15px'
                              }
                            }}
                            InputLabelProps={{
                              sx: {
                                fontSize: '15px'
                              }
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ) : (
                    <Box sx={{ mb: 2.5 }}>
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="500" color="text.secondary">
                              Продукт
                            </Typography>
                          </Box>
                          <FormControl fullWidth size="medium">
                            <Select
                              value={product.productName}
                              onChange={(e) => updateProductField(product.id, 'productName', e.target.value)}
                              displayEmpty
                              sx={{
                                fontSize: '15px',
                                '& .MuiSelect-select': {
                                  padding: '10px 14px'
                                }
                              }}
                            >
                              <MenuItem value="" disabled sx={{ fontSize: '15px', color: '#999' }}>
                                Выберите продукт
                              </MenuItem>
                              {products.map((prod) => (
                                <MenuItem key={prod.id} value={prod.id} sx={{ fontSize: '15px' }}>
                                  {prod.productName}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="500" color="text.secondary">
                              Упаковка
                            </Typography>
                          </Box>
                          <FormControl fullWidth size="medium">
                            <Select
                              value={product.packageType}
                              onChange={(e) => updateProductField(product.id, 'packageType', e.target.value)}
                              displayEmpty
                              sx={{
                                fontSize: '15px',
                                '& .MuiSelect-select': {
                                  padding: '10px 14px'
                                }
                              }}
                            >
                              <MenuItem value="" disabled sx={{ fontSize: '15px', color: '#999' }}>
                                Выберите упаковку
                              </MenuItem>
                              {packageTypes.map((pkg) => (
                                <MenuItem key={pkg.id} value={pkg.id} sx={{ fontSize: '15px' }}>
                                  {pkg.type}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="500" color="text.secondary">
                              Граммаж
                            </Typography>
                          </Box>
                          <FormControl fullWidth size="medium">
                            <Select
                              value={product.gramm}
                              onChange={(e) => updateProductField(product.id, 'gramm', e.target.value)}
                              displayEmpty
                              sx={{
                                fontSize: '15px',
                                '& .MuiSelect-select': {
                                  padding: '10px 14px'
                                }
                              }}
                            >
                              <MenuItem value="" disabled sx={{ fontSize: '15px', color: '#999' }}>
                                Выберите граммаж
                              </MenuItem>
                              {grammOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value} sx={{ fontSize: '15px' }}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  <Box sx={{ mt: 3 }}>
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={4}>
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
                          size="medium"
                          InputProps={{
                            sx: {
                              padding: '8px 14px',
                              fontSize: '15px'
                            }
                          }}
                          InputLabelProps={{
                            sx: {
                              fontSize: '15px'
                            }
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          label="Цена за единицу (сум)"
                          type="number"
                          value={product.price}
                          onChange={(e) => updateProductField(product.id, 'price', e.target.value)}
                          inputProps={{ min: 0, step: 0.01 }}
                          size="medium"
                          InputProps={{
                            sx: {
                              padding: '8px 14px',
                              fontSize: '15px'
                            }
                          }}
                          InputLabelProps={{
                            sx: {
                              fontSize: '15px'
                            }
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  {product.quantity && product.price && (
                    <Box 
                      sx={{ 
                        mt: 2, 
                        p: 1.5, 
                        backgroundColor: 'rgba(0, 128, 128, 0.06)', 
                        borderRadius: 1,
                        border: '1px solid rgba(0, 128, 128, 0.12)'
                      }}
                    >
                      <Typography variant="body2" fontWeight="500" color="primary">
                        Сумма: {(parseFloat(product.quantity) * parseFloat(product.price)).toLocaleString('ru-RU')} сум
                      </Typography>
                    </Box>
                  )}
                </Card>
              ))}

              {/* Total Amount */}
              {calculateTotalAmount() > 0 && (
                <Box 
                  sx={{ 
                    mt: 3.5, 
                    p: 3, 
                    backgroundColor: '#d3eeec', 
                    borderRadius: 1.5,
                    border: '1px solid #bce5e179'
                  }}
                >
                  <Typography variant="h6" fontWeight="600" color="#0a4540ff" align="center">
                    Общая сумма: {calculateTotalAmount().toLocaleString('ru-RU')} сум
                  </Typography>
                </Box>
              )}

              {generatedInvoiceUrl && (
                <Box sx={{ mt: 3.5, p: 3, backgroundColor: '#e3f2fd', borderRadius: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight="500" gutterBottom color="primary">
                    ✅ Накладная создана успешно!
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap" sx={{ mt: 2 }}>
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
                        size="medium"
                      >
                        Открыть накладную
                      </Button>
                    </Link>
                    <Button
                      variant="contained"
                      startIcon={<Download />}
                      onClick={handleDownload}
                      size="medium"
                      sx={{
                        backgroundColor: '#0d47a1',
                        '&:hover': { backgroundColor: '#1565c0' }
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
        <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCloseModal} color="inherit" size="medium">
            Отмена
          </Button>
          <Button
            onClick={handleCreateInvoice}
            variant="contained"
            disabled={generating || !validateProducts()}
            size="medium"
            sx={{
              backgroundColor: '#105f58',
              color: 'white',
              '&:hover': { backgroundColor: '#0c4a44' },
              minWidth: 165,
              py: 1
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Invoices;