// Welcome.js - Fixed version with proper productID_2 usage

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "./firebase";
import {
  Container,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Button,
  Modal,
  TextField,
  Stack,
  Tabs,
  Tab,
  IconButton,
  InputAdornment
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import Shield from '@mui/icons-material/Shield';
import Work from '@mui/icons-material/Work';
import AddClientForm from './addClientForm';
import ClientDetailsModal from './ClientDetailsModal';
import ProductDetailsModal from './ProductDetailsModal';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import LogoutIcon from '@mui/icons-material/Logout';
import AddStandardDesignModal from "./AddStandardDesignModal";
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import { checkAndNotifyLowPaper, sendLowPaperSummaryToAdmins } from "./paperNotificationService";
import TelegramIcon from '@mui/icons-material/Telegram';

const getHiddenColumns = (userRole) => {
  if (userRole === 'admin') {
    return [];
  } else {
    return ["totalKg", "orgName"];
  }
};

const getColumnHeaders = (userRole) => {
  const baseHeaders = [
    "№",
    "name",
    "productTypeName",
    "packaging",
    "shellNum",
    "totalRolls",
    "paperRemaining",
    "Actions"
  ];
  
  if (userRole === 'admin') {
    return [
      "№",
      "name",
      "orgName",
      "productTypeName",
      "packaging",
      "shellNum",
      "totalRolls",
      "paperRemaining",
      "Actions"
    ];
  } else {
    return baseHeaders;
  }
};

export default function Welcome({ user, userRole, onBackToDashboard, onLogout }) {
  const [clientData, setClientData] = useState([]);
  const [productTypesData, setProductTypesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productTypesLoading, setProductTypesLoading] = useState(true);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [simpleModalOpen, setSimpleModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [showAddStandardDesignModal, setShowAddStandardDesignModal] = useState(false);
  const [sortByProduct, setSortByProduct] = useState('type');
  const [sortDirectionProduct, setSortDirectionProduct] = useState('asc');
  const [sortBy, setSortBy] = useState('name');   
  const [sortDirection, setSortDirection] = useState('asc'); 
  const [sendingSummary, setSendingSummary] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const SortIcon = ({ column, activeColumn, direction }) => {
    if (column !== activeColumn) {
      return <UnfoldMoreRoundedIcon sx={{ fontSize: 18, opacity: 0.5 }} />;
    }
    if (direction === 'asc') {
      return <ArrowUpwardRoundedIcon sx={{ fontSize: 18 }} />;
    }
    return <ArrowDownwardRoundedIcon sx={{ fontSize: 18 }} />;
  };

  const hiddenColumns = getHiddenColumns(userRole);

  // Updated function to fetch product name from "products" collection using productID_2
  const fetchProductName = async (productID_2) => {
    try {
      if (!productID_2) return null;
      const productRef = doc(db, "products", productID_2);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        return productSnap.data().productName || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching product name:", error);
      return null;
    }
  };

  // Fetch package type function
  const fetchPackageType = async (packageID) => {
    try {
      if (!packageID) return null;
      const packageRef = doc(db, "packageTypes", packageID);
      const packageSnap = await getDoc(packageRef);
      if (packageSnap.exists()) {
        return packageSnap.data().type || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching package type:", error);
      return null;
    }
  };

  // Updated function to get product and package info for client
  const fetchClientProductInfo = async (client) => {
    try {
      const productName = client.productID_2 ? await fetchProductName(client.productID_2) : null;
      const packageType = client.packageID ? await fetchPackageType(client.packageID) : null;
      
      return {
        productName,
        packageType
      };
    } catch (error) {
      console.error('Error fetching client product info:', error);
      return { productName: null, packageType: null };
    }
  };

  // Updated function to find productType document by productID_2 and packageID
  const findProductTypeByIds = async (productID_2, packageID) => {
    try {
      if (!productID_2 && !packageID) return null;
      
      const querySnapshot = await getDocs(collection(db, "productTypes"));
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const matchesProduct = !productID_2 || data.productID_2 === productID_2;
        const matchesPackage = !packageID || data.packageID === packageID;
        
        if (matchesProduct && matchesPackage) {
          return { id: docSnap.id, data };
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error finding productType by IDs:", error);
      return null;
    }
  };

  // Updated fetchProductTypeData function - now uses productID_2 and packageID
  const fetchProductTypeData = async (productID_2, packageID, designType) => {
    if (!productID_2 && !packageID) return { packaging: '', shellNum: '', paperRemaining: '', type: '' };
    
    try {
      const productTypeMatch = await findProductTypeByIds(productID_2, packageID);
      
      if (!productTypeMatch) {
        return { packaging: '', shellNum: '', paperRemaining: '', type: '' };
      }
      
      const { id: productTypeId, data: productData } = productTypeMatch;
      const packaging = productData.packaging || '';
      const type = productData.type || '';
      
      if (designType === "standart") {
        try {
          const paperInfoQuery = await getDocs(collection(db, "productTypes", productTypeId, "paperInfo"));
          if (!paperInfoQuery.empty) {
            const paperInfoData = paperInfoQuery.docs[0].data();
            return {
              packaging,
              type,
              shellNum: paperInfoData.shellNum || '',
              paperRemaining: Number(paperInfoData.paperRemaining) || 0
            };
          }
        } catch (error) {
          console.error("Error fetching paperInfo for standard design:", error);
        }
      }
      
      return { packaging, type, shellNum: '', paperRemaining: '' };
    } catch (error) {
      console.error("Error fetching product type data:", error);
      return { packaging: '', type: '', shellNum: '', paperRemaining: '' };
    }
  };

// Updated fetchClientData function to include gramm and standard design name
const fetchClientData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "clients"));
    const validDocs = querySnapshot.docs.filter(docSnap => 
      docSnap && docSnap.id && docSnap.exists()
    );

    const clientsArray = await Promise.all(
      validDocs.map(async (docSnap) => {
        try {
          const data = docSnap.data();
          
          if (!data) {
            console.warn("Document has no data:", docSnap.id);
            return null;
          }
          
          // Fetch product and package info using new fields
          const { productName, packageType } = await fetchClientProductInfo(data);
          
          // For standard designs, get product type data including name and gramm
          let productTypeData = { packaging: '', type: '', shellNum: '', paperRemaining: 0, gramm: '', productTypeStandardName: '' };
          
          if (data.productID_2 || data.packageID) {
            try {
              const productTypeMatch = await findProductTypeByIds(data.productID_2, data.packageID);
              if (productTypeMatch) {
                const { data: ptData } = productTypeMatch;
                
                productTypeData = {
                  packaging: ptData.packaging || '',
                  type: ptData.type || '',
                  gramm: ptData.gramm || '', // Get gramm from productType
                  productTypeStandardName: ptData.name || '', // Get standard design name
                  shellNum: '',
                  paperRemaining: 0
                };

                // For standard designs, get paper info
                if (data.designType === "standart") {
                  try {
                    const paperInfoQuery = await getDocs(collection(db, "productTypes", productTypeMatch.id, "paperInfo"));
                    if (!paperInfoQuery.empty) {
                      const paperInfoData = paperInfoQuery.docs[0].data();
                      productTypeData.shellNum = paperInfoData.shellNum || '';
                      productTypeData.paperRemaining = Number(paperInfoData.paperRemaining) || 0;
                    }
                  } catch (error) {
                    console.error("Error fetching paperInfo for standard design:", error);
                  }
                }
              }
            } catch (error) {
              console.error("Error fetching product type data:", error);
            }
          }
          
          let rollCount = 0;
          try {
            const paperRollsQuery = await getDocs(collection(db, "clients", docSnap.id, "paperRolls"));
            const availableRolls = paperRollsQuery.docs.filter(rollDoc => {
              const rollData = rollDoc.data();
              const weight = Number(rollData.paperRemaining) || 0;
              return weight > 0;
            });
            rollCount = availableRolls.length;
          } catch (error) {
            console.error("Error fetching paper rolls count for client", docSnap.id, error);
            rollCount = 0;
          }

          return { 
            id: docSnap.id, 
            ...data,
            // Store the fetched product info
            fetchedProductName: productName,
            fetchedPackageType: packageType,
            // Add gramm and standard design name
            gramm: productTypeData.gramm,
            productTypeStandardName: productTypeData.productTypeStandardName,
            // For packaging, use packageType if available, otherwise fall back to productType packaging
            packaging: packageType || productTypeData.packaging || '',
            // For product display, use productName primarily
            productTypeName: productName || productTypeData.type || '',
            shellNum: data.designType === "standart" ? productTypeData.shellNum : (data.shellNum || ''),
            paperRemaining: data.designType === "standart"
              ? Number(productTypeData.paperRemaining) || 0
              : Number(data.paperRemaining) || 0,
            orgName: data.orgName || data.organization || '-',
            totalRolls: rollCount
          };
        } catch (error) {
          console.error("Error processing client document:", docSnap.id, error);
          return null;
        }
      })
    );

    const validClients = clientsArray.filter(client => client !== null && client.id);
    setClientData(validClients);

    if (validClients.length > 0) {
      setColumnHeaders(getColumnHeaders(userRole));
    } else {
      setColumnHeaders([]);
    }
  } catch (error) {
    console.error("Error fetching client data:", error);
    setClientData([]);
    setColumnHeaders([]);
  } finally {
    setLoading(false);
  }
};

// Replace your existing fetchProductTypesData function with this fixed version:

const fetchProductTypesData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "productTypes"));
    
    const validDocs = querySnapshot.docs.filter(docSnap => 
      docSnap && docSnap.id && docSnap.exists()
    );

    const productTypesArray = await Promise.all(
      validDocs.map(async (docSnap) => {
        try {
          const data = docSnap.data();
          
          if (!data) {
            console.warn("Product document has no data:", docSnap.id);
            return null;
          }
          
          // Fetch product name from products collection using productID_2
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

          // Fetch package type from packageTypes collection using packageID
          let packageTypeName = '';
          if (data.packageID) {
            try {
              const packageRef = doc(db, "packageTypes", data.packageID);
              const packageSnap = await getDoc(packageRef);
              if (packageSnap.exists()) {
                packageTypeName = packageSnap.data().type || packageSnap.data().name || '';
              }
            } catch (error) {
              console.error("Error fetching package type:", error);
            }
          }
          
          let shellNum = data.shellNum || '-'; // Use shellNum directly from productTypes document
          let paperRemaining = data.totalKG || 0; // Use totalKG as initial paper remaining
          let totalRolls = 0;
          
          // Try to get updated paper info from subcollection if it exists
          try {
            const paperInfoQuery = await getDocs(collection(db, "productTypes", docSnap.id, "paperInfo"));
            if (!paperInfoQuery.empty) {
              const paperInfoDoc = paperInfoQuery.docs[0];
              const paperInfoData = paperInfoDoc.data();
              paperRemaining = Number(paperInfoData.paperRemaining) || paperRemaining;
              
              // Count individual rolls
              const rollsQuery = await getDocs(
                collection(db, "productTypes", docSnap.id, "paperInfo", paperInfoDoc.id, "individualRolls")
              );
              totalRolls = rollsQuery.docs.length;
            }
          } catch (error) {
            console.error("Error fetching paperInfo:", error);
          }
          
          return {
            id: docSnap.id,
            name: data.name || '-', // Product name from productTypes document
            type: productName || data.type || '-', // Product name from products collection
            packaging: packageTypeName || data.packaging || '-', // Package type from packageTypes collection
            gramm: data.gramm || '-',
            shellNum,
            paperRemaining,
            totalRolls,
            // Store original data for debugging
            originalData: data
          };
        } catch (error) {
          console.error("Error processing product document:", docSnap.id, error);
          return null;
        }
      })
    );

    const validProducts = productTypesArray.filter(product => product !== null && product.id);
    setProductTypesData(validProducts);
  } catch (error) {
    console.error("Error fetching product types data:", error);
    setProductTypesData([]);
  } finally {
    setProductTypesLoading(false);
  }
};

  useEffect(() => {
    fetchClientData();
    fetchProductTypesData();
  }, [userRole]);

  const [selectedClientProduct, setSelectedClientProduct] = useState(null);

  const handleOpenModal = (client) => {
    setSelectedClient(client);

    const fetchProductData = async () => {
      // Updated to use productID_2 instead of productId
      if (client.productID_2) {
        try {
          const productRef = doc(db, "products", client.productID_2);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            setSelectedClientProduct(productSnap.data());
          } else {
            console.warn("Product not found for client:", client.id);
            setSelectedClientProduct(null);
          }
        } catch (error) {
          console.error("Error fetching product data:", error);
          setSelectedClientProduct(null);
        }
      } else {
        setSelectedClientProduct(null);
      }

      setModalOpen(true);
    };

    fetchProductData();
  };

  const handleOpenProductModal = (product) => {
    setSelectedProduct(product);
    setProductModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedClient(null);
  };

  const handleCloseSimpleModal = () => {
    setSimpleModalOpen(false);
    setSelectedClient(null);
    setSelectedClientProduct(null);
  };

  const handleCloseProductModal = () => {
    setProductModalOpen(false);
    setSelectedProduct(null);
  };

  const handleClientUpdate = (updatedClient) => {
    setClientData(prevData => {
      if (!prevData || !Array.isArray(prevData)) {
        return updatedClient ? [updatedClient] : [];
      }
      
      if (!updatedClient || !updatedClient.id) {
        return prevData;
      }
      
      return prevData
        .filter(client => client && client.id)
        .map(client =>
          client.id === updatedClient.id ? updatedClient : client
        );
    });
    setSelectedClient(updatedClient);
  };

  const handleOpenAddClientModal = () => {
    setAddClientModalOpen(true);
  };

  const handleCloseAddClientModal = () => {
    setAddClientModalOpen(false);
  };

  const handleClientAdded = () => {
    fetchClientData();
    handleCloseAddClientModal();
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const visibleClients = (clientData || []).filter((client) =>
    client &&
    (client.restaurant || client.name || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const sortedClients = [...visibleClients].sort((a, b) => {
    if (!a || !b) return 0;
    
    if (sortBy === 'name') {
      const nameA = (a.restaurant || a.name || '').toLowerCase();
      const nameB = (b.restaurant || b.name || '').toLowerCase();
      return sortDirection === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    } else if (sortBy === 'paperRemaining') {
      return sortDirection === 'asc'
        ? (a.paperRemaining || 0) - (b.paperRemaining || 0)
        : (b.paperRemaining || 0) - (a.paperRemaining || 0);
    } else if (sortBy === 'shellNum') {
      const shellNumA = (a.shellNum || '').toString().toLowerCase();
      const shellNumB = (b.shellNum || '').toString().toLowerCase();
      return sortDirection === 'asc'
        ? shellNumA.localeCompare(shellNumB)
        : shellNumB.localeCompare(shellNumA);
    }
    return 0;
  });

  const sortedProductTypes = [...productTypesData].sort((a, b) => {
    if (!a || !b) return 0;
    
    if (sortByProduct === 'type') {
      const typeA = (a.type || '').toLowerCase();
      const typeB = (b.type || '').toLowerCase();
      return sortDirectionProduct === 'asc'
        ? typeA.localeCompare(typeB)
        : typeB.localeCompare(typeA);
    } else if (sortByProduct === 'paperRemaining') {
      return sortDirectionProduct === 'asc'
        ? (a.paperRemaining || 0) - (b.paperRemaining || 0)
        : (b.paperRemaining || 0) - (a.paperRemaining || 0);
    } else if (sortByProduct === 'shellNum') {
      const shellNumA = (a.shellNum || '').toString().toLowerCase();
      const shellNumB = (b.shellNum || '').toString().toLowerCase();
      return sortDirectionProduct === 'asc'
        ? shellNumA.localeCompare(shellNumB)
        : shellNumB.localeCompare(shellNumA);
    }
    return 0;
  });

const handleSendLowPaperSummary = async () => {
  setSendingSummary(true);
  try {
    // Debug: check db instance
    console.log('DB instance:', db, typeof db);

    // Filter clients with low paper
    const lowPaperClients = clientData.filter(client => 
      client.paperRemaining !== undefined &&
      client.notifyWhen !== undefined &&
      client.paperRemaining <= client.notifyWhen
    );

    if (lowPaperClients.length === 0) {
      setSnackbar({
        open: true,
        message: 'Нет клиентов с низким уровнем бумаги',
        severity: 'info'
      });
      return;
    }

    // Call the service function with db and clients
    const result = await sendLowPaperSummaryToAdmins(db, lowPaperClients);

    if (result.success && result.notificationSent) {
      setSnackbar({
        open: true,
        message: `Сводка отправлена ${result.successfulNotifications}/${result.totalAdmins} администраторам`,
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: `Ошибка отправки сводки: ${result.error || 'Неизвестная ошибка'}`,
        severity: 'error'
      });
    }
  } catch (error) {
    console.error("Error sending low paper summary:", error);
    setSnackbar({
      open: true,
      message: `Ошибка отправки сводки: ${error.message}`,
      severity: 'error'
    });
  } finally {
    setSendingSummary(false);
  }
};


  // Updated ClientsTable component
// Updated ClientsTable component
const ClientsTable = () => (
  <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
    <Table sx={{ minWidth: 650 }}>
      <TableHead>
        <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
          {columnHeaders
            .filter((h) => !hiddenColumns.includes(h) && h !== 'orgName') // Remove orgName column
            .map((h) => (
              <TableCell
                key={h}
                sx={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  padding: '16px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  backgroundColor: (sortBy === h) ? '#2c5c57' : '#3c7570ff',
                }}
                onClick={() => {
                  if (h === 'name' || h === 'paperRemaining' || h === 'shellNum') {
                    const newSortBy = h === 'name' ? 'name' : 
                                    h === 'paperRemaining' ? 'paperRemaining' : 'shellNum';
                    
                    if (sortBy === newSortBy) {
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(newSortBy);
                      setSortDirection('asc');
                    }
                  }
                }}
              >
                <Box display="flex" alignItems="center">
                  {h === '№' ? (
                    '№'
                  ) : h === 'name' ? (
                    'Название ресторана'
                  ) : h === 'shellNum' ? (
                    'Номер полки'
                  ) : h === 'packaging' ? (
                    'Упаковка'
                  ) : h === 'productTypeName' ? (
                    'Продукт'
                  ) : h === 'totalRolls' ? (
                    'Всего рулонов'
                  ) : h === 'paperRemaining' ? (
                    'Остаток бумаги'
                  ) : h === 'Actions' ? (
                    'Действия'
                  ) : (
                    h
                  )}
                  
                  {(h === 'name' || h === 'paperRemaining' || h === 'shellNum') && (
                    <Box ml={1} display="flex">
                      <SortIcon 
                        column={h} 
                        activeColumn={sortBy} 
                        direction={sortDirection} 
                      />
                    </Box>
                  )}
                </Box>
              </TableCell>
            ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {sortedClients.map((client, index) => {
          if (!client || !client.id) return null;

          const lowPaper =
            client.paperRemaining !== undefined &&
            client.notifyWhen !== undefined &&
            client.paperRemaining <= client.notifyWhen;

      

          // Get product info with standard design details
          const getProductInfo = async () => {
            const productName = client.fetchedProductName || client.productTypeName || '';
            
            if (client.designType === 'standart' && (client.productID_2 || client.packageID)) {
              // For standard designs, get the productType name
              try {
                const productTypeMatch = await findProductTypeByIds(client.productID_2, client.packageID);
                if (productTypeMatch && productTypeMatch.data.name) {
                  return {
                    productName,
                    standardName: productTypeMatch.data.name
                  };
                }
              } catch (error) {
                console.error("Error fetching standard design name:", error);
              }
            }
            
            return { productName, standardName: null };
          };

          // For now, use sync version - you might want to refactor this to use state
          const displayProductName = client.fetchedProductName || client.productTypeName || '-';
          const isStandardDesign = client.designType === 'standart';
          
          return (
            <TableRow
              key={client.id}
              sx={{
                borderBottom: lowPaper
                  ? '3px solid #f44336'
                  : '1px solid #e0e0e0',
                '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                '&:hover': { backgroundColor: '#e3f2fd' }
              }}
            >
              {columnHeaders
                .filter((f) => !hiddenColumns.includes(f) && f !== 'orgName') // Remove orgName column
                .map((f) => (
                  <TableCell key={f} sx={{ padding: '16px' }}>
                    {f === '№' ? (
                      index + 1
                    ) : f === 'name' ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        {lowPaper && <ReportGmailerrorredIcon color="error" />}
                        <Box>
                          <Typography fontWeight={600}>
                            {client.name || '-'}
                          </Typography>
                          {/* Organization name below restaurant name in green */}
                          {client.orgName && client.orgName !== '-' && (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: '#0F9D8C',
                                fontWeight: 400,
                                fontSize: '0.85rem'
                              }}
                            >
                              {client.orgName}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ) : f === 'Actions' ? (
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        sx={{
                          color: '#0F9D8C',
                          borderColor: '#0F9D8C',
                          '&:hover': {
                            borderColor: '#0c7a6e',
                            color: '#0c7a6e'
                          }
                        }}
                        onClick={() => handleOpenModal(client)}
                      >
                        Подробно
                      </Button>
                    ) : f === 'shellNum' ? (
                      client.shellNum || '-'
                    ) : f === 'packaging' ? (
                      <Box>
    {(() => {
      const packageType = client.fetchedPackageType || client.packaging || '';
      const gramm = client.gramm || '';
      
      if (packageType && gramm) {
        return (
          <Typography variant="body2" component="span">
            {packageType}{' '}
            <Typography 
              component="span" 
              sx={{ 
                color: '#757575',
                fontSize: 'inherit'
              }}
            >
              ({gramm} гр)
            </Typography>
          </Typography>
        );
      }
      return packageType || '-';
    })()}
  </Box>
                    ) : f === 'productTypeName' ? (
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {displayProductName}
                        </Typography>
                        {/* Show standard design info only for standard designs */}
                        {isStandardDesign && client.productTypeStandardName && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: '#757575',
                              fontSize: '0.8rem',
                              fontWeight: 400
                            }}
                          >
                            Стандарт "{client.productTypeStandardName}"
                          </Typography>
                        )}
                      </Box>
                    ) : f === 'totalRolls' ? (
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {client.totalRolls ?? 0}
                      </Typography>
                    ) : f === 'paperRemaining' ? (
                      client.paperRemaining != null
                        ? `${client.paperRemaining.toFixed(2)} кг`
                        : '-'
                    ) : (
                      client[f] ?? '-'
                    )}
                  </TableCell>
                ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </TableContainer>
);

  const ProductTypesTable = () => (
    <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
            {[
              { id: 'index', label: '№' },
              { id: 'type', label: 'Тип продукта' },
              { id: 'packaging', label: 'Упаковка' },
              { id: 'gramm', label: 'Граммовка' },
              { id: 'totalRolls', label: 'Количество рулонов' },
              { id: 'paperRemaining', label: 'Остаток (кг)' },
              { id: 'shellNum', label: 'Номер полки' },
              { id: 'actions', label: 'Подробно' }
            ].map((column) => (
              <TableCell
                key={column.id}
                sx={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  padding: '16px',
                  cursor: column.id === 'type' || column.id === 'paperRemaining' || column.id === 'shellNum' ? 'pointer' : 'default',
                  userSelect: 'none',
                  backgroundColor: (sortByProduct === column.id) ? '#2c5c57' : '#3c7570ff',
                }}
                onClick={() => {
                  if (column.id === 'type' || column.id === 'paperRemaining' || column.id === 'shellNum') {
                    if (sortByProduct === column.id) {
                      setSortDirectionProduct(sortDirectionProduct === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortByProduct(column.id);
                      setSortDirectionProduct('asc');
                    }
                  }
                }}
              >
                <Box display="flex" alignItems="center">
                  {column.label}
                  {(column.id === 'type' || column.id === 'paperRemaining' || column.id === 'shellNum') && (
                    <Box ml={1} display="flex">
                      <SortIcon 
                        column={column.id} 
                        activeColumn={sortByProduct} 
                        direction={sortDirectionProduct} 
                      />
                    </Box>
                  )}
                </Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedProductTypes.map((product, index) => {
            if (!product || !product.id) return null;

            return (
              <TableRow
                key={product.id}
                sx={{
                  '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                  '&:hover': { backgroundColor: '#e3f2fd' }
                }}
              >
                <TableCell sx={{ padding: '16px' }}>
                  {index + 1}
                </TableCell>
                
              <TableCell sx={{ padding: '16px' }}>
  <Box>
    <Typography 
      variant="body1" 
      sx={{ 
        fontWeight: 600, 
        color: 'grey.800',
        lineHeight: 1.2,
        mb: 0.5
      }}
    >
      {product.type}
    </Typography>
    <Typography 
      variant="body2" 
      sx={{ 
        fontWeight: 400, 
        color: 'grey.600',
        lineHeight: 1.2
      }}
    >
      {product.name}
    </Typography>
  </Box>
</TableCell>
                
                <TableCell sx={{ padding: '16px' }}>
                  {product.packaging}
                </TableCell>
                
                <TableCell sx={{ padding: '16px' }}>
                  {product.gramm}
                </TableCell>
                
                <TableCell sx={{ padding: '16px' }}>
                  {product.totalRolls || 0}
                </TableCell>
                
                <TableCell sx={{ padding: '16px' }}>
                  {product.paperRemaining != null ? `${product.paperRemaining.toFixed(2)} кг` : 'N/A'}
                </TableCell>
                
                <TableCell sx={{ padding: '16px' }}>
                  {product.shellNum}
                </TableCell>
                
                <TableCell sx={{ padding: '16px' }}>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    sx={{
                      color: '#0F9D8C',
                      borderColor: '#0F9D8C',
                      '&:hover': {
                        borderColor: '#0c7a6e',
                        color: '#0c7a6e'
                      }
                    }}
                    onClick={() => handleOpenProductModal(product)}
                  >
                    Подробно
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: '#fff',
          boxShadow: '0 2px 8px -2px rgba(0,0,0,.12)',
          px: { xs: 2, sm: 4, md: 6 },
          py: 1.5,
          mb: 3,
        }}
      >
        <Container maxWidth={false} sx={{ maxWidth: "1400px" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            
            <Box
              sx={{
                cursor: 'pointer',
                "&:hover": { opacity: 0.8 }
              }}
              onClick={onBackToDashboard}
            >
              <img
                src="https://whiteray.uz/images/whiteray_1200px_logo_green.png"
                alt="WhiteRay"
                style={{ height: 34, objectFit: 'contain' }}
              />
            </Box>

            {currentTab === 0 && (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder="Поиск по названию"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ minWidth: 240 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="clear search"
                          onClick={() => setSearchQuery('')}
                          edge="end"
                          size="small"
                        >
                          <CancelRoundedIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {userRole === 'admin' && (
                  <>
                  {userRole === 'admin' && (
  <Button
    variant="contained"
    color="secondary"
    startIcon={<TelegramIcon />}
    onClick={handleSendLowPaperSummary}
    disabled={sendingSummary}
    sx={{
      backgroundColor: '#9C27B0',
      '&:hover': { backgroundColor: '#7B1FA2' },
      fontSize: '0.85rem',
      px: 2.5,
      py: 0.8,
      borderRadius: 2,
      textTransform: 'none',
      whiteSpace: "nowrap"
    }}
  >
    {sendingSummary ? 'Отправка...' : 'Отправить список бумаг ТГ'}
  </Button>
)}
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenAddClientModal}
                      sx={{
                        backgroundColor: '#0F9D8C',
                        '&:hover': { backgroundColor: '#0c7a6e' },
                        fontSize: '0.85rem',
                        px: 2.5,
                        py: 0.8,
                        borderRadius: 2,
                        textTransform: 'none',
                        whiteSpace: "nowrap"
                      }}
                    >
                      Добавить клиента
                    </Button>

                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setShowAddStandardDesignModal(true)}
                      sx={{
                        backgroundColor: '#0F9D8C',
                        '&:hover': { backgroundColor: '#0c7a6e' },
                        fontSize: '0.85rem',
                        px: 2.5,
                        py: 0.8,
                        borderRadius: 2,
                        textTransform: 'none',
                        whiteSpace: "nowrap"
                      }}
                    >
                      Добавить стандартный дизайн
                    </Button>
                  </>
                )}
              </Stack>
            )}

            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                px={2}
                py={0.8}
                bgcolor="#f5f5f5"
                borderRadius={2}
              >
                {userRole === 'admin' ? <Shield color="primary" /> : <Work color="success" />}
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {user?.name || 'Пользователь'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {userRole === 'admin' ? 'Администратор' : 'Сотрудник'}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={onLogout}
                sx={{
                  fontSize: '0.8rem',
                  px: 2,
                  py: 0.6,
                  textTransform: 'none',
                  borderRadius: 2
                }}
              >
                Выйти
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pt: 1, pb: 6 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root.Mui-selected': {
                color: '#0F9D8C',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#0F9D8C',
                fontWeight: '700',
              },
            }}
          >
            <Tab label="Клиенты и этикетки" />
            <Tab label="Стандартные рулоны" />
          </Tabs>
        </Box>

        {currentTab === 0 && (
          <>
            {loading ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : clientData.length === 0 ? (
              <Typography variant="h6" color="text.secondary">
                Данные клиентов не найдены.
              </Typography>
            ) : (
              <ClientsTable />
            )}
          </>
        )}

        {currentTab === 1 && (
          <>
            {productTypesLoading ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : productTypesData.length === 0 ? (
              <Typography variant="h6" color="text.secondary">
                Данные стандартных рулонов не найдены.
              </Typography>
            ) : (
              <ProductTypesTable />
            )}
          </>
        )}

        {addClientModalOpen && (
          <Modal
            open={addClientModalOpen}
            onClose={handleCloseAddClientModal}
            aria-labelledby="add-client-modal"
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Box>
              <AddClientForm
                onClose={handleCloseAddClientModal}
                onClientAdded={handleClientAdded}
              />
            </Box>
          </Modal>
        )}

        {productModalOpen && selectedProduct && (
          <ProductDetailsModal
            open={productModalOpen}
            onClose={handleCloseProductModal}
            product={selectedProduct}
            currentUser={user}
          />
        )}

        {showAddStandardDesignModal && (
          <Modal
            open={showAddStandardDesignModal}
            onClose={() => setShowAddStandardDesignModal(false)}
            aria-labelledby="add-standard-design-modal"
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Box>
              <AddStandardDesignModal
                open={showAddStandardDesignModal}
                onClose={() => setShowAddStandardDesignModal(false)}
                onDesignAdded={() => {
                  setShowAddStandardDesignModal(false);
                  fetchProductTypesData();
                }}
                currentUser={user}
              />
            </Box>
          </Modal>
        )}

        {modalOpen && selectedClient && (
          <ClientDetailsModal
            open={modalOpen}
            onClose={handleCloseModal}
            client={selectedClient}
            onClientUpdate={handleClientUpdate}
            currentUser={user}
          />
        )}
      </Container>
 <Snackbar
  open={snackbar.open}
  autoHideDuration={6000}
  onClose={() => setSnackbar({ ...snackbar, open: false })}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
>
  <Alert 
    onClose={() => setSnackbar({ ...snackbar, open: false })} 
    severity={snackbar.severity}
    sx={{ width: '100%' }}
  >
    {snackbar.message}
  </Alert>
</Snackbar>
    </>
  );
}