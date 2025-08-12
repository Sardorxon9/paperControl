import { useState, useEffect } from "react";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  query, 
  orderBy, 
  getDocs, 
  getDoc,
  deleteDoc,
  increment 
} from "firebase/firestore";
import EditIcon from '@mui/icons-material/Edit';
import TelegramIcon from '@mui/icons-material/Telegram';
import { db } from "./firebase";
import {
  Box,
  Button,
  Modal,
  TextField,
  Stack,
  Divider,
  Grid,
  IconButton,
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
  Alert,
  Card,
  CardContent
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { checkAndNotifyLowPaper } from "./notificationService";

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%', // <-- Adjusted for responsiveness
  maxWidth: '1200px', // <-- Added max width to prevent it from getting too wide
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 5,
  borderRadius: 2,
  maxHeight: '95vh',
  overflowY: 'auto' // <-- Changed to auto to allow scrolling if needed
};

export default function ClientDetailsModal({ 
  open, 
  onClose, 
  client, 
  onClientUpdate,
  currentUser,
  hasTracking
}) {
  // New state variables for multiple paper rolls
  const [paperRolls, setPaperRolls] = useState([]);
  const [logs, setLogs] = useState([]);
  const [productType, setProductType] = useState(null);
  
  // Paper addition state
  const [addingPaper, setAddingPaper] = useState(false);
  const [paperToAdd, setPaperToAdd] = useState("");
  const [showAddPaperInput, setShowAddPaperInput] = useState(false);
  
  // Paper roll editing state
  const [editingRollId, setEditingRollId] = useState(null);
  const [rollEditValue, setRollEditValue] = useState("");
  const [updatingRoll, setUpdatingRoll] = useState(false);
  
  // Telegram integration states
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Initialize state when client changes
  useEffect(() => {
    if (client && hasTracking) {
      fetchPaperRolls();
      fetchLogs();
      
      // Fetch product type data
      if (client.productId) {
        fetchProductType(client.productId).then(setProductType);
      }
    } else if (client) {
      // For non-tracking clients, still fetch product type
      if (client.productId) {
        fetchProductType(client.productId).then(setProductType);
      }
    }
  }, [client, hasTracking]);

  

  // Fetch paper rolls from the new subcollection
  const fetchPaperRolls = async () => {
    if (!client?.id) return;

    try {
      const rollsRef = collection(db, `clients/${client.id}/paperRolls`);
      const rollsQuery = query(rollsRef, orderBy('dateCreated', 'asc'));
      const rollsSnapshot = await getDocs(rollsQuery);
      
      const rollsData = rollsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPaperRolls(rollsData);
    } catch (error) {
      console.error('Error fetching paper rolls:', error);
    }
  };

  useEffect(() => {
  if (open && client?.designType === 'unique') {
    fetchPaperRolls();
  }
}, [open, client]);


  // Fetch logs from the logs subcollection (now tracks usage, not additions)
  const fetchLogs = async () => {
    if (!client?.id) return;

    try {
      const logsRef = collection(db, `clients/${client.id}/logs`);
      const logsQuery = query(logsRef, orderBy('dateRecorded', 'desc'));
      const logsSnapshot = await getDocs(logsQuery);
      
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchProductType = async (productId) => {
    try {
      if (!productId) return null;
      const productRef = doc(db, "productTypes", productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        return productSnap.data();
      }
      return null;
    } catch (error) {
      console.error("Error fetching product type:", error);
      return null;
    }
  };

  

const calculateTotalPaper = () => {
  return paperRolls.reduce((total, roll) => total + (roll.paperRemaining || 0), 0);
};

  // Handle adding new paper (Priyemka functionality)
// Handle adding new paper (Priyemka functionality)
const handleAddPaper = async () => {
  if (!client || !paperToAdd) return;

  setAddingPaper(true);
  const amount = parseFloat(paperToAdd);

  if (isNaN(amount) || amount <= 0) {
    alert("Пожалуйста, введите корректное количество больше 0.");
    setAddingPaper(false);
    return;
  }

  try {
    // Create new document in paperRolls subcollection
    const rollsRef = collection(db, `clients/${client.id}/paperRolls`);
    await addDoc(rollsRef, {
      dateCreated: Timestamp.now(),
      paperRemaining: amount
    });

    // Update totalKg in clients/{id} (all-time cumulative)
    const clientRef = doc(db, 'clients', client.id);
    await updateDoc(clientRef, {
      totalKg: increment(amount) // <- important: increment totalKg in firestore
    });

    // Recalculate current total remaining from all rolls and update clients/{id}.paperRemaining
    const newRemaining = await updateClientTotalPaper(client.id);

    // Update client data in parent component (reflect new totals immediately in UI)
    const updatedClient = {
      ...client,
      totalKg: (client.totalKg || 0) + amount,
      paperRemaining: newRemaining
    };
    onClientUpdate(updatedClient);

    // Reset input and refresh data
    setPaperToAdd("");
    setShowAddPaperInput(false);
    await fetchPaperRolls();

    console.log(`Added ${amount}kg of paper for client ${client.id}`);
  } catch (error) {
    console.error('Error adding paper:', error);
    alert('Ошибка при добавлении бумаги');
  } finally {
    setAddingPaper(false);
  }
};

// Recalculate the total paperRemaining from all rolls and update main client doc
const updateClientTotalPaper = async (clientId) => {
  // read all rolls
  const rollsRef = collection(db, `clients/${clientId}/paperRolls`);
  const rollsSnapshot = await getDocs(rollsRef);

  // sum remaining
  const totalRemaining = rollsSnapshot.docs.reduce(
    (sum, d) => sum + (d.data().paperRemaining || 0),
    0
  );

  // optional: count of rolls
  const totalRolls = rollsSnapshot.size || rollsSnapshot.docs.length || 0;

  // update parent client doc atomically (no change to totalKg here)
  const clientRef = doc(db, 'clients', clientId);
  await updateDoc(clientRef, {
    paperRemaining: totalRemaining,
    totalRolls: totalRolls
  });

  // return the number for immediate UI updates
  return totalRemaining;
};





  // Handle updating a specific roll
// Handle updating a specific roll
// Handle updating a specific roll
const handleUpdateRoll = async (rollId, newAmount) => {
  if (isNaN(newAmount) || parseFloat(newAmount) < 0) {
    alert('Пожалуйста, введите корректное количество бумаги');
    return;
  }

  setUpdatingRoll(true);
  const newAmountValue = parseFloat(newAmount);

  try {
    // Get current roll data to calculate amount used
    const rollRef = doc(db, `clients/${client.id}/paperRolls`, rollId);
    const rollSnap = await getDoc(rollRef);

    if (!rollSnap.exists()) {
      throw new Error('Roll not found');
    }

    const currentAmount = rollSnap.data().paperRemaining || 0;
    const amountUsed = currentAmount - newAmountValue;

    // If newAmountValue is zero (or <= 0), consider the roll fully used and DELETE it
    if (newAmountValue <= 0) {
      // If any amount was used, record a log
      if (amountUsed > 0) {
        const logsRef = collection(db, `clients/${client.id}/logs`);
        await addDoc(logsRef, {
          dateRecorded: Timestamp.now(),
          amountUsed: amountUsed,
          rollId: rollId,
          action: 'used_up' // optional flag
        });
      }

      // Delete the roll document
      await deleteDoc(rollRef);
    } else {
      // Otherwise, just update the remaining amount on the roll
      await updateDoc(rollRef, {
        paperRemaining: newAmountValue
      });

      // If paper decreased, add a usage log
      if (amountUsed > 0) {
        const logsRef = collection(db, `clients/${client.id}/logs`);
        await addDoc(logsRef, {
          dateRecorded: Timestamp.now(),
          amountUsed: amountUsed,
          rollId: rollId,
          action: 'used_partial' // optional flag
        });
      }
    }

    // Recalculate and update clients/{id}.paperRemaining (and totalRolls)
    const newRemaining = await updateClientTotalPaper(client.id);

    // Update parent UI client object (do not change totalKg here)
    const updatedClient = {
      ...client,
      paperRemaining: newRemaining
    };
    onClientUpdate(updatedClient);

    // Check for low paper notification (same as your existing logic)
    try {
      const thresholdValue = parseFloat(client.notifyWhen) || 3;
      const notificationResult = await checkAndNotifyLowPaper(
        updatedClient,
        updatedClient.paperRemaining,
        thresholdValue,
        db
      );

      if (notificationResult.notificationSent) {
        setSnackbar({
          open: true,
          message: `Уведомление отправлено ${notificationResult.successfulNotifications} администраторам о низком уровне бумаги!`,
          severity: 'info'
        });
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
    }

    // Reset editing state and refresh data
    setEditingRollId(null);
    setRollEditValue('');
    await fetchPaperRolls();
    await fetchLogs();

    console.log(`Updated roll ${rollId}: used ${amountUsed}kg`);
  } catch (error) {
    console.error('Error updating roll:', error);
    alert('Ошибка при обновлении рулона');
  } finally {
    setUpdatingRoll(false);
  }
};



  // Handle starting edit mode for a roll
  const handleStartEditRoll = (rollId, currentAmount) => {
    setEditingRollId(rollId);
    setRollEditValue(currentAmount.toString());
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
    setEditingRollId(null);
    setRollEditValue('');
  };

  // Handle saving edit
  const handleSaveEdit = () => {
    if (editingRollId && rollEditValue !== '') {
      handleUpdateRoll(editingRollId, rollEditValue);
    }

    
  };

  // Telegram integration function
  const handleSendViaTelegram = async () => {
    if (!client?.addressLong?.latitude || !client?.addressLong?.longitude) {
      setSnackbar({
        open: true,
        message: 'Ошибка: отсутствуют координаты ресторана',
        severity: 'error',
      });
      return;
    }

    const { chatId } = currentUser || {};
    if (!chatId) {
      setSnackbar({
        open: true,
        message: 'Ошибка: отсутствует chatId пользователя',
        severity: 'error',
      });
      return;
    }

    setSendingTelegram(true);

    try {
      const response = await fetch('http://localhost:3001/send-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          restaurantName: client.restaurant || client.name,
          latitude: client.addressLong.latitude,
          longitude: client.addressLong.longitude,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSnackbar({
          open: true,
          message: 'Локация успешно отправлена в Telegram!',
          severity: 'success',
        });
      } else {
        throw new Error(result.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error('Error sending via Telegram:', error);
      setSnackbar({
        open: true,
        message: `Ошибка отправки: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setSendingTelegram(false);
    }
  };

  const handleCloseModal = () => {
    setPaperRolls([]);
    setLogs([]);
    setProductType(null);
    setPaperToAdd("");
    setShowAddPaperInput(false);
    setEditingRollId(null);
    setRollEditValue('');
    setAddingPaper(false);
    setUpdatingRoll(false);
    setSendingTelegram(false);
    onClose();
  };

  if (!client) return null;

  return (
    <>
      <Modal open={open} onClose={handleCloseModal} aria-labelledby="client-details-modal">
        <Box
          sx={{
            ...modalStyle,
            width: '90%',
            maxWidth: '1200px',
            overflow: 'auto',
          }}
        >
          <IconButton
            onClick={handleCloseModal}
            sx={{ position: 'absolute', right: 16, top: 16, color: 'grey.500' }}
          >
            <CloseIcon />
          </IconButton>

          <Typography variant="h4" gutterBottom fontWeight="bold">
            Детали клиента
          </Typography>
          <Divider sx={{ mb: 4 }} />

          <Grid container spacing={2}>
            {/* Left Section - Client Details */}
            <Grid item xs={12} md={4}> {/* <-- Changed sm to md */}
              <Paper
                elevation={2}
                sx={{
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: '#fafafa',
                }}
              >
                <Box textAlign="left" mb={3}>
                  <Typography variant="h4" fontWeight="bold" mb={1} sx={{ fontSize: '1.6rem' }}>
                    {client.restaurant || client.name}
                  </Typography>
                  <Typography variant="h6" color="#0F9D8C" mb={2} sx={{ fontSize: '1.2rem' }}>
                    {productType
                      ? `${productType.packaging}, ${productType.type}, ${productType.gramm}г`
                      : 'Загрузка...'}
                  </Typography>
                </Box>

                <Stack spacing={2}>
                  <Box>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                      <Typography variant="body1" color="#727d7b" sx={{ fontSize: '1.125rem' }}>
                        Гео-локация :
                      </Typography>
                      {client.addressLong?.latitude && client.addressLong?.longitude && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<TelegramIcon />}
                          onClick={handleSendViaTelegram}
                          disabled={sendingTelegram || !currentUser?.chatId}
                          sx={{
                            minWidth: 'auto',
                            px: 1,
                            py: 0.5,
                            fontSize: '0.75rem',
                            backgroundColor: '#0088cc',
                            '&:hover': {
                              backgroundColor: '#006aa3',
                            },
                          }}
                        >
                          {sendingTelegram ? '...' : 'Отправить'}
                        </Button>
                      )}
                    </Box>
                    <Typography
                      variant="h6"
                      color="#3b403fff"
                      sx={{ fontSize: '1.25rem', fontWeight: '600' }}
                    >
                      {client.addressLong
                        ? `${client.addressLong.latitude}, ${client.addressLong.longitude}`
                        : 'Не указан'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body1" color="#727d7b" sx={{ fontSize: '1.125rem' }}>
                      Название фирмы:
                    </Typography>
                    <Typography
                      variant="h6"
                      color="#3b403fff"
                      sx={{ fontSize: '1.25rem', fontWeight: '600' }}
                    >
                      {client.orgName || 'Не указано'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body1" color="#727d7b" sx={{ fontSize: '1.125rem' }}>
                      Адрес:
                    </Typography>
                    <Typography
                      variant="h6"
                      color="#3b403fff"
                      sx={{ fontSize: '1.25rem', fontWeight: '600' }}
                    >
                      {client.addressShort || 'Не указан'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body1" color="#727d7b" sx={{ fontSize: '1.125rem' }}>
                      Комментарий:
                    </Typography>
                    <Typography
                      variant="h6"
                      color="#3b403fff"
                      sx={{ fontSize: '1.25rem', fontWeight: '600' }}
                    >
                      {client.comment || 'Нет комментария'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Middle Section - Paper Rolls (only for tracked clients) */}
            {client?.designType === 'unique' ? (
              <Grid item xs={12} md={4}> {/* <-- Changed sm to md */}
                <Paper
                  elevation={2}
                  sx={{
                    p: 2.5,
                    bgcolor: '#fafafa',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Shelf Number */}
                <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, justifyContent: 'center', mb: 3 }}>
  {/* Номер полки бокс */}
  <Box display="flex" flexDirection="column" alignItems="center">
    <Typography variant="body1" color="#9fb1af" sx={{ fontSize: '1.125rem', mb: 1 }}>
      Номер полки
    </Typography>
    <Box
      sx={{
        width: 120,
        height: 80, // Updated height to match the other box
        border: '2px solid #BDDCD8',
        borderRadius: 3,
        backgroundColor: '#E2F0EE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1 // Added padding for consistency
      }}
    >
      <Typography sx={{ color: '#065345', fontSize: 34, fontWeight: 800 }}>
        {client.shellNum || '2-A'}
      </Typography>
    </Box>
  </Box>

  {/* В наличии бокс */}
  <Box display="flex" flexDirection="column" alignItems="center">
    <Typography variant="body1" color="#9fb1af" sx={{ fontSize: '1.125rem', mb: 1 }}>
      В наличии имеется
    </Typography>
    <Box
      sx={{
        width: 125,
        height: 80,
        border: '2px solid #BDDCD8',
        borderRadius: 3,
        backgroundColor: '#E2F0EE',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1 // Add some padding
      }}
    >
      <Typography sx={{ color: '#065345', fontSize: 34, fontWeight: 800 }}>
        {calculateTotalPaper().toFixed(2)} кг
      </Typography>
    </Box>
  </Box>
</Box>

                  
                  {/* Paper Rolls List */}
                  <Box flex={1} sx={{ overflow: 'auto' }}>
                    {paperRolls.map((roll, index) => (
                      <Card key={roll.id} sx={{ mb: 2, bgcolor: '#E2F0EE', border: '1px solid #BDDCD8' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
  {/* Left side - Рулон name and weight stacked vertically */}
  <Box display="flex" flexDirection="column" alignItems="flex-start">
    <Typography variant="body2" color="#727d7b" sx={{ mb: 0.5 }}>
      Рулон {index + 1}
    </Typography>
    
    {editingRollId === roll.id ? (
      <TextField
        size="small"
        type="number"
        value={rollEditValue}
        onChange={(e) => setRollEditValue(e.target.value)}
        inputProps={{ step: '0.01', min: '0' }}
        sx={{ width: 100 }}
      />
    ) : (
      <Typography variant="h6" fontWeight="bold" sx={{ color: '#065345' }}>
        {roll.paperRemaining.toFixed(2)} кг
      </Typography>
    )}
  </Box>
  
  {/* Right side - Edit buttons */}
  <Box display="flex" alignItems="center" gap={1}>
    {editingRollId === roll.id ? (
      <>
        <Button
          size="small"
          variant="contained"
          color="success"
          onClick={handleSaveEdit}
          disabled={updatingRoll}
          sx={{ minWidth: 'auto', px: 1 }}
        >
          ✓
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={handleCancelEdit}
          disabled={updatingRoll}
          sx={{ minWidth: 'auto', px: 1 }}
        >
          ✗
        </Button>
      </>
    ) : (
      <Button
        size="small"
        variant="contained"
        sx={{
          backgroundColor: '#0F9D8C',
          '&:hover': { backgroundColor: '#0b7f73' }
        }}
        onClick={() => handleStartEditRoll(roll.id, roll.paperRemaining)}
        disabled={updatingRoll || editingRollId !== null}
      >
        Редактировать
      </Button>
    )}
  </Box>
</Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </Paper>
              </Grid>
            ) : null}

            {/* Right Section - Add Paper and History (only for tracked clients) */}
            {client?.designType === 'unique' ? (
              <Grid item xs={12} md={4}> {/* <-- Changed sm to md */}
                <Paper
                  elevation={2}
                  sx={{
                    p: 2.5,
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: '#fafafa',
                    height: '100%'
                  }}
                >
                  <Typography variant="h6" textAlign="center" mb={2}>
                    Приемка новой бумаги
                  </Typography>

                  {/* Add Paper Section */}
                  <Box mb={3}>
                    {showAddPaperInput ? (
                      <Stack spacing={2}>
                      <TextField
  label="Количество (кг)"
  type="number"
  value={paperToAdd}
  onChange={(e) => setPaperToAdd(e.target.value)}
  inputProps={{ step: '0.01', min: '0.01' }}
  fullWidth
  placeholder="Например: 3.2"
/>
                        <Box display="flex" gap={1.5}>
                          <Button
                            variant="contained"
                            onClick={handleAddPaper}
                            disabled={addingPaper || !paperToAdd}
                            fullWidth
                          >
                            {addingPaper ? 'Сохранение…' : 'Сохранить'}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setShowAddPaperInput(false);
                              setPaperToAdd('');
                            }}
                            disabled={addingPaper}
                            fullWidth
                          >
                            Отмена
                          </Button>
                        </Box>
                      </Stack>
                    ) : (
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={() => setShowAddPaperInput(true)}
                        fullWidth
                        sx={{ 
                          bgcolor: 'orange',
                          '&:hover': { bgcolor: 'darkorange' }
                        }}
                      >
                        Добавить бумагу
                      </Button>
                    )}
                  </Box>

                  {/* History Section */}
                  <Box flex={1}>
                    <Typography variant="subtitle2" gutterBottom>
                      История приёмки
                    </Typography>
                    <TableContainer 
                      component={Paper} 
                      variant="outlined" 
                      sx={{ maxHeight: 250, border: '1px solid #e0e0e0' }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                              Дата
                            </TableCell>
                            <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                              Бумага (кг)
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {logs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} align="center">
                                Нет записей
                              </TableCell>
                            </TableRow>
                          ) : (
                            logs.map((log) => (
                              <TableRow key={log.id} hover>
                                <TableCell>
                                  {log.dateRecorded?.toDate?.()?.toLocaleDateString('ru-RU') || 'N/A'}
                                </TableCell>
                                <TableCell sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                  -{log.amountUsed?.toFixed(2) || '0.00'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Paper>
              </Grid>
            ) : (
              /* Non-tracking clients get a placeholder */
              <Grid item xs={12} sm={8}>
                <Paper
                  elevation={2}
                  sx={{
                    p: 3,
                    height: '100%',
                    bgcolor: '#e7f3f0ff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '300px',
                  }}
                >
                  <Box sx={{ maxWidth: 400, textAlign: 'center' }}>
                    <Typography
                      variant="h6"
                      color="text.secondary"
                      sx={{ fontSize: '13pt', fontWeight: '400' }}
                    >
                      У этого клиента нет этикетки и он использует стандартный рулон для печати.
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Box>
      </Modal>

      {/* Snackbar for notifications */}
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