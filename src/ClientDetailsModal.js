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
  CardContent,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { checkAndNotifyLowPaper } from "./notificationService";
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';


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

// New state for correction mode
const [isCorrection, setIsCorrection] = useState(false);
const [correctWeight, setCorrectWeight] = useState("");

// State for ftulka deletion modal
const [showFtulkaModal, setShowFtulkaModal] = useState(false);
const [ftulkaWeight, setFtulkaWeight] = useState("");
const [rollToDelete, setRollToDelete] = useState(null);

  
  // Telegram integration states
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Initialize state when client changes
  useEffect(() => {
  if (client) {
    // Always fetch logs for all clients
    fetchLogs();
    
    if (hasTracking) {
      fetchPaperRolls();
    }
    
    // Fetch product type data
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
      
  const rollsData = rollsSnapshot.docs
  .map(doc => ({
    id: doc.id,
    ...doc.data()
      }))
      .filter(roll => roll.status !== 'deleted');// Filter out deleted rolls
      
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
    const logsQuery = query(logsRef, orderBy('date', 'desc'));
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
    // Update the client object in parent component immediately
const updatedClientForTotalKg = {
  ...client,
  totalKg: (client.totalKg || 0) + amount
};
onClientUpdate(updatedClientForTotalKg);

// Add log entry for paper addition
const logsRef = collection(db, `clients/${client.id}/logs`);
await addDoc(logsRef, {
  date: Timestamp.now(),
  userID: currentUser?.uid || 'unknown', 
  actionType: 'paperIn',
  amount: amount,
  details: `Added ${amount}kg of paper`,
});

// Recalculate current total remaining from all rolls
const newRemaining = await updateClientTotalPaper(client.id);

// Update client data in parent component
const updatedClient = {
  ...client, 
  totalKg: (client.totalKg || 0) + amount,
  paperRemaining: newRemaining
};

// Fetch updated logs
await fetchLogs();
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
// New intelligent handleUpdateRoll function
const handleUpdateRoll = async (rollId, newAmount) => {
  if (isNaN(newAmount) || parseFloat(newAmount) < 0) {
    alert('Пожалуйста, введите корректное количество бумаги');
    return;
  }

  const newAmountValue = parseFloat(newAmount);

  // Check if user is trying to "delete" the roll (entered 0)
  if (newAmountValue === 0) {
    setRollToDelete(rollId);
    setShowFtulkaModal(true);
    return;
  }

  setUpdatingRoll(true);

  try {
    // Get current roll data
    const rollRef = doc(db, `clients/${client.id}/paperRolls`, rollId);
    const rollSnap = await getDoc(rollRef);

    if (!rollSnap.exists()) {
      throw new Error('Roll not found');
    }

    const currentAmount = rollSnap.data().paperRemaining || 0;

    if (isCorrection) {
      // CORRECTION MODE: User is fixing a data entry error
      await handleCorrectionMode(rollId, rollRef, currentAmount, newAmountValue);
    } else {
      // USAGE MODE: User is recording paper consumption
      await handleUsageMode(rollId, rollRef, currentAmount, newAmountValue);
    }

    // Recalculate and update clients/{id}.paperRemaining (and totalRolls)
    const newRemaining = await updateClientTotalPaper(client.id);

    // Update parent UI client object
    const updatedClient = {
      ...client,
      paperRemaining: newRemaining
    };
    onClientUpdate(updatedClient);

    // Check for low paper notification
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
    setIsCorrection(false);
    setCorrectWeight('');
    await fetchPaperRolls();
    await fetchLogs();

  } catch (error) {
    console.error('Error updating roll:', error);
    alert('Ошибка при обновлении рулона');
  } finally {
    setUpdatingRoll(false);
  }
};

// Helper function for handling correction mode
const handleCorrectionMode = async (rollId, rollRef, oldAmount, newCorrectAmount) => {
  const difference = newCorrectAmount - oldAmount;

  // Update the roll document
  await updateDoc(rollRef, {
    paperRemaining: newCorrectAmount
  });

  // Update client's totalKg (this corrects the lifetime purchase record)
  const clientRef = doc(db, 'clients', client.id);
  await updateDoc(clientRef, {
    totalKg: increment(difference) // Can be positive or negative
  });

  // Create correction log entry
  const logsRef = collection(db, `clients/${client.id}/logs`);
  await addDoc(logsRef, {
    date: Timestamp.now(),
    userID: currentUser?.uid || 'unknown',
    actionType: 'fixing',
    amount: Math.abs(difference),
    details: `Roll corrected from ${oldAmount}kg to ${newCorrectAmount}kg (${difference > 0 ? '+' : ''}${difference.toFixed(2)}kg adjustment)`,
    rollId: rollId
  });

  console.log(`Correction: Roll ${rollId} corrected by ${difference.toFixed(2)}kg`);
};

// Helper function for handling usage mode
const handleUsageMode = async (rollId, rollRef, oldAmount, newAmount) => {
  const amountUsed = oldAmount - newAmount;

  if (amountUsed <= 0) {
    // If no paper was used, just update the roll (user might be adding paper back)
    await updateDoc(rollRef, {
      paperRemaining: newAmount
    });
    return;
  }

  // Update the roll document
  await updateDoc(rollRef, {
    paperRemaining: newAmount
  });

  // Create usage log entry (totalKg remains unchanged for usage)
  const logsRef = collection(db, `clients/${client.id}/logs`);
  await addDoc(logsRef, {
    date: Timestamp.now(),
    userID: currentUser?.uid || 'unknown',
    actionType: 'paperOut',
    amount: amountUsed,
    details: `Paper used from roll`,
    rollId: rollId
  });

  console.log(`Usage: ${amountUsed.toFixed(2)}kg used from roll ${rollId}`);
};

// Handle roll deletion with ftulka weight
const handleDeleteRollWithFtulka = async () => {
  if (!rollToDelete || !ftulkaWeight) {
    alert('Пожалуйста, введите вес футулки');
    return;
  }

  const ftulkaWeightGrams = parseFloat(ftulkaWeight);
  if (isNaN(ftulkaWeightGrams) || ftulkaWeightGrams < 0) {
    alert('Пожалуйста, введите корректный вес футулки в граммах');
    return;
  }

  setUpdatingRoll(true);

  try {
    // Get current roll data
    const rollRef = doc(db, `clients/${client.id}/paperRolls`, rollToDelete);
    const rollSnap = await getDoc(rollRef);

    if (!rollSnap.exists()) {
      throw new Error('Roll not found');
    }

    const currentAmount = rollSnap.data().paperRemaining || 0;
    const ftulkaWeightKg = ftulkaWeightGrams / 1000; // Convert grams to kg

    // Mark roll as deleted (don't actually delete the document)
    await updateDoc(rollRef, {
      status: 'deleted',
      paperRemaining: 0,
      ftulkaWeight: ftulkaWeightGrams,
      deletedAt: Timestamp.now()
    });

    // Subtract ftulka weight from client's totalKg
    const clientRef = doc(db, 'clients', client.id);
    await updateDoc(clientRef, {
      totalKg: increment(-ftulkaWeightKg) // Subtract ftulka weight
    });

    // Create deletion log entries
    const logsRef = collection(db, `clients/${client.id}/logs`);
    
    // Log the paper usage (if any paper was remaining)
    if (currentAmount > 0) {
      await addDoc(logsRef, {
        date: Timestamp.now(),
        userID: currentUser?.uid || 'unknown',
        actionType: 'paperOut',
        amount: currentAmount,
        details: `Paper used when roll was finished`,
        rollId: rollToDelete
      });
    }

    // Log the deletion with ftulka
    await addDoc(logsRef, {
      date: Timestamp.now(),
      userID: currentUser?.uid || 'unknown',
      actionType: 'paperOut',
      amount: ftulkaWeightKg,
      details: `Roll deleted with ftulka: ${ftulkaWeightGrams}g`,
      rollId: rollToDelete
    });

    // Recalculate totals
    const newRemaining = await updateClientTotalPaper(client.id);

    // Update parent UI
    const updatedClient = {
      ...client,
      paperRemaining: newRemaining,
      totalKg: (client.totalKg || 0) - ftulkaWeightKg
    };
    onClientUpdate(updatedClient);

    // Close modal and reset states
    setShowFtulkaModal(false);
    setFtulkaWeight('');
    setRollToDelete(null);
    setEditingRollId(null);
    setRollEditValue('');

    await fetchPaperRolls();
    await fetchLogs();

    setSnackbar({
      open: true,
      message: `Рулон удален. Футулка (${ftulkaWeightGrams}г) вычтена из общего веса.`,
      severity: 'success'
    });

  } catch (error) {
    console.error('Error deleting roll with ftulka:', error);
    alert('Ошибка при удалении рулона');
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
  setIsCorrection(false);
  setCorrectWeight('');
};

  // Handle saving edit
  const handleSaveEdit = () => {
    if (editingRollId && rollEditValue !== '') {
      handleUpdateRoll(editingRollId, rollEditValue);
    }

    
  };

 
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
    // Use your Vercel deployment URL instead of localhost
    // Replace 'your-vercel-app-name' with your actual Vercel app domain
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? 'paper-control.vercel.app'
      : 'http://localhost:3001';

    const response = await fetch(`${serverUrl}/api/send-location`, {
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
  
  // Add these new lines:
  setIsCorrection(false);
  setCorrectWeight('');
  setShowFtulkaModal(false);
  setFtulkaWeight('');
  setRollToDelete(null);
  
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
                    <Box>
                   <Typography variant="body1" color="#727d7b" sx={{ fontSize: '1.125rem' }}>
  Куплено за все время:
</Typography>
<Typography
  variant="h6"
  color="#3b403fff"
  sx={{ fontSize: '1.25rem', fontWeight: '600' }}
>
 {client.totalKg ? `${client.totalKg.toFixed(2)} кг` : '0.00 кг'}
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
              minWidth: 120, // Use minWidth instead of width
              height: 80,
              border: '2px solid #BDDCD8',
              borderRadius: 3,
              backgroundColor: '#E2F0EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1
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
              minWidth: 125, // Use minWidth to allow it to grow
              height: 80,
              border: '2px solid #BDDCD8',
              borderRadius: 3,
              backgroundColor: '#E2F0EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 1
            }}
          >
            <Typography 
              sx={{ 
                color: '#065345', 
                fontSize: 34, 
                fontWeight: 800,
                whiteSpace: 'nowrap' // Crucial: Prevents the text from wrapping
              }}
            >
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
  <Box display="flex" flexDirection="column" gap={1}>
    {/* Main input for remaining weight */}
    <TextField
      size="small"
      type="number"
      label="Сколько КГ осталось"
      value={rollEditValue}
      onChange={(e) => setRollEditValue(e.target.value)}
      inputProps={{ step: '0.01', min: '0' }}
      sx={{ width: 150 }}
    />
    
    {/* Correction checkbox */}
    <FormControlLabel
      control={
        <Checkbox
          checked={isCorrection}
          onChange={(e) => setIsCorrection(e.target.checked)}
          size="small"
        />
      }
      label="Исправить ошибку"
      sx={{ 
        fontSize: '0.8rem',
        '& .MuiFormControlLabel-label': { fontSize: '0.8rem' }
      }}
    />
    
    {/* Correction input field (only shows when checkbox is checked) */}
    {isCorrection && (
      <TextField
        size="small"
        type="number"
        label="Введите корректное КГ бумаги"
        value={correctWeight}
        onChange={(e) => setCorrectWeight(e.target.value)}
        inputProps={{ step: '0.01', min: '0' }}
        sx={{ width: 150 }}
        helperText="Это исправит общий вес клиента"
      />
    )}
  </Box>
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
  onClick={() => {
    const valueToUse = isCorrection ? correctWeight : rollEditValue;
    if (valueToUse !== '') {
      handleUpdateRoll(editingRollId, valueToUse);
    }
  }}
  disabled={updatingRoll || (isCorrection ? !correctWeight : !rollEditValue)}
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
      Действие
    </TableCell>
    <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
      Количество (кг)
    </TableCell>
  </TableRow>
</TableHead>
                       <TableBody>
  {logs.length === 0 ? (
    <TableRow>
      <TableCell colSpan={3} align="center">
        Нет записей
      </TableCell>
    </TableRow>
  ) : (
    logs.map((log) => {
      // Determine icon and color based on action type
    const getActionDisplay = (actionType, amount) => {
  switch (actionType) {
    case 'paperIn':
      return { 
        icon: <ArrowUpwardRoundedIcon sx={{ color: '#2e7d32' }} fontSize="small" />,
        text: '+' + amount.toFixed(2)
      };
    case 'paperOut':
      return { 
        icon: <ArrowDownwardRoundedIcon sx={{ color: '#d32f2f' }} fontSize="small" />,
        text: '-' + amount.toFixed(2)
      };
    case 'fixing':
      return { 
        icon: <AutorenewRoundedIcon sx={{ color: '#ed6c02' }} fontSize="small" />,
        text: '±' + amount.toFixed(2)
      };
    default:
      return { 
        icon: <HelpOutlineRoundedIcon sx={{ color: '#757575' }} fontSize="small" />,
        text: amount.toFixed(2)
      };
  }
};

      const actionDisplay = getActionDisplay(
        log.actionType, 
        log.amount || log.amountUsed || 0
      );

      return (
        <TableRow key={log.id} hover>
          <TableCell>
            {(log.date?.toDate?.() || log.dateRecorded?.toDate?.())?.toLocaleDateString('ru-RU') || 'N/A'}
          </TableCell>
          <TableCell>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography sx={{ fontSize: '1.2rem' }}>
                {actionDisplay.icon}
              </Typography>
            </Box>
          </TableCell>
          <TableCell sx={{ color: actionDisplay.color, fontWeight: 'bold' }}>
            {actionDisplay.text}
          </TableCell>
        </TableRow>
      );
    })
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
      {/* Ftulka Deletion Modal */}
<Dialog
  open={showFtulkaModal}
  onClose={() => {
    setShowFtulkaModal(false);
    setFtulkaWeight('');
    setRollToDelete(null);
  }}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>
    Удаление рулона
  </DialogTitle>
  <DialogContent>
    <Typography variant="body1" sx={{ mb: 2 }}>
      Это действие удалит рулон. Пожалуйста, введите вес футулки (картонного стержня) для подтверждения.
    </Typography>
    <TextField
      fullWidth
      label="Вес футулки (в граммах)"
      type="number"
      value={ftulkaWeight}
      onChange={(e) => setFtulkaWeight(e.target.value)}
      inputProps={{ step: '1', min: '0' }}
      placeholder="Например: 400"
      helperText="Этот вес будет вычтен из общего веса клиента"
      sx={{ mt: 1 }}
    />
  </DialogContent>
  <DialogActions>
    <Button
      onClick={() => {
        setShowFtulkaModal(false);
        setFtulkaWeight('');
        setRollToDelete(null);
      }}
      disabled={updatingRoll}
    >
      Отмена
    </Button>
    <Button
      onClick={handleDeleteRollWithFtulka}
      disabled={updatingRoll || !ftulkaWeight}
      variant="contained"
      color="error"
    >
      {updatingRoll ? 'Удаление...' : 'Подтвердить удаление'}
    </Button>
  </DialogActions>
</Dialog>
    </>
  );
}