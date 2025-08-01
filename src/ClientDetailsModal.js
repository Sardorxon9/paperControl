import { useState } from "react";
import { collection, addDoc, updateDoc, doc, Timestamp, query, orderBy, getDocs } from "firebase/firestore";
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
  const [logs, setLogs] = useState([]);

  // Initialize state when client changes
  useState(() => {
    if (client) {
      setPaperRemaining(client.paperRemaining || "");
      setNotifyWhen(client.notifyWhen || "");
      fetchLogs(client.id);
    }
  }, [client]);

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
    setLogs([]);
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
      
      handleCloseModal();
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

        <Grid container spacing={4} sx={{ height: 'calc(100% - 140px)' }}>
          {/* Left: Restaurant info */}
          <Grid item xs={4}>
            <Paper elevation={2} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
              <Typography variant="h6" color="primary" textAlign="center" mb={2}>
                Информация о ресторане
              </Typography>

              <Box textAlign="center" mb={2}>
                <Typography variant="h5" fontWeight="bold">
                  {client.restaurant || client.name}
                </Typography>
                <Typography variant="body1" color="#0F9D8C">
                  {client.productType}
                </Typography>
              </Box>

              <TextField
                label="Остаток (кг)"
                type="number"
                value={paperRemaining}
                onChange={(e) => setPaperRemaining(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Stack spacing={2}>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </Button>
                <Button variant="outlined" onClick={handleCloseModal} disabled={saving}>
                  Отмена
                </Button>
              </Stack>
            </Paper>
          </Grid>

          {/* Center: Chart */}
          <Grid item xs={4}>
            <Paper elevation={2} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa' }}>
              <Typography variant="h6" color="primary" mb={2}>
                Использование бумаги
              </Typography>

              <Typography variant="h2" fontWeight="bold" color="#1976d2" border="2px solid #616060ff" borderRadius={1} px={2} mb={2}>
                {client.shellNum}
              </Typography>

              <Box sx={{ position: 'relative', width: 280, height: 280 }}>
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
                      innerRadius={70}
                      outerRadius={120}
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
                  <Typography variant="h2" fontWeight="bold" color="primary">
                    {paperRemaining || client.paperRemaining || 0}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    кг осталось
                  </Typography>
                </Box>
              </Box>

              <Stack direction="row" spacing={3} mt={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 16, height: 16, bgcolor: '#e0e0e0', borderRadius: '50%' }} />
                  <Typography>Использовано</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box sx={{ width: 16, height: 16, bgcolor: '#4caf50', borderRadius: '50%' }} />
                  <Typography>Остаток</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Right: Paper management */}
          <Grid item xs={4}>
            <Paper elevation={2} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
              <Typography variant="h6" color="primary" textAlign="center" mb={2}>
                Приёмка бумаги
              </Typography>

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
                >
                  Добавить бумагу
                </Button>
              )}

              {logs.length > 0 && (
                <Box mt={3} flex={1}>
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
        </Grid>
      </Box>
    </Modal>
  );
}