import { useState, useEffect } from "react";
import { collection, addDoc, updateDoc, doc, Timestamp, query, orderBy, getDocs, getDoc } from "firebase/firestore";
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
  TableBody
} from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import CloseIcon from '@mui/icons-material/Close';

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
  onClientUpdate 
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

  return (
    <Modal
      open={open}
      onClose={handleCloseModal}
      aria-labelledby="client-details-modal"
    >
      <Box sx={modalStyle}>
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

        <Grid container spacing={2} sx={{ height: 'calc(100% - 140px)' }}>
          {/* Box 1: Restaurant info */}
          <Grid item xs={12} sm={3}>
            <Paper elevation={2} sx={{ p: 2.5, height: '100%', width:'245px', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
              <Box textAlign="left" mb={3}>
                
                <Typography variant="h4" fontWeight="bold" mb={1} sx={{ fontSize: '2rem' }}>Имя: {client.restaurant || client.name}
                </Typography>
                <Typography variant="h6" color="#0F9D8C" mb={2} sx={{ fontSize: '1.7rem' }}>
                  {productType ? ` ${productType.packaging}, ${productType.type}, ${productType.gramm}г` : 'Загрузка...'}
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="body1" color="text.secondary" fontWeight="bold" sx={{ fontSize: '1.125rem' }}>
                    Полный адрес:
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>
                    {client.addressLong ? `${client.addressLong.latitude}, ${client.addressLong.longitude}` : 'Не указан'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body1" color="text.secondary" fontWeight="bold" sx={{ fontSize: '1.125rem' }}>
                    Короткий адрес:
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>
                    {client.addressShort || 'Не указан'}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body1" color="text.secondary" fontWeight="bold" sx={{ fontSize: '1.125rem' }}>
                    Комментарий:
                  </Typography>
                  <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>
                    {client.comment || 'Нет комментария'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Box 2: Paper remaining with edit */}
          <Grid item xs={12} sm={3}>
            <Paper elevation={2} sx={{ p: 2.5, height: '100%', display: 'flex', width:'245px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa' }}>
              <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold" color="text.secondary" mb={1} sx={{ fontSize: '1.25rem' }}>
                  Номер полки
                </Typography>
                <Typography 
                  variant="h2" 
                  fontWeight="bold" 
                  color="#1976d2" 
                  border="2px solid #616060ff" 
                  borderRadius={1} 
                  sx={{ 
                    width: '120px', 
                    height: '80px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}
                >
                  {client.shellNum}
                </Typography>
              </Box>

              <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold" color="text.secondary" mb={1} sx={{ fontSize: '1.25rem' }}>
                  Остаток бумаги
                </Typography>
                <Typography 
                  variant="h2" 
                  fontWeight="bold" 
                  color="primary" 
                  border="2px solid #616060ff" 
                  borderRadius={1} 
                  sx={{ 
                    width: '120px', 
                    height: '80px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '2rem'
                  }}
                >
                  {paperRemaining || client.paperRemaining || 0}
                </Typography>
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
                >
                  Редактировать
                </Button>
              )}
            </Paper>
          </Grid>

          {/* Box 3: Paper management */}
          <Grid item xs={12} sm={3}>
            <Paper elevation={2} sx={{ p: 2.5, height: '100%', width:'250px', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
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

          {/* Box 4: Donut chart */}
          <Grid item xs={12} sm={3}>
            <Paper elevation={2} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa' }}>
              <Box sx={{ position: 'relative', width: 250, height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPaperData(
                        client.totalKg,
                        paperRemaining || client.paperRemaining,
                        notifyWhen || client.notifyWhen
                      )}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {getPaperData(
                        client.totalKg,
                        paperRemaining || client.paperRemaining,
                        notifyWhen || client.notifyWhen
                      ).map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="primary">
                    {paperRemaining || client.paperRemaining || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    кг
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={2} mt={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#e0e0e0', borderRadius: '50%' }} />
                  <Typography variant="body2">Использовано</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', borderRadius: '50%' }} />
                  <Typography variant="body2">Остаток</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  );
}