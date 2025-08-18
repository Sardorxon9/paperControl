// Welcome.js

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
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
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton // <-- Import IconButton
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import Shield from '@mui/icons-material/Shield';
import Work from '@mui/icons-material/Work';
import AddClientForm from './addClientForm';
import ClientDetailsModal from './ClientDetailsModal';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import LogoutIcon from '@mui/icons-material/Logout'; // <-- Import LogoutIcon
import resetFirestoreDefaults from "./resetFirestoreDefaults";// Product Details Modal Component
import ExportClientsToCSV from "./ExportClientsCSV";
function ProductDetailsModal({ open, onClose, product, clients }) {
  const [paperInfo, setPaperInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [priyemka, setPriyemka] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Edit states
  const [editingUsage, setEditingUsage] = useState(false);
  const [editingPriyemka, setEditingPriyemka] = useState(false);
  const [usedAmount, setUsedAmount] = useState('');

const [paperIn, setPaperIn] = useState('');

const [individualRolls, setIndividualRolls] = useState([]);
const [addingRoll, setAddingRoll] = useState(false);
const [rollToAdd, setRollToAdd] = useState("");
const [showAddRollInput, setShowAddRollInput] = useState(false);
const [editingRollId, setEditingRollId] = useState(null);
const [rollEditAmount, setRollEditAmount] = useState("");
const [selectedClient, setSelectedClient] = useState("");

  const fetchProductDetails = async () => {
    if (!product) return;
    
    setLoading(true);
  try {
    // Fetch paperInfo from subcollection
    const paperInfoQuery = await getDocs(collection(db, "productTypes", product.id, "paperInfo"));
    let paperInfoData = null;
    
    if (!paperInfoQuery.empty) {
      const paperInfoDoc = paperInfoQuery.docs[0];
      paperInfoData = { id: paperInfoDoc.id, ...paperInfoDoc.data() };
      setPaperInfo(paperInfoData);
      
      // NEW: Fetch individual rolls from paperInfo -> individualRolls
      const rollsQuery = await getDocs(
        collection(db, "productTypes", product.id, "paperInfo", paperInfoDoc.id, "individualRolls")
      );
      const rollsData = rollsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => a.dateCreated?.seconds - b.dateCreated?.seconds);
      setIndividualRolls(rollsData);
    }
    
      // Fetch logs directly from productTypes/{id}/logs
      const logsQuery = await getDocs(collection(db, "productTypes", product.id, "logs"));
      const logsData = await Promise.all(
        logsQuery.docs.map(async (logDoc) => {
          const logData = logDoc.data();
          // Get client name
          let clientName = 'Unknown';
          if (logData.clientId) {
            try {
              const clientDoc = await getDoc(doc(db, "clients", logData.clientId));
              if (clientDoc.exists()) {
                const client = clientDoc.data();
                clientName = client.restaurant || client.name || 'Unknown';
              }
            } catch (error) {
              console.error("Error fetching client:", error);
            }
          }
          return {
            id: logDoc.id,
            ...logData,
            clientName
          };
        })
      );
      setLogs(logsData.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0)));
      
      // Fetch priyemka directly from productTypes/{id}/priyemka
      const priyemkaQuery = await getDocs(collection(db, "productTypes", product.id, "priyemka"));
      const priyemkaData = priyemkaQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      setPriyemka(priyemkaData);
      
    } catch (error) {
      console.error("Error fetching product details:", error);
      setPaperInfo(null);
      setLogs([]);
      setPriyemka([]);
    } finally {
      setLoading(false);
    }
  };


