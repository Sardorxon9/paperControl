import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, Timestamp, query, orderBy, getDocs, getDoc } from "firebase/firestore";
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
  Alert
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { checkAndNotifyLowPaper } from "./notificationService";

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 1200,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 5,
  borderRadius: 2,
  maxHeight: '95vh',
  overflow: 'hidden'
};

export default function ClientDetailsModal({ 
  open, 
  onClose, 
  client, 
  onClientUpdate,
  currentUser, // Add this prop to get current user info including chatId
   hasTracking
}) {
  const [paperRemaining, setPaperRemaining] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingPaper, setAddingPaper] = useState(false);
  const [paperToAdd, setPaperToAdd] = useState("");
  const [notifyWhen, setNotifyWhen] = useState("");
  const [updatingNotify, setUpdatingNotify] = useState(false);
  const [showAddPaperInput, setShowAddPaperInput] = useState(false);
  const [showEditPaperInput, setShowEditPaperInput] = useState(false);
  const [logs, setLogs] = useState([]);
  const [productType, setProductType] = useState(null);
  
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
      setPaperRemaining(client.paperRemaining || "");
      setNotifyWhen(client.notifyWhen || "");
      fetchLogs(client.id);
      
      // Fetch product type data
      if (client.productId) {
        fetchProductType(client.productId).then(setProductType);
      }
    }
  }, [client]);

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

  const fetchLogs = async (clientId) => {
    try {
      const logsRef = collection(db, "clients", clientId, "logs");
      const q = query(logsRef, orderBy("dateRecorded", "desc"));
      const snap = await getDocs(q);
      const logsArr = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(logsArr);
    } catch (error) {
      console.error("Error fetching logs:", error);
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

  // currentUser.chatId is already the right value (supplied by Welcome.js)
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
        chatId, // ← comes from Firestore users/{doc}.chatId
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
    setPaperRemaining("");
    setPaperToAdd("");
    setNotifyWhen("");
    setSaving(false);
    setAddingPaper(false);
    setUpdatingNotify(false);
    setShowAddPaperInput(false);
    setShowEditPaperInput(false);
    setLogs([]);
    setProductType(null);
    onClose();
  };

  const handleSave = async () => {
    if (!client) return;
    
    setSaving(true);
    try {
      const totalKg = parseFloat(client.totalKg) || 0;
      const newPaperRemaining = parseFloat(paperRemaining) || 0;
      const thresholdValue = parseFloat(client.notifyWhen) || parseFloat(notifyWhen) || 3;
      const newPaperUsed = totalKg - newPaperRemaining;
      
      if (newPaperRemaining > totalKg) {
        alert(`Остаток бумаги (${newPaperRemaining}) не может превышать общий вес`);
        return;
      }
      
      if (newPaperRemaining < 0) {
        alert("Остаток бумаги не может быть отрицательным");
        return;
      }

      const clientRef = doc(db, "clients", client.id);
      await updateDoc(clientRef, {
        paperRemaining: newPaperRemaining,
        paperUsed: newPaperUsed
      });

      // Update the client data in parent component
      const updatedClient = {
        ...client,
        paperRemaining: newPaperRemaining,
        paperUsed: newPaperUsed
      };
      
      onClientUpdate(updatedClient);

      console.log("Successfully updated paper data:", {
        totalKg,
        paperUsed: newPaperUsed,
        paperRemaining: newPaperRemaining
      });

       // 🆕 NEW: Check and send low paper notification
    try {
      const notificationResult = await checkAndNotifyLowPaper(
        updatedClient,
        newPaperRemaining,
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

      if (!notificationResult.success && notificationResult.error) {
        console.error("Notification error:", notificationResult.error);
        // Optionally show error to user, but don't block the main save operation
        setSnackbar({
          open: true,
          message: `Данные сохранены, но ошибка отправки уведомления: ${notificationResult.error}`,
          severity: 'warning'
        });
      }
    } catch (notificationError) {
      console.error("Error sending notification:", notificationError);
      // Don't block the save operation due to notification errors
      setSnackbar({
        open: true,
        message: 'Данные сохранены, но возникла ошибка при отправке уведомления',
        severity: 'warning'
      });
    }


      
      setShowEditPaperInput(false);
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Ошибка при сохранении данных. Пожалуйста, попробуйте еще раз.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPaper = async () => {
    if (!client || !paperToAdd) return;

    setAddingPaper(true);
    try {
      const amount = parseFloat(paperToAdd);
      
      if (amount <= 0) {
        alert("Количество должно быть больше 0.");
        return;
      }

      const clientRef = doc(db, "clients", client.id);
      const currentTotal = parseFloat(client.totalKg) || 0;
      const currentRemaining = parseFloat(client.paperRemaining) || 0;

      const updatedTotal = currentTotal + amount;
      const updatedRemaining = currentRemaining + amount;
      const updatedUsed = updatedTotal - updatedRemaining;

      const logsRef = collection(db, "clients", client.id, "logs");
      await addDoc(logsRef, {
        paperIN: amount,
        dateRecorded: Timestamp.now(),
        type: "priyemka"
      });

      await updateDoc(clientRef, {
        totalKg: updatedTotal,
        paperRemaining: updatedRemaining,
        paperUsed: updatedUsed
      });

      // Update the client data in parent component
      const updatedClient = {
        ...client,
        totalKg: updatedTotal,
        paperRemaining: updatedRemaining,
        paperUsed: updatedUsed
      };
      
      onClientUpdate(updatedClient);
      setPaperRemaining(updatedClient.paperRemaining.toString());

      await fetchLogs(client.id);
      setPaperToAdd("");
      setShowAddPaperInput(false);
    } catch (e) {
      console.error("Ошибка при добавлении бумаги:", e);
      alert("Не удалось добавить бумагу. Попробуйте снова.");
    } finally {
      setAddingPaper(false);
    }
  };

  const getPaperData = (totalKg, remaining, notifyWhen) => {
    const total = parseFloat(totalKg) || 0;
    const remainingAmount = parseFloat(remaining) || 0;
    const usedAmount = total - remainingAmount;
    const threshold = parseFloat(notifyWhen) || 3;
    
    const remainingColor = remainingAmount < threshold ? '#f44336' : '#4caf50';
    
    return [
      {
        name: 'Использовано',
        value: usedAmount,
        color: '#e0e0e0'
      },
      {
        name: 'Остаток',
        value: remainingAmount,
        color: remainingColor
      }
    ];
  };

  if (!client) return null;

console.log(hasTracking);
  return (
    <>
    <Modal open={open} onClose={handleCloseModal} aria-labelledby="client-details-modal">
  <Box
    sx={{
      ...modalStyle,
      width: 'auto',
      maxWidth: '95vw',
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
      {/* Box 1 */}
      <Grid item xs={12} sm={4}>
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
                {client.orgName || 'Не указан'}
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

      {/* Box 2 — dynamic based on tracking */}
     {hasTracking ? (
  <>
    {/* Box 2 */}
    <Grid item xs={12} sm={4}>
      <Paper
        elevation={2}
        sx={{
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#fafafa',
        }}
      >
        {/* Shelf */}
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Typography variant="body1" color="#9fb1af" sx={{ fontSize: '1.125rem', mb: 1 }}>
            Номер полки
          </Typography>
          <Box
            sx={{
              width: 120,
              height: 80,
              border: '2px solid #BDDCD8',
              borderRadius: 3,
              backgroundColor: '#E2F0EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#065345', fontSize: 34, fontWeight: 800 }}>
              {client.shellNum}
            </Typography>
          </Box>
        </Box>

        {/* Remaining paper */}
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <Typography variant="body1" color="#9fb1af" sx={{ fontSize: '1.125rem', mb: 1 }}>
            Остаток бумаги
          </Typography>
          <Box
            sx={{
              width: 120,
              height: 80,
              border: '2px solid #BDDCD8',
              borderRadius: 3,
              backgroundColor: '#E2F0EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#065345', fontSize: 34, fontWeight: 800 }}>
              {paperRemaining || client.paperRemaining || 0}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body1" color="text.secondary" mb={3}>
          кг осталось
        </Typography>

        {showEditPaperInput ? (
          <Stack spacing={2} width="100%">
            <TextField
              label="Остаток (кг)"
              type="number"
              value={paperRemaining}
              onChange={(e) => setPaperRemaining(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={handleSave} disabled={saving} fullWidth>
                {saving ? 'Сохранение…' : 'Сохранить'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setShowEditPaperInput(false)}
                disabled={saving}
                fullWidth
              >
                Отмена
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Button
            variant="contained"
            onClick={() => setShowEditPaperInput(true)}
            sx={{
              backgroundColor: '#0F9D8C',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#0b7f73',
              },
            }}
            startIcon={<EditIcon />}
          >
            Редактировать
          </Button>
        )}
      </Paper>
    </Grid>

    {/* Box 3: История приёмки */}
    <Grid item xs={12} sm={4}>
      <Paper
        elevation={2}
        sx={{
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#fafafa',
        }}
      >
        {showAddPaperInput ? (
          <Stack spacing={2} mb={2}>
            <TextField
              label="Количество (кг)"
              type="number"
              value={paperToAdd}
              onChange={(e) => setPaperToAdd(e.target.value)}
              inputProps={{ step: '0.01', min: 0 }}
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
            sx={{ mb: 2 }}
          >
            Добавить бумагу
          </Button>
        )}

        {logs.length > 0 && (
          <Box flex={1}>
            <Typography variant="h6" textAlign="center" mb={1}>
              История приёмки
            </Typography>
            <TableContainer sx={{ maxHeight: 220, border: '1px solid #e0e0e0' }}>
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
                  {logs.map((log) => (
                    <TableRow key={log.id} hover>
                      <TableCell>{log.dateRecorded.toDate().toLocaleDateString()}</TableCell>
                      <TableCell sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                        {log.paperIN}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Grid>
  </>
) : (
  // Non-tracking clients (Box 2 only)
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
        minHeight: '100%',
      }}
    >
      <Box sx={{ maxWidth: 300, textAlign: 'center' }}>
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