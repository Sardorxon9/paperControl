// ProductDetailsModal.js

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
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from "@mui/material";

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
      
      // Update paperInfo total
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
                                  variant="contained"
                                  sx={{
                                    backgroundColor: '#0F9D8C',
                                    color: "white",
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

export default ProductDetailsModal;