const handleUpdateRoll = async (rollId, newAmount, clientId) => {
  if (!paperInfo || !clientId) return;
  
  try {
    // Get current roll data
    const rollRef = doc(db, "productTypes", product.id, "paperInfo", paperInfo.id, "individualRolls", rollId);
    const rollSnap = await getDoc(rollRef);
    const currentAmount = rollSnap.data().paperRemaining;
    const amountUsed = currentAmount - parseFloat(newAmount);
    
    // Update individual roll
    await updateDoc(rollRef, {
      paperRemaining: parseFloat(newAmount)
    });
    
    // Update paperInfo tota
    await updateDoc(doc(db, "productTypes", product.id, "paperInfo", paperInfo.id), {
      paperRemaining: (paperInfo.paperRemaining || 0) - amountUsed
    });
    
    // Add log entry
    if (amountUsed > 0) {
      await addDoc(collection(db, "productTypes", product.id, "logs"), {
        usedAmount: amountUsed,
        dateRecorded: serverTimestamp(),
        clientId: clientId,
        rollId: rollId
      });
    }
    
    setEditingRollId(null);
    setRollEditAmount("");
    setSelectedClient("");
    await fetchProductDetails();
  } catch (error) {
    console.error("Error updating roll:", error);
    alert("Ошибка при обновлении рулона");
  }
};




 const handleSavePriyemka = async () => {
  if (!paperIn || !paperInfo) return;
  
  try {
    console.log("Saving priyemka:", { paperIn, paperInfo });
    
    // Add priyemka entry to productTypes/{id}/priyemka
    const priyemkaRef = await addDoc(collection(db, "productTypes", product.id, "priyemka"), {
      paperIn: parseFloat(paperIn),
      date: serverTimestamp()
    });
    console.log("Priyemka added with ID:", priyemkaRef.id);
    
    // Create new roll in individualRolls subcollection
    await addDoc(
      collection(db, "productTypes", product.id, "paperInfo", paperInfo.id, "individualRolls"),
      {
        paperRemaining: parseFloat(paperIn),
        dateCreated: serverTimestamp()
      }
    );
    console.log("New roll created with amount:", parseFloat(paperIn));
    
    // Update paperRemaining and totalKg in paperInfo subcollection
    const newPaperRemaining = (paperInfo.paperRemaining || 0) + parseFloat(paperIn);
    const newTotalKg = (paperInfo.totalKg || 0) + parseFloat(paperIn);
    
    await updateDoc(doc(db, "productTypes", product.id, "paperInfo", paperInfo.id), {
      paperRemaining: newPaperRemaining,
      totalKg: newTotalKg
    });
    console.log("Paper remaining updated to:", newPaperRemaining, "totalKg:", newTotalKg);
    
    // Reset form
    setPaperIn('');
    setEditingPriyemka(false);
    
    // Refresh data
    await fetchProductDetails();
  } catch (error) {
    console.error("Error saving priyemka:", error);
    alert("Ошибка при сохранении: " + error.message);
  }
};

  useEffect(() => {
    if (open && product) {
      fetchProductDetails();
    }
  }, [open, product]);

  if (!product) return null;

  return (
    <Modal
  open={open}
  onClose={onClose}
  aria-labelledby="product-details-modal"
  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
>
  <Box
    sx={{
      bgcolor: 'background.paper',
      borderRadius: 2,
      boxShadow: 24,
      p: 4,
      minWidth: 800,
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflow: 'auto'
    }}
  >
    <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
      Подробная информация: {product.type}
    </Typography>

    {loading ? (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    ) : (
      <Grid container spacing={3}>
        {/* Box 1: Basic Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" paddingBottom={2} fontWeight={700} gutterBottom color="primary">
                Основная информация
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Тип продукта</Typography>
                  <Typography variant="body1" fontWeight={700}>{product.type}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Номер полки</Typography>
                  <Typography variant="body1" fontWeight={700} fontSize={18}>
                    {paperInfo?.shellNum || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Общий остаток</Typography>
                  <Typography variant="body1" fontWeight={700} fontSize={18}>
                    {paperInfo?.paperRemaining || 0} кг
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Всего рулонов</Typography>
                  <Typography variant="body1" fontWeight={700} fontSize={18}>
                    {individualRolls.length}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Box 2: Individual Rolls Management */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                Управление рулонами
              </Typography>

           

              <Divider sx={{ my: 2 }} />

              {/* Individual Rolls List */}
              <Typography variant="subtitle2" gutterBottom>Рулоны</Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {individualRolls.map((roll, index) => (
                  <Card key={roll.id} sx={{ mb: 2, bgcolor: '#E2F0EE', border: '1px solid #BDDCD8' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                     <Box display="flex" flexDirection="column" alignItems="flex-start" gap={1}>
                        <Typography variant="body2">Рулон {index + 1}</Typography>
                        {editingRollId === roll.id ? (
                          <Stack spacing={1} alignItems="flex-start" sx={{ width: '100%' }}>
                            <TextField
                              size="small"
                              type="number"
                              label="Сколько кг осталось?"
                              value={rollEditAmount}
                              onChange={(e) => setRollEditAmount(e.target.value)}
                              sx={{ width: '100%' }}
                            />
                            <FormControl size="small" sx={{ width: '100%' }}>
                              <InputLabel>Выберите клиента</InputLabel>
                              <Select
                                value={selectedClient}
                                onChange={(e) => setSelectedClient(e.target.value)}
                                label="Выберите клиента"
                              >
                                {clients.map(client => (
                                  <MenuItem key={client.id} value={client.id}>
                                    {client.restaurant || client.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleUpdateRoll(roll.id, rollEditAmount, selectedClient)}
                                disabled={!selectedClient || !rollEditAmount}
                              >
                                ✓
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setEditingRollId(null);
                                  setRollEditAmount("");
                                  setSelectedClient("");
                                }}
                              >
                                ✗
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="h6" fontWeight="bold">
                              {roll.paperRemaining} кг
                            </Typography>
                            <Button
                              size="small"
                              variant="сontained"
                              sx={{
                                      backgroundColor: '#0F9D8C',
                                      color : "white",
                                      '&:hover': { backgroundColor: '#0b7f73' }
                                    }}
                              onClick={() => {
                                setEditingRollId(roll.id);
                                setRollEditAmount(roll.paperRemaining.toString());
                              }}
                            >
                              Редактировать
                            </Button>
                          </Stack>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Box 3: Приемка */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                Приемка
              </Typography>
              
              {!editingPriyemka ? (
                <Button
                  variant="outlined"
                  onClick={() => setEditingPriyemka(true)}
                  sx={{ mb: 2 }}
                >
                  Приемка
                </Button>
              ) : (
                <Stack spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    size="small"
                    label="Сколько кг поступило?"
                    type="number"
                    value={paperIn}
                    onChange={(e) => setPaperIn(e.target.value)}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSavePriyemka}
                      disabled={!paperIn}
                    >
                      Сохранить
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setEditingPriyemka(false);
                        setPaperIn('');
                      }}
                    >
                      Отмена
                    </Button>
                  </Stack>
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                История поступлений
              </Typography>
              
              {priyemka.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Нет записей
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Дата</TableCell>
                        <TableCell>Поступило (кг)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {priyemka.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.date ? new Date(item.date.seconds * 1000).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>{item.paperIn}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )}

    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
      <Button onClick={onClose} variant="contained">
        Закрыть
      </Button>
    </Box>
  </Box>
</Modal>

  );
}

// Simple Modal Component for Standard Design Type


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
              {product.paperRemaining != null ? `${product.paperRemaining.toFixed(2)} кг` : 'N/A'} кг
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
                cursor: 'pointer', // Make it clear it's clickable
                "&:hover": { opacity: 0.8 } // Add hover effect
              }}
              onClick={onBackToDashboard} // <-- Add onClick handler to go back
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
              
              <Button // <-- Add the logout button
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

        {/* Simple Client Details Modal (for designType: "standart") */}
       
        {/* Full Client Details Modal (for designType: "unique") */}
        <ClientDetailsModal
          open={modalOpen}
          onClose={handleCloseModal}
          client={selectedClient}
          onClientUpdate={handleClientUpdate}
          currentUser={user} // Pass user for Telegram integration
        />
      </Container>
    </>
  );
}