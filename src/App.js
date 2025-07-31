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
  <Container maxWidth="lg" sx={{ pt: 6 }}>
    {/* Header with Add Client Button */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
        Использование бумаги в ресторанах
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    <TextField
      size="small"
      variant="outlined"
      placeholder="Поиск по названию"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </Box>
      
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleOpenAddClientModal}
        sx={{
          backgroundColor: '#2e7d32',
          '&:hover': {
            backgroundColor: '#1b5e20'
          },
          fontSize: '1rem',
          px: 3,
          py: 1.5
        }}
      >
        Добавить клиента
      </Button>
    </Box>

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
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                {columnHeaders.map((header) => (
                  <TableCell 
                    key={header}
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      padding: '16px'
                    }}
                  >
                    {header === "№" ? "№" : 
                     header === "name" ? "Название ресторана" :
                     header === "totalKg" ? "Общий вес" :
                     header === "paperUsed" ? "Использовано бумаги" :
                     header === "paperRemaining" ? "Остаток бумаги" :
                     header === "Actions" ? "Действия" :
                     header.charAt(0).toUpperCase() + header.slice(1)}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClients.map((client, index) => (
                <TableRow 
                  key={client.id}
                  sx={{ 
                    '&:nth-of-type(odd)': {
                      backgroundColor: '#fafafa',
                    },
                    '&:hover': {
                      backgroundColor: '#e3f2fd',
                    },
                  }}
                >
                  {columnHeaders.map((field) => (
                    <TableCell 
                      key={field}
                      sx={{ padding: '16px' }}
                    >
                      {renderCellContent(client, field, index)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Enhanced Modal */}
      <Modal
  open={addClientModalOpen}
  onClose={handleCloseAddClientModal}
  aria-labelledby="add-client-modal"
>
  <Box >
    <AddClientForm onClose={handleCloseAddClientModal} onClientAdded={handleClientAdded} />
  </Box>
</Modal>

     <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="client-details-modal"
      >
        <Box sx={modalStyle}>
          {/* Close Button */}
          <IconButton
            onClick={handleCloseModal}
            sx={{
              position: 'absolute',
              right: 16,
              top: 16,
              color: 'grey.500',
              '&:hover': {
                backgroundColor: 'grey.100'
              }
            }}
          >
            <CloseIcon />
          </IconButton>

          <Typography variant="h4" gutterBottom sx={{ pr: 6, fontWeight: 'bold', fontSize: '2rem' }}>
            Детали клиента
          </Typography>
          <Divider sx={{ mb: 4 }} />

          {selectedClient && (
            <Grid container spacing={4} sx={{ height: 'calc(100% - 140px)' }}>
              {/* Block 1: Client Info & Controls */}
             <Grid item xs={4}>
  <Paper 
    elevation={2} 
    sx={{ 
      p: 2.5, // Reduced padding for better space usage
      height: '100%',
      width: '300px', // Reduced width
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#fafafa'
    }}
  >
    <Typography variant="h6" gutterBottom color="primary" sx={{ textAlign: 'center', mb: 2, fontSize: '1.2rem' }}>
      Информация о ресторане
    </Typography>
    
    {/* Space for logo */}
    <Box sx={{ height: '120px', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc', borderRadius: '8px' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.9rem' }}>
        Место для логотипа
      </Typography>
    </Box>
    
    <Stack spacing={2} sx={{ flex: 1 }}> {/* Reduced spacing */}
      <Box>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontSize: '1rem' }}>
          Название ресторана:
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#212121', fontSize: '1.6rem', lineHeight: 1.3 }}>
          {selectedClient.restaurant || selectedClient.name || "Н/Д"}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontSize: '0.9rem' }}>
          Тип продукции:
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#424242', fontSize: '1.2rem', lineHeight: 1.3 }}>
          {selectedClient.productType || "Не указано"}
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ fontSize: '0.9rem' }}>
          Адрес:
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#616161', fontSize: '1.1rem', lineHeight: 1.3 }}>
          {selectedClient.addressShort || "Не указан"}
        </Typography>
      </Box>

      {/* Spacer to push paper field and buttons down */}
      <Box sx={{ flex: 1 }} />

      <Box>
        <TextField
          fullWidth
          label="Остаток бумаги (кг)"
          variant="outlined"
          type="number"
          value={paperRemaining}
          onChange={(e) => setPaperRemaining(e.target.value)}
          inputProps={{
            step: "0.01",
            min: "0",
            max: selectedClient?.totalKg || undefined
          }}
          sx={{ 
            mb: 2.5, // Reduced margin
            mt: -5,
            '& .MuiInputLabel-root': { fontSize: '1.4rem' },
            '& .MuiInputBase-input': { fontSize: '1.6rem' },
            '& .MuiFormHelperText-root': { fontSize: '1.2rem' }
          }}
        />
      </Box>

      <Stack spacing={2}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          size="medium"
          sx={{ 
            fontSize: '1rem',
            py: 1.2 // Reduced button height
          }}
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          onClick={handleCloseModal}
          disabled={saving}
          size="medium"
          sx={{ 
            fontSize: '1rem',
            py: 1.2 // Reduced button height
          }}
        >
          Отмена
        </Button>
      </Stack>

    </Stack>
  </Paper>
              </Grid>

              {/* Block 2: Chart */}
              <Grid item xs={4}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2.5, // Reduced padding
                    height: '100%',
                    width: '380px', // Slightly reduced width
                    display: 'flex', 
                    flexDirection: 'column',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <Typography variant="h6" gutterBottom color="primary" sx={{ textAlign: 'center', mb: 2, fontSize: '1.2rem' }}>
                    Использование бумаги
                  </Typography>
                  
                  {/* Shell Number Above Chart */}
                  <Box sx={{ textAlign: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: '2.5rem', mb: 0.5 }}>
                      Номер полки:
                    </Typography>
                    <Typography variant="h2" sx={{ fontWeight: 'bold', color: '#1976d2', fontSize: '5.2rem', border: '2px solid #616060ff', backgroundColor: '#E9F1F1', borderRadius: '9px' }}>
                      {selectedClient.shellNum || "Не указано"}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ width: 280, height: 280, position: "relative" }}> {/* Reduced chart size */}
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
                            ).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <Box
                        sx={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          textAlign: "center"
                        }}
                      >
                        <Typography variant="h2" fontWeight="bold" color="primary" sx={{ fontSize: '2rem' }}> {/* Reduced font size */}
                          {paperRemaining || selectedClient.paperRemaining || 0}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}> {/* Reduced font size */}
                          кг осталось
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2, mb: 1 }}> {/* Reduced margins */}
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 16, height: 16, bgcolor: '#e0e0e0', borderRadius: '50%' }} /> {/* Reduced size */}
                      <Typography variant="body1" sx={{ fontSize: '1rem' }}>Использовано</Typography> {/* Reduced font size */}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ 
                        width: 16, 
                        height: 16, 
                        bgcolor: (paperRemaining || selectedClient.paperRemaining) < (selectedClient.notifyWhen || 3) ? '#f44336' : '#4caf50', 
                        borderRadius: '50%' 
                      }} />
                      <Typography variant="body1" sx={{ fontSize: '1rem' }}>Остаток</Typography> {/* Reduced font size */}
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Block 3: Paper Management & History */}
              <Grid item xs={4}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2.5, // Reduced padding
                    height: '100%', 
                    display: 'flex',
                    width: '330px', // Reduced width
                    flexDirection: 'column',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <Typography variant="h6" gutterBottom color="primary" sx={{ textAlign: 'center', mb: 2, fontSize: '1.2rem' }}>
                    Приёмка бумаги
                  </Typography>

                  <Stack spacing={2} sx={{ mb: 2 }}> {/* Reduced spacing and margin */}
                    {showAddPaperInput ? (
                      <Stack spacing={2}> {/* Reduced spacing */}
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={paperToAdd}
                          onChange={(e) => setPaperToAdd(e.target.value)}
                          label="Количество (кг)"
                          type="number"
                          inputProps={{ step: "0.01", min: "0" }}
                          sx={{
                            '& .MuiInputLabel-root': { fontSize: '1rem' },
                            '& .MuiInputBase-input': { fontSize: '1.1rem' }
                          }}
                        />
                        <Box sx={{ display: 'flex', gap: 1.5 }}> {/* Reduced gap */}
                          <Button
                            variant="contained"
                            onClick={handleAddPaper}
                            disabled={addingPaper || !paperToAdd}
                            sx={{ 
                              flex: 1,
                              fontSize: '0.9rem',
                              py: 1
                            }}
                          >
                            {addingPaper ? "Сохранение..." : "Сохранить"}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setShowAddPaperInput(false);
                              setPaperToAdd("");
                            }}
                            disabled={addingPaper}
                            sx={{
                              fontSize: '0.9rem',
                              py: 1
                            }}
                          >
                            Отмена
                          </Button>
                        </Box>
                      </Stack>
                    ) : (
                      <Button 
                        variant="contained" 
                        onClick={() => setShowAddPaperInput(true)}
                        size="medium"
                        fullWidth
                        sx={{ 
                          backgroundColor: '#ed6c02',
                          '&:hover': { backgroundColor: '#e65100' },
                          fontSize: '1rem',
                          py: 1.2
                        }}
                      >
                        Добавить бумагу
                      </Button>
                    )}
                  </Stack>

                  {logs.length > 0 && (
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2, fontSize: '1.1rem' }}>
                        История приёмки
                      </Typography>
                      <TableContainer 
                        component={Paper} 
                        sx={{ 
                          flex: 1,
                          maxHeight: 220, // Reduced height for scrolling
                          border: '1px solid #e0e0e0',
                          overflowY: 'auto' // Enable vertical scrolling
                        }}
                      >
                        <Table size="small" stickyHeader> {/* Changed back to small */}
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ 
                                backgroundColor: '#f5f5f5', 
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                              }}>
                                Дата
                              </TableCell>
                              <TableCell sx={{ 
                                backgroundColor: '#f5f5f5', 
                                fontWeight: 'bold',
                                fontSize: '0.9rem'
                              }}>
                                Бумага (кг)
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {logs.map((log) => (
                              <TableRow key={log.id} hover>
                                <TableCell sx={{ 
                                  minWidth: 120,
                                  fontSize: '0.85rem',
                                  py: 1 // Reduced row height
                                }}>
                                  {log.dateRecorded.toDate().toLocaleDateString()}
                                </TableCell>
                                <TableCell sx={{ 
                                  fontWeight: 'bold', 
                                  color: '#2e7d32',
                                  fontSize: '0.85rem',
                                  py: 1 // Reduced row height
                                }}>
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
  );
}