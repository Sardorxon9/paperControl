// Welcome.js

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
  IconButton
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import Shield from '@mui/icons-material/Shield';
import Work from '@mui/icons-material/Work';
import AddClientForm from './addClientForm';
import ClientDetailsModal from './ClientDetailsModal';
import ProductDetailsModal from './ProductDetailsModal'; // Import the extracted component
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import LogoutIcon from '@mui/icons-material/Logout';
import resetFirestoreDefaults from "./resetFirestoreDefaults";
import ExportClientsToCSV from "./ExportClientsCSV";

const getHiddenColumns = (userRole) => {
  if (userRole === 'admin') {
    // Admin can see all columns
    return [];
  } else {
    // Workers can't see these columns
    return ["totalKg", "orgName"];
  }
};

// Update your column headers to include orgName
const getColumnHeaders = (userRole) => {
  const baseHeaders = [
    "№",
    "name",
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
      "packaging",
      "shellNum",
      "totalRolls",
      "paperRemaining",
      "Actions"
    ];
  } else {
    return [
      ...baseHeaders,
    ];
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

  const [sortBy, setSortBy] = useState('name');   
  const [sortDirection, setSortDirection] = useState('asc'); 

  const hiddenColumns = getHiddenColumns(userRole);

  const fetchProductTypeData = async (productId, designType) => {
    if (!productId) return { packaging: '', shellNum: '', paperRemaining: '' };
    
    try {
      // Get packaging from productTypes
      const productRef = doc(db, "productTypes", productId);
      const productSnap = await getDoc(productRef);
      const packaging = productSnap.exists() ? productSnap.data().packaging : '';
      
      // For standard design type, get shellNum and paperRemaining from productTypes -> paperInfo
      if (designType === "standart") {
        try {
          const paperInfoQuery = await getDocs(collection(db, "productTypes", productId, "paperInfo"));
          if (!paperInfoQuery.empty) {
            const paperInfoData = paperInfoQuery.docs[0].data();
            return {
              packaging,
              shellNum: paperInfoData.shellNum || '',
              paperRemaining: paperInfoData.paperRemaining || ''
            };
          }
        } catch (error) {
          console.error("Error fetching paperInfo for standard design:", error);
        }
      }
      
      return { packaging, shellNum: '', paperRemaining: '' };
    } catch (error) {
      console.error("Error fetching product type data:", error);
      return { packaging: '', shellNum: '', paperRemaining: '' };
    }
  };

  const fetchClientData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "clients"));

      const clientsArray = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Fetch product type data (packaging, shellNum, paperRemaining based on designType)
          const productTypeData = await fetchProductTypeData(data.productId, data.designType);
          
          // Count paper rolls in clients/{id}/paperRolls
          let rollCount = 0;
          try {
            const paperRollsQuery = await getDocs(collection(db, "clients", docSnap.id, "paperRolls"));
            rollCount = paperRollsQuery.size || paperRollsQuery.docs.length;
          } catch (error) {
            console.error("Error fetching paper rolls count for client", docSnap.id, error);
            rollCount = 0;
          }

          return { 
            id: docSnap.id, 
            ...data, 
            packaging: productTypeData.packaging,
            // For standard design type, use shellNum and paperRemaining from productTypes
            // For unique design type, use the client's own shellNum and paperRemaining
            shellNum: data.designType === "standart" ? productTypeData.shellNum : (data.shellNum || ''),
            paperRemaining: data.designType === "standart" ? productTypeData.paperRemaining : (data.paperRemaining || ''),
            // Add orgName from client data
            orgName: data.orgName || data.organization || '-',
            // NEW: total number of small rolls
            totalRolls: rollCount
          };
        })
      );

      console.log("Parsed clients array:", clientsArray);
      setClientData(clientsArray);

      if (clientsArray.length > 0) {
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

  const fetchProductTypesData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "productTypes"));
      
      const productTypesArray = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          
          // Get shellNum and paperRemaining from paperInfo subcollection
          let shellNum = '-';
          let paperRemaining = 0;
          let totalRolls = 0;
          
          try {
            const paperInfoQuery = await getDocs(collection(db, "productTypes", docSnap.id, "paperInfo"));
            if (!paperInfoQuery.empty) {
              const paperInfoDoc = paperInfoQuery.docs[0];
              const paperInfoData = paperInfoDoc.data();
              shellNum = paperInfoData.shellNum || '-';
              paperRemaining = paperInfoData.paperRemaining || 0;
              
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
            type: data.type || '-',
            packaging: data.packaging || '-',
            gramm: data.gramm || '-',
            shellNum,
            paperRemaining,
            totalRolls
          };
        })
      );

      setProductTypesData(productTypesArray);
    } catch (error) {
      console.error("Error fetching product types data:", error);
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
      if (client.productId) {
        try {
          const productRef = doc(db, "productTypes", client.productId);
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

      // ✅ Always open the unified modal
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
    setClientData(prevData =>
      prevData.map(client =>
        client.id === updatedClient.id ? updatedClient : client
      )
    );
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

  const filteredClients = clientData.filter((client) =>
    (client.restaurant || client.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const visibleClients = clientData.filter((client) =>
    (client.restaurant || client.name || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // 2) default alphabetical sort by restaurant
  visibleClients.sort((a, b) => {
    const nameA = (a.restaurant || a.name || "").toLowerCase();
    const nameB = (b.restaurant || b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // 3) apply paperRemaining sort if arrows are clicked
  const sortedClients = [...visibleClients].sort((a, b) => {
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
    }
    return 0;
  });

  const ClientsTable = () => (
    <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
            {columnHeaders
              .filter((h) => !hiddenColumns.includes(h))
              .map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    padding: '16px',
                    ...((h === 'paperRemaining' || h === 'name') && {
                      cursor: 'pointer',
                      userSelect: 'none'
                    })
                  }}
                  onClick={() => {
                    if (h === 'name') {
                      setSortBy('name');
                      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                    } else if (h === 'paperRemaining') {
                      setSortBy('paperRemaining');
                      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                    }
                  }}
                >
                  {h === '№' ? (
                    '№'
                  ) : h === 'name' ? (
                    <>
                      Название ресторана{' '}
                      {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </>
                  ) : h === 'shellNum' ? (
                    'Номер полки'
                  ) : h === 'packaging' ? (
                    'Упаковка'
                  ) : h === 'orgName' ? (
                    'Организация'
                  ) : h === 'totalRolls' ? (
                    'Всего рулонов'
                  ) : h === 'paperRemaining' ? (
                    <>
                      Остаток бумаги{' '}
                      {sortBy === 'paperRemaining' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </>
                  ) : h === 'Actions' ? (
                    'Действия'
                  ) : (
                    h
                  )}
                </TableCell>
              ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {sortedClients.map((client, index) => {
            const lowPaper =
              client.paperRemaining !== undefined &&
              client.notifyWhen !== undefined &&
              client.paperRemaining <= client.notifyWhen;

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
                  .filter((f) => !hiddenColumns.includes(f))
                  .map((f) => (
                    <TableCell key={f} sx={{ padding: '16px' }}>
                      {f === '№' ? (
                        index + 1
                      ) : f === 'name' ? (
                        <Box display="flex" alignItems="center" gap={1}>
                          {lowPaper && <ReportGmailerrorredIcon color="error" />}
                          <Box>
                            <Typography fontWeight={600}>
                              {client.restaurant || client.name || '-'}
                            </Typography>
                            <Typography variant="body2" color="#0F9D8C">
                              {client.productType || ''}
                            </Typography>
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
                        client.packaging || '-'
                      ) : f === 'orgName' ? (
                        <Typography variant="body2" fontWeight={500}>
                          {client.orgName || '-'}
                        </Typography>
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
            <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '16px' }}>
              №
            </TableCell>
            <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '16px' }}>
              Тип продукта
            </TableCell>
            <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '16px' }}>
              Упаковка
            </TableCell>
            <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '16px' }}>
              Граммовка
            </TableCell>
            <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '16px' }}>
              Количество рулонов
            </TableCell>
            <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '16px' }}>
              Остаток (кг)
            </TableCell>
            <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '16px' }}>
              Номер полки
            </TableCell>
            <TableCell sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '16px' }}>
              Подробно
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {productTypesData.map((product, index) => (
            <TableRow
              key={product.id}
              sx={{
                '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                '&:hover': { backgroundColor: '#e3f2fd' }
              }}
            >
              {/* 1. № */}
              <TableCell sx={{ padding: '16px' }}>
                {index + 1}
              </TableCell>
              
              {/* 2. Тип продукта */}
              <TableCell sx={{ padding: '16px' }}>
                {product.type}
              </TableCell>
              
              {/* 3. Упаковка */}
              <TableCell sx={{ padding: '16px' }}>
                {product.packaging}
              </TableCell>
              
              {/* 4. Граммовка */}
              <TableCell sx={{ padding: '16px' }}>
                {product.gramm}
              </TableCell>
              
              {/* 5. Количество рулонов */}
              <TableCell sx={{ padding: '16px' }}>
                {product.totalRolls || 0}
              </TableCell>
              
              {/* 6. Остаток (кг) */}
              <TableCell sx={{ padding: '16px' }}>
                {product.paperRemaining != null ? `${product.paperRemaining.toFixed(2)} кг` : 'N/A'}
              </TableCell>
              
              {/* 7. Номер полки */}
              <TableCell sx={{ padding: '16px' }}>
                {product.shellNum}
              </TableCell>
              
              {/* 8. Подробно */}
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
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <>
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: '#fff',
          boxShadow: '0 2px 8px -2px rgba(0,0,0,.12)',
          px: { xs: 2, sm: 4, md: 6 },
          py: 2,
          mb: 3
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            {/* Logo */}
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
                style={{ height: 38, objectFit: 'contain' }}
              />
            </Box>

            {/* Center Section - Search and Add Client Button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {currentTab === 0 && (
                <>
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Поиск по названию"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />

                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddClientModal}
                    sx={{
                      backgroundColor: '#0F9D8C',
                      '&:hover': { backgroundColor: '#0c7a6e' },
                      fontSize: '1rem',
                      px: 3,
                      py: 1.2
                    }}
                  >
                    Добавить клиента
                  </Button>
                </>
              )}
            </Box>

            {/* User Info Section */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Box 
                display="flex" 
                alignItems="center" 
                gap={1} 
                px={2} 
                py={1} 
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
              >
                Выйти
              </Button>
              {userRole === "admin" && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <ExportClientsToCSV />
                </div>
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Main Content with Tabs */}
      <Container maxWidth="lg" sx={{ pt: 1, pb: 6 }}>
        {/* Tabs */}
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

        {/* Tab Content */}
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

        {/* Add Client Modal */}
        <Modal
          open={addClientModalOpen}
          onClose={handleCloseAddClientModal}
          aria-labelledby="add-client-modal"
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <AddClientForm
            onClose={handleCloseAddClientModal}
            onClientAdded={handleClientAdded}
          />
        </Modal>

        {/* Product Details Modal */}
        <ProductDetailsModal
          open={productModalOpen}
          onClose={handleCloseProductModal}
          product={selectedProduct}
          clients={clientData}
        />
       
        {/* Full Client Details Modal (for designType: "unique") */}
        <ClientDetailsModal
          open={modalOpen}
          onClose={handleCloseModal}
          client={selectedClient}
          onClientUpdate={handleClientUpdate}
          currentUser={user}
        />
      </Container>
    </>
  );
}