import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc
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
  Stack
} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import AddClientForm from './addClientForm';
import ClientDetailsModal from './ClientDetailsModal';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';

export default function Welcome() {
  const [clientData, setClientData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columnHeaders, setColumnHeaders] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [addClientModalOpen, setAddClientModalOpen] = useState(false);

  const hiddenColumns = ["totalKg", "paperUsed"];

  const fetchPackaging = async (productId) => {
    if (!productId) return '';
    try {
      const docRef = doc(db, "productTypes", productId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data().packaging : '';
    } catch (error) {
      console.error("Error fetching packaging:", error);
      return '';
    }
  };

  const fetchClientData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "clients"));

      const clientsArray = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const packaging = await fetchPackaging(data.productId);
          return { id: docSnap.id, ...data, packaging };
        })
      );

      console.log("Parsed clients array:", clientsArray);
      setClientData(clientsArray);

      if (clientsArray.length > 0) {
        setColumnHeaders([
          "№",
          "name",
          "shellNum",
          "packaging", // added
          "totalKg",   // hidden
          "paperUsed", // hidden
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

  useEffect(() => {
    fetchClientData();
  }, []);

  const handleOpenModal = (client) => {
    setSelectedClient(client);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedClient(null);
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

  const filteredClients = clientData.filter((client) =>
    (client.restaurant || client.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
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

      {/* Main Table */}
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

        {/* Client Details Modal */}
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
