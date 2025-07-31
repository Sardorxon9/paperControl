import { useEffect, useState } from "react";
import { collection, getDocs, doc, addDoc, updateDoc, Timestamp, query, orderBy } from "firebase/firestore";
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
  Divider,
  Grid,
  IconButton
} from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add'; // Add this import
import AddClientForm from './addClientForm'; // Add this import
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 1200, // Increased overall size
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 5, // Increased padding
  borderRadius: 2,
  maxHeight: '95vh',
  overflow: 'hidden'
};

export default function Welcome() {
  const [clientData, setClientData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [paperRemaining, setPaperRemaining] = useState("");
  const [saving, setSaving] = useState(false);
  const [addingPaper, setAddingPaper] = useState(false);
  const [paperToAdd, setPaperToAdd] = useState("");
  const [notifyWhen, setNotifyWhen] = useState("");
  const [updatingNotify, setUpdatingNotify] = useState(false);
  const [showAddPaperInput, setShowAddPaperInput] = useState(false);
  const [logs, setLogs] = useState([]);


const [searchQuery, setSearchQuery] = useState("");

  const [addClientModalOpen, setAddClientModalOpen] = useState(false);



  const fetchLogs = async (clientId) => {
    const logsRef = collection(db, "clients", clientId, "logs");
    const q = query(logsRef, orderBy("dateRecorded", "desc"));
    const snap = await getDocs(q);
    const logsArr = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setLogs(logsArr);
  };

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "clients"));

        const clientsArray = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          clientsArray.push({ id: docSnap.id, ...data });
        });

        console.log("Parsed clients array:", clientsArray);
        setClientData(clientsArray);

        if (clientsArray.length > 0) {
          setColumnHeaders(["№", "name", "totalKg", "paperUsed", "paperRemaining", "Actions"]);
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

    fetchClientData();
  }, []);

  const handleOpenModal = async (client) => {
    setSelectedClient(client);
    setPaperRemaining(client.paperRemaining || "");
    setNotifyWhen(client.notifyWhen || "");
    setModalOpen(true);
    // Fetch logs when opening modal
    await fetchLogs(client.id);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedClient(null);
    setPaperRemaining("");
    setPaperToAdd("");
    setNotifyWhen("");
    setSaving(false);
    setAddingPaper(false);
    setUpdatingNotify(false);
    setShowAddPaperInput(false);
    setLogs([]);
  };

  const handleSave = async () => {
    if (!selectedClient) return;
    
    setSaving(true);
    try {
      const totalKg = parseFloat(selectedClient.totalKg) || 0;
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

      const clientRef = doc(db, "clients", selectedClient.id);
      await updateDoc(clientRef, {
        paperRemaining: newPaperRemaining,
        paperUsed: newPaperUsed
      });

      setClientData(prevData => 
        prevData.map(client => 
          client.id === selectedClient.id 
            ? { 
                ...client, 
                paperRemaining: newPaperRemaining,
                paperUsed: newPaperUsed
              }
            : client
        )
      );

      setSelectedClient(prev => ({
        ...prev,
        paperRemaining: newPaperRemaining,
        paperUsed: newPaperUsed
      }));

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



////////////
    // Add these functions after your existing functions
const handleOpenAddClientModal = () => {
  setAddClientModalOpen(true);
};

const handleCloseAddClientModal = () => {
  setAddClientModalOpen(false);
};

const handleClientAdded = () => {
  // Refresh the client data after adding a new client
  fetchClientData();
  handleCloseAddClientModal();
};

// Move fetchClientData to a separate function so it can be reused
const fetchClientData = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "clients"));

    const clientsArray = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      clientsArray.push({ id: docSnap.id, ...data });
    });

    console.log("Parsed clients array:", clientsArray);
    setClientData(clientsArray);

    if (clientsArray.length > 0) {
      setColumnHeaders(["№", "name", "totalKg", "paperUsed", "paperRemaining", "Actions"]);
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

/////////////
  
useEffect(() => {
  fetchClientData();
}, []);


const filteredClients = clientData.filter((client) =>
  (client.restaurant || client.name || "")
    .toLowerCase()
    .includes(searchQuery.toLowerCase())
);


    const handleAddPaper = async () => {
    if (!selectedClient || !paperToAdd) return;

    setAddingPaper(true);
    try {
      const amount = parseFloat(paperToAdd);
      console.log(updatingNotify);      
      if (amount <= 0) {
        alert("Количество должно быть больше 0.");
        return;
      }

      const clientRef = doc(db, "clients", selectedClient.id);
      const currentTotal = parseFloat(selectedClient.totalKg) || 0;
      const currentRemaining = parseFloat(selectedClient.paperRemaining) || 0;

      const updatedTotal = currentTotal + amount;
      const updatedRemaining = currentRemaining + amount;
      const updatedUsed = updatedTotal - updatedRemaining;

      const logsRef = collection(db, "clients", selectedClient.id, "logs");
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

      setClientData(prevData =>
        prevData.map(client =>
          client.id === selectedClient.id
            ? {
                ...client,
                totalKg: updatedTotal,
                paperRemaining: updatedRemaining,
                paperUsed: updatedUsed
              }
            : client
        )
      );

      setSelectedClient(prev => {
        const updatedClient = {
          ...prev,
          totalKg: updatedTotal,
          paperRemaining: updatedRemaining,
          paperUsed: updatedUsed
        };
        setPaperRemaining(updatedClient.paperRemaining.toString());
        return updatedClient;
      });

      await fetchLogs(selectedClient.id);
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

  const renderCellContent = (client, field, index) => {
    if (field === "№") {
      return index + 1;
    }
    if (field === "Actions") {
      return (
        <Button 
          variant="contained" 
          size="small"
          onClick={() => handleOpenModal(client)}
          sx={{ 
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#115293'
            }
          }}
        >
          Подробно
        </Button>
      );
    }
    if (field === "name") {
      return client.restaurant || client.name || "-";
    }
    if (field === "totalKg" || field === "paperUsed" || field === "paperRemaining") {
      const value = client[field];
      return value ? `${value} кг` : "-";
    }
    return client[field] ?? "-";
  };

return (
  <>
    {/* ------------------------------------------------------------------
        New fixed header bar (white + soft shadow)
    ------------------------------------------------------------------ */}
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
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          {/* Logo */}
          <img
            src="https://whiteray.uz/images/whiteray_1200px_logo_green.png"
            alt="WhiteRay"
            style={{ height: 38, objectFit: 'contain' }}
          />

          {/* Right-side controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
          </Box>
        </Stack>
      </Container>
    </Box>

    {/* ------------------------------------------------------------------
        Main content (unchanged except no extra top spacing)
    ------------------------------------------------------------------ */}
    <Container maxWidth="lg" sx={{ pt: 1, pb: 6 }}>
      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : clientData.length === 0 ? (
        <Typography variant="h6" color="text.secondary">
          Данные клиентов не найдены.
        </Typography>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
                {columnHeaders.map((header) => (
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
                     header === 'totalKg' ? 'Общий вес' :
                     header === 'paperUsed' ? 'Использовано бумаги' :
                     header === 'paperRemaining' ? 'Остаток бумаги' :
                     header === 'Actions' ? 'Действия' :
                     header.charAt(0).toUpperCase() + header.slice(1)}
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
                    {columnHeaders.map((field) => (
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
                               '&:hover': { borderColor: '#0c7a6e', color: '#0c7a6e' }
                             }}
                             onClick={() => handleOpenModal(client)}
                           >
                             Подробно
                           </Button>
                         ) : ['totalKg', 'paperUsed', 'paperRemaining'].includes(field) ? (
                           `${client[field] ?? 0} кг`
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
      )}

      {/* Modals */}
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

      <Modal
        open={modalOpen}
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

          {selectedClient && (
            <Grid container spacing={4} sx={{ height: 'calc(100% - 140px)' }}>
              {/* Left: Restaurant info */}
              <Grid item xs={4}>
                <Paper elevation={2} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
                  <Typography variant="h6" color="primary" textAlign="center" mb={2}>
                    Информация о ресторане
                  </Typography>

                  <Box textAlign="center" mb={2}>
                    <Typography variant="h5" fontWeight="bold">
                      {selectedClient.restaurant || selectedClient.name}
                    </Typography>
                    <Typography variant="body1" color="#0F9D8C">
                      {selectedClient.productType}
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
                    {selectedClient.shellNum}
                  </Typography>

                  <Box sx={{ position: 'relative', width: 280, height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPaperData(
                            selectedClient.totalKg,
                            paperRemaining || selectedClient.paperRemaining,
                            notifyWhen || selectedClient.notifyWhen
                          )}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={120}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getPaperData(
                            selectedClient.totalKg,
                            paperRemaining || selectedClient.paperRemaining,
                            notifyWhen || selectedClient.notifyWhen
                          ).map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <Typography variant="h2" fontWeight="bold" color="primary">
                        {paperRemaining || selectedClient.paperRemaining || 0}
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
          )}
        </Box>
      </Modal>
    </Container>
  </>
);
}