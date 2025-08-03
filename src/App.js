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
  Divider
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import AddClientForm from './addClientForm';
import ClientDetailsModal from './ClientDetailsModal';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';

// Product Details Modal Component
function ProductDetailsModal({ open, onClose, product, clients }) {
  const [paperInfo, setPaperInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [priyemka, setPriyemka] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Edit states
  const [editingUsage, setEditingUsage] = useState(false);
  const [editingPriyemka, setEditingPriyemka] = useState(false);
  const [usedAmount, setUsedAmount] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [paperIn, setPaperIn] = useState('');


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
      } else {
        setPaperInfo(null);
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

  const handleSaveUsage = async () => {
    if (!usedAmount || !selectedClient || !paperInfo) return;
    
    try {
      console.log("Saving usage:", { usedAmount, selectedClient, paperInfo });
      
      // Add log entry to productTypes/{id}/logs
      const logRef = await addDoc(collection(db, "productTypes", product.id, "logs"), {
        usedAmount: parseFloat(usedAmount),
        date: serverTimestamp(),
        clientId: selectedClient
      });
      console.log("Log added with ID:", logRef.id);
      
      // Update paperRemaining in paperInfo subcollection
      const newPaperRemaining = Math.max(0, (paperInfo.paperRemaining || 0) - parseFloat(usedAmount));
      await updateDoc(doc(db, "productTypes", product.id, "paperInfo", paperInfo.id), {
        paperRemaining: newPaperRemaining
      });
      console.log("Paper remaining updated to:", newPaperRemaining);
      
      // Reset form
      setUsedAmount('');
      setSelectedClient('');
      setEditingUsage(false);
      
      // Refresh data
      await fetchProductDetails();
    } catch (error) {
      console.error("Error saving usage:", error);
      alert("Ошибка при сохранении: " + error.message);
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
            {/* Box 1: Основная информация */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" paddingBottom={2} fontWeight={700} gutterBottom color="primary">
                    Основная информация
                  </Typography>
                  <Stack spacing={2}>
                  <Box>
  <Typography variant="body2" color="text.secondary">
    Тип продукта
  </Typography>



  <Typography variant="body1" fontWeight={700} >
    {product.type}
  </Typography>
</Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Номер полки
                      </Typography>
                      <Typography variant="body1" fontWeight={700} fontSize={18} >
                        {paperInfo?.shellNum || '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Остаток в наличии
                      </Typography>
                      <Typography variant="body1" fontWeight={700} fontSize={18}>
                        {paperInfo?.paperRemaining || 0} кг
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Box 2: Использование бумаги */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                    Использование бумаги
                  </Typography>
                  
                  {!editingUsage ? (
                    <Button
                      variant="outlined"
                      onClick={() => setEditingUsage(true)}
                      sx={{ mb: 2 }}
                    >
                      Редактировать
                    </Button>
                  ) : (
                    <Stack spacing={2} sx={{ mb: 2 }}>
                      <TextField
                        size="small"
                        label="Сколько использовано (кг)?"
                        type="number"
                        value={usedAmount}
                        onChange={(e) => setUsedAmount(e.target.value)}
                      />
                      <FormControl size="small">
                        <InputLabel>Выберите клиента</InputLabel>
                        <Select
                          value={selectedClient}
                          onChange={(e) => setSelectedClient(e.target.value)}
                          label="Выберите клиента"
                        >
                          {clients.map((client) => (
                            <MenuItem key={client.id} value={client.id}>
                              {client.restaurant || client.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={handleSaveUsage}
                          disabled={!usedAmount || !selectedClient}
                        >
                          Сохранить
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setEditingUsage(false);
                            setUsedAmount('');
                            setSelectedClient('');
                          }}
                        >
                          Отмена
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    История использования
                  </Typography>
                  
                  {logs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Нет записей
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                      <Table size="small">
                        <TableHead sx={{ backgroundColor: '#e1e9f2' }}>
                         <TableRow>
        <TableCell sx={{ color: '#3d5066', fontWeight: 600 }}>Дата</TableCell>
        <TableCell sx={{ color: '#3d5066', fontWeight: 600 }}>Клиент</TableCell>
        <TableCell sx={{ color: '#3d5066', fontWeight: 600 }}>
          Использовано (кг)
        </TableCell>
      </TableRow>
                        </TableHead>
                        <TableBody>
                          {logs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {log.date ? new Date(log.date.seconds * 1000).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell>{log.clientName}</TableCell>
                              <TableCell>{log.usedAmount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
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
// Change the function signature to accept 'product'
function SimpleClientModal({ open, onClose, client, product }) {
  if (!client) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="simple-client-modal"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          minWidth: 400,
          maxWidth: 600,
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
          Информация о клиенте
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Название клиента
            </Typography>
            <Typography variant="body1">
              {client.restaurant || client.name || '-'}
            </Typography>
          </Box>

          {/* ADD A CONDITIONAL CHECK FOR 'product' */}
          {product ? (
            <>
              <Box>
                <Typography variant="subtitle2" color="#bfc9c9">
                  Тип продукта
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {product.type || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Упаковка
                </Typography>
                <Typography variant="body1">
                  {product.packaging || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Граммовка
                </Typography>
                <Typography variant="body1">
                  {product.gramm || '-'}
                </Typography>
              </Box>
            </>
          ) : (
            // You can optionally add a placeholder or loading spinner here
            <Box>
              <Typography variant="body2" color="text.secondary">
                Продукт не найден.
              </Typography>
            </Box>
          )}

          {/* ... existing address and comment sections */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Полный адрес
            </Typography>
            <Typography variant="body1">
              {client.addressLong ? `${client.addressLong.latitude}, ${client.addressLong.longitude}` : '-'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Короткий адрес
            </Typography>
            <Typography variant="body1">
              {client.addressShort || '-'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">
              Комментарий
            </Typography>
            <Typography variant="body1">
              {client.comment || '-'}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={onClose} variant="contained">
            Закрыть
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

export default function Welcome() {
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

  const hiddenColumns = ["totalKg", "paperUsed"];

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
          
          return { 
            id: docSnap.id, 
            ...data, 
            packaging: productTypeData.packaging,
            // For standard design type, use shellNum and paperRemaining from productTypes
            // For unique design type, use the client's own shellNum and paperRemaining
            shellNum: data.designType === "standart" ? productTypeData.shellNum : (data.shellNum || ''),
            paperRemaining: data.designType === "standart" ? productTypeData.paperRemaining : (data.paperRemaining || '')
          };
        })
      );

      console.log("Parsed clients array:", clientsArray);
      setClientData(clientsArray);

      if (clientsArray.length > 0) {
        setColumnHeaders([
          "№",
          "name",
          "shellNum",
          "packaging",
          "totalKg",
          "paperUsed",
          "paperRemaining",
          "Actions"
        ]);
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
          
          // Get shellNum from paperInfo subcollection
          let shellNum = '-';
          try {
            const paperInfoQuery = await getDocs(collection(db, "productTypes", docSnap.id, "paperInfo"));
            if (!paperInfoQuery.empty) {
              const paperInfoDoc = paperInfoQuery.docs[0];
              const paperInfoData = paperInfoDoc.data();
              shellNum = paperInfoData.shellNum || '-';
            }
          } catch (error) {
            console.error("Error fetching shellNum:", error);
          }
          
          return {
            id: docSnap.id,
            type: data.type || '-',
            packaging: data.packaging || '-',
            gramm: data.gramm || '-',
            shellNum
          };
        })
      );

      console.log("Parsed product types array:", productTypesArray);
      setProductTypesData(productTypesArray);
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
  }, []);

  // ... (keep all your existing state and other functions)
const [selectedClientProduct, setSelectedClientProduct] = useState(null);

const handleOpenModal = (client) => {
  setSelectedClient(client);


  if (client.designType === "standart") {
    const fetchProductData = async () => {
      if (client.productId) {
        try {
          const productRef = doc(db, "productTypes", client.productId);
          const productSnap = await getDoc(productRef);
          console.log(11)
          if (productSnap.exists()) {
            setSelectedClientProduct(productSnap.data());
          console.log(22, productSnap.data())

          } else {
            console.warn("Product not found for client:", client.id);
            setSelectedClientProduct(null); // Ensure state is cleared if not found
          }
        } catch (error) {
          console.error("Error fetching product data:", error);
          setSelectedClientProduct(null); // Ensure state is cleared on error
        }
      } else {
        setSelectedClientProduct(null); // Ensure state is cleared if no productId
        console.log(33)
        
      }
      setSimpleModalOpen(true); // MOVE THIS LINE HERE
    };
    fetchProductData();
  } else {
    // For "unique" or any other designType, use the full modal
    setModalOpen(true);
  }
};

// ... (keep the rest of your Welcome component code)

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

  const ClientsTable = () => (
    <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
      <Table sx={{ minWidth: 650 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
            {columnHeaders
              .filter(header => !hiddenColumns.includes(header))
              .map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                    padding: '16px'
                  }}
                >
                  {header === '№' ? '№' :
                    header === 'name' ? 'Название ресторана' :
                    header === 'shellNum' ? 'Номер полки' :
                    header === 'packaging' ? 'Упаковка' :
                    header === 'paperRemaining' ? 'Остаток бумаги' :
                    header === 'Actions' ? 'Действия' :
                    header}
                </TableCell>
              ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredClients.map((client, index) => {
            const lowPaper =
              client.paperRemaining !== undefined &&
              client.notifyWhen !== undefined &&
              client.paperRemaining <= client.notifyWhen;

            return (
              <TableRow
                key={client.id}
                sx={{
                  borderBottom: lowPaper ? '3px solid #f44336' : '1px solid #e0e0e0',
                  '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                  '&:hover': { backgroundColor: '#e3f2fd' }
                }}
              >
                {columnHeaders
                  .filter(field => !hiddenColumns.includes(field))
                  .map((field) => (
                    <TableCell key={field} sx={{ padding: '16px' }}>
                      {field === '№' ? index + 1 :
                        field === 'name' ? (
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
                        ) : field === 'Actions' ? (
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
                        ) : field === 'shellNum' ? (
                          client.shellNum || '-'
                        ) : field === 'packaging' ? (
                          client.packaging || '-'
                        ) : (
                          client[field] ?? '-'
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
              <TableCell sx={{ padding: '16px' }}>
                {index + 1}
              </TableCell>
              <TableCell sx={{ padding: '16px' }}>
                {product.type}
              </TableCell>
              <TableCell sx={{ padding: '16px' }}>
                {product.packaging}
              </TableCell>
              <TableCell sx={{ padding: '16px' }}>
                {product.gramm}
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
            <img
              src="https://whiteray.uz/images/whiteray_1200px_logo_green.png"
              alt="WhiteRay"
              style={{ height: 38, objectFit: 'contain' }}
            />

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
        fontWeight : '700',
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
        <SimpleClientModal
          open={simpleModalOpen}
          onClose={handleCloseSimpleModal}
          client={selectedClient}
        />

        {/* Full Client Details Modal (for designType: "unique") */}
        <ClientDetailsModal
          open={modalOpen}
          onClose={handleCloseModal}
          client={selectedClient}
          onClientUpdate={handleClientUpdate}
        />
      </Container>
    </>
  );
}