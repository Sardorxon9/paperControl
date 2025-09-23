import React, { useState, useEffect } from 'react';
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
  Grid
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
import { History } from '@mui/icons-material'; // Add this to existing imports
import InvoiceHistory from './InvoiceHistory'; // Add this import


const Invoices = ({ onNavigateToWelcome,onNavigateToHistory,currentUser }) => {
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
  // Payment type for entire invoice
  const [paymentType, setPaymentType] = useState('cash');

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

  // Payment type options
  const paymentTypeOptions = [
    { value: 'cash', label: 'Наличные' },
    { value: 'transfer', label: 'Перечисление' }
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

    // Generate HTML content
    const htmlContent = generateInvoiceHTML(
      selectedClient, 
      productsForInvoice, 
      newInvoiceNumber, 
      senderCompany,
      customRestaurantName,
      paymentType
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
            productID_2: product.productName, // productName хранит ID
            packageID: product.packageType,   // packageType хранит ID
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
    setPaymentType('cash');
  };

  // Handle opening modal
  const handleOpenModal = (client) => {
    setSelectedClient(client);
    setCustomRestaurantName(client.displayRestaurantName || "");
    setIsEditingRestaurant(false);
    setPaymentType('cash');
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

  // Handle payment type change
  const handlePaymentTypeChange = (event, newPaymentType) => {
    if (newPaymentType !== null) {
      setPaymentType(newPaymentType);
    }
  };

  // This function will be replaced with the HTML template from the second artifact
  const generateInvoiceHTML = (client, productsData, invoiceNumber, senderCompany, customRestaurantName, paymentType) => {
    const totalAmount = productsData.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    const senderName = senderCompany === 'White Ray' ? '"WHITE RAY" MCHJ' : '"PURE PACK" MCHJ';
    const paymentTypeDisplay = paymentType === 'cash' ? 'Наличные' : 'Перечисление';
    
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

   const htmlTemplate = '....'
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
              onClick={onNavigateToHistory}
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

              {/* Payment Type Selection */}
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

              {invoiceProducts.map((product, index) => (
                <Card 
                  key={product.id} 
                  sx={{ 
                    mb: 2.5, 
                    p: 3,
                    // Deeper shadow for основной товар (+15%)
                    boxShadow: product.isDefault ? '0px 4px 12px rgba(0, 0, 0, 0.12)' : 'none',
                    // Border for additional товары
                    border: product.isDefault ? 'none' : '1px solid #e0e0e0',
                    backgroundColor: product.isDefault ? 'transparent' : '#f8fdff',
                    // 25% more rounded corners for all cards
                    borderRadius: '10px'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="500">
                        {product.isDefault ? `Основной товар` : `Дополнительный товар`}
                      </Typography>
                    </Box>
                    {!product.isDefault && (
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
                    )}
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
                          <FormControl fullWidth size="medium">
                            <InputLabel sx={{ fontSize: '15px' }}>Продукт</InputLabel>
                            <Select
                              value={product.productName}
                              onChange={(e) => updateProductField(product.id, 'productName', e.target.value)}
                              label="Продукт"
                              sx={{
                                fontSize: '15px',
                                '& .MuiSelect-select': {
                                  padding: '10px 14px'
                                }
                              }}
                            >
                              {products.map((prod) => (
                                <MenuItem key={prod.id} value={prod.id} sx={{ fontSize: '15px' }}>
                                  {prod.productName}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="medium">
                            <InputLabel sx={{ fontSize: '15px' }}>Упаковка</InputLabel>
                            <Select
                              value={product.packageType}
                              onChange={(e) => updateProductField(product.id, 'packageType', e.target.value)}
                              label="Упаковка"
                              sx={{
                                fontSize: '15px',
                                '& .MuiSelect-select': {
                                  padding: '10px 14px'
                                }
                              }}
                            >
                              {packageTypes.map((pkg) => (
                                <MenuItem key={pkg.id} value={pkg.id} sx={{ fontSize: '15px' }}>
                                  {pkg.type}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="medium">
                            <InputLabel sx={{ fontSize: '15px' }}>Граммаж</InputLabel>
                            <Select
                              value={product.gramm}
                              onChange={(e) => updateProductField(product.id, 'gramm', e.target.value)}
                              label="Граммаж"
                              sx={{
                                fontSize: '15px',
                                '& .MuiSelect-select': {
                                  padding: '10px 14px'
                                }
                              }}
                            >
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
                        {product.paymentType && (
                          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                            ({paymentTypeOptions.find(opt => opt.value === product.paymentType)?.label})
                          </span>
                        )}
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