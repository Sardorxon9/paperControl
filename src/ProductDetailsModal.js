import React, { useState, useEffect } from 'react';
import { Modal } from '@mui/material';

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider,
  Snackbar,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Autorenew as AutorenewIcon
} from '@mui/icons-material';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: '1200px',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 5,
  borderRadius: 2,
  maxHeight: '95vh',
  overflowY: 'auto'
};

const ProductDetailsModal = ({ open, onClose, product, currentUser }) => {
 // State variables (add these at the top)
  const [paperInfo, setPaperInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [individualRolls, setIndividualRolls] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Paper addition state
  const [addingPaper, setAddingPaper] = useState(false);
  const [paperToAdd, setPaperToAdd] = useState("");
  const [showAddPaperInput, setShowAddPaperInput] = useState(false);
  
  // Paper roll editing state
  const [editingRollId, setEditingRollId] = useState(null);
  const [rollEditValue, setRollEditValue] = useState("");
  const [updatingRoll, setUpdatingRoll] = useState(false);
  const [isCorrection, setIsCorrection] = useState(false);
  const [correctWeight, setCorrectWeight] = useState("");

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setPaperInfo(null);
      setLogs([]);
      setIndividualRolls([]);
      setLoading(false);
      setAddingPaper(false);
      setPaperToAdd("");
      setShowAddPaperInput(false);
      setEditingRollId(null);
      setRollEditValue("");
      setUpdatingRoll(false);
      setIsCorrection(false);
      setCorrectWeight("");
    }
  }, [open]);
  
const fetchProductDetails = async () => {
  if (!product?.id) return;
  
  setLoading(true);
  try {
    // Fetch paperInfo
    const paperInfoQuery = await getDocs(collection(db, 'productTypes', product.id, 'paperInfo'));
    if (!paperInfoQuery.empty) {
      const paperInfoDoc = paperInfoQuery.docs[0];
      setPaperInfo({ 
        id: paperInfoDoc.id, 
        ...paperInfoDoc.data(),
        // Ensure these fields exist
        paperRemaining: paperInfoDoc.data().paperRemaining || 0,
        totalKg: paperInfoDoc.data().totalKg || 0
      });
      
      // Fetch individual rolls
      const rollsQuery = query(
        collection(db, 'productTypes', product.id, 'paperInfo', paperInfoDoc.id, 'individualRolls'),
        orderBy('dateCreated', 'asc')
      );
      const rollsSnapshot = await getDocs(rollsQuery);
      setIndividualRolls(rollsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        paperRemaining: doc.data().paperRemaining || 0
      })));
    }
    
    // Fetch logs
    const logsQuery = query(
      collection(db, 'productTypes', product.id, 'logs'),
      orderBy('date', 'desc')
    );
    const logsSnapshot = await getDocs(logsQuery);
    setLogs(logsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      // Ensure these fields exist
      amount: doc.data().amount || 0,
      remainingAfter: doc.data().remainingAfter || 0
    })));
    
  } catch (error) {
    console.error('Error fetching product details:', error);
  } finally {
    setLoading(false);
  }
};

const handleAddPaper = async () => {
  if (!product?.id || !paperToAdd) return;
  
  setAddingPaper(true);
  const amount = parseFloat(paperToAdd);

  try {
    // Create new roll
    const rollRef = await addDoc(
      collection(db, 'productTypes', product.id, 'paperInfo', paperInfo.id, 'individualRolls'),
      {
        dateCreated: serverTimestamp(),
        paperRemaining: amount
      }
    );

    // Update totals
    await updateDoc(doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id), {
      paperRemaining: increment(amount),
      totalKg: increment(amount)
    });

    // Add log
    await addDoc(collection(db, 'productTypes', product.id, 'logs'), {
      actionType: 'paperIn',
      amount: amount,
      date: serverTimestamp(),
      rollId: rollRef.id,
      userID: currentUser?.uid || 'unknown',
      remainingAfter: (paperInfo.paperRemaining || 0) + amount
    });

    // Refresh data
    await fetchProductDetails();
    setPaperToAdd("");
    setShowAddPaperInput(false);
    
  } catch (error) {
    console.error('Error adding paper:', error);
  } finally {
    setAddingPaper(false);
  }
};

const handleUpdateRoll = async (rollId, newAmount) => {
  if (!product?.id || !paperInfo?.id) return;
  
  setUpdatingRoll(true);
  const newAmountValue = parseFloat(newAmount);

  try {
    // Get current roll data
    const rollRef = doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id, 'individualRolls', rollId);
    const rollSnap = await getDoc(rollRef);
    const currentAmount = rollSnap.data().paperRemaining || 0;

    if (isCorrection) {
      // Correction mode
      const difference = newAmountValue - currentAmount;
      
      await updateDoc(rollRef, { paperRemaining: newAmountValue });
      
      // Update totals
      await updateDoc(doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id), {
        paperRemaining: increment(difference),
        totalKg: increment(difference)
      });

      // Add correction log
      await addDoc(collection(db, 'productTypes', product.id, 'logs'), {
        actionType: 'fixing',
        amount: Math.abs(difference),
        date: serverTimestamp(),
        rollId: rollId,
        userID: currentUser?.uid || 'unknown',
        remainingAfter: (paperInfo.paperRemaining || 0) + difference,
        details: `Corrected from ${currentAmount}kg to ${newAmountValue}kg`
      });
    } else {
      // Normal usage mode
      const amountUsed = currentAmount - newAmountValue;
      
      await updateDoc(rollRef, { paperRemaining: newAmountValue });
      
      // Update remaining (don't change totalKg)
      await updateDoc(doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id), {
        paperRemaining: increment(-amountUsed)
      });

      // Add usage log
      await addDoc(collection(db, 'productTypes', product.id, 'logs'), {
        actionType: 'paperOut',
        amount: amountUsed,
        date: serverTimestamp(),
        rollId: rollId,
        userID: currentUser?.uid || 'unknown',
        remainingAfter: (paperInfo.paperRemaining || 0) - amountUsed
      });
    }

    // Refresh data
    await fetchProductDetails();
    setEditingRollId(null);
    setRollEditValue('');
    setIsCorrection(false);
    setCorrectWeight('');
    
  } catch (error) {
    console.error('Error updating roll:', error);
  } finally {
    setUpdatingRoll(false);
  }
};

  useEffect(() => {
    if (open && product?.id) {
      fetchProductDetails();
    }
  }, [open, product?.id]);

  // Don't render anything if product is not provided
  if (!product) return null;

  // Don't render modal if not open
  if (!open) return null;

return (
  <Modal
    open={open}
    onClose={onClose}
    aria-labelledby="product-details-modal"
    aria-describedby="product-details-description"
  >
    <Box sx={modalStyle}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', right: 16, top: 16 }}>
        <CloseIcon />
      </IconButton>

        <Typography variant="h4" gutterBottom fontWeight="bold">
          {product?.type} ({product?.packaging}, {product?.gramm}г)
        </Typography>
        <Divider sx={{ mb: 4 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Left Column - Product Info */}
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Основная информация
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">Тип продукта</Typography>
                    <Typography variant="body1">{product?.type}</Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">Упаковка</Typography>
                    <Typography variant="body1">{product?.packaging}</Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">Граммовка</Typography>
                    <Typography variant="body1">{product?.gramm}г</Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">Всего куплено</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {paperInfo?.totalKg?.toFixed(2) || '0.00'} кг
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">Остаток бумаги</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {paperInfo?.paperRemaining?.toFixed(2) || '0.00'} кг
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            {/* Middle Column - Paper Rolls */}
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    Рулоны бумаги
                  </Typography>
                  
                  {!showAddPaperInput ? (
                    <Button
                      variant="contained"
                      onClick={() => setShowAddPaperInput(true)}
                      startIcon={<AddIcon />}
                    >
                      Добавить рулон
                    </Button>
                  ) : (
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      <TextField
                        label="Количество (кг)"
                        type="number"
                        value={paperToAdd}
                        onChange={(e) => setPaperToAdd(e.target.value)}
                        inputProps={{ step: '0.01', min: '0.01' }}
                      />
                      <Box display="flex" gap={1}>
                        <Button
                          variant="contained"
                          onClick={handleAddPaper}
                          disabled={addingPaper || !paperToAdd}
                        >
                          {addingPaper ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setShowAddPaperInput(false);
                            setPaperToAdd('');
                          }}
                        >
                          Отмена
                        </Button>
                      </Box>
                    </Stack>
                  )}
                </Box>
                
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                  {individualRolls.map((roll, index) => (
                    <Card key={roll.id} sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between">
                          <Box>
                            <Typography variant="body2">Рулон {index + 1}</Typography>
                            
                            {editingRollId === roll.id ? (
                              <Box mt={1}>
                                <TextField
                                  label="Сколько кг осталось"
                                  type="number"
                                  value={rollEditValue}
                                  onChange={(e) => setRollEditValue(e.target.value)}
                                  inputProps={{ step: '0.01', min: '0' }}
                                  sx={{ mb: 1 }}
                                />
                                
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={isCorrection}
                                      onChange={(e) => setIsCorrection(e.target.checked)}
                                    />
                                  }
                                  label="Исправить ошибку"
                                />
                                
                                {isCorrection && (
                                  <TextField
                                    label="Корректное количество"
                                    type="number"
                                    value={correctWeight}
                                    onChange={(e) => setCorrectWeight(e.target.value)}
                                    inputProps={{ step: '0.01', min: '0' }}
                                    sx={{ mt: 1 }}
                                  />
                                )}
                                
                                <Box display="flex" gap={1} mt={1}>
                                  <Button
                                    variant="contained"
                                    onClick={() => handleUpdateRoll(
                                      roll.id, 
                                      isCorrection ? correctWeight : rollEditValue
                                    )}
                                  >
                                    Сохранить
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    onClick={() => {
                                      setEditingRollId(null);
                                      setRollEditValue('');
                                      setIsCorrection(false);
                                      setCorrectWeight('');
                                    }}
                                  >
                                    Отмена
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              <Typography variant="h6" fontWeight="bold">
                                {roll.paperRemaining?.toFixed(2) || '0.00'} кг
                              </Typography>
                            )}
                          </Box>
                          
                          {editingRollId !== roll.id && (
                            <Button
                              variant="contained"
                              startIcon={<EditIcon />}
                              onClick={() => {
                                setEditingRollId(roll.id);
                                setRollEditValue(roll.paperRemaining?.toString() || '0');
                              }}
                            >
                              Редактировать
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* Right Column - History */}
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  История операций
                </Typography>
                
                <TableContainer sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Дата</TableCell>
                        <TableCell>Действие</TableCell>
                        <TableCell>Количество</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.date?.toDate?.()?.toLocaleDateString('ru-RU') || '-'}
                          </TableCell>
                          <TableCell>
                            {log.actionType === 'paperIn' ? (
                              <ArrowDownwardIcon color="success" />
                            ) : log.actionType === 'paperOut' ? (
                              <ArrowUpwardIcon color="error" />
                            ) : (
                              <AutorenewIcon color="warning" />
                            )}
                          </TableCell>
                          <TableCell sx={{ 
                            color: log.actionType === 'paperIn' ? 'success.main' : 
                                   log.actionType === 'paperOut' ? 'error.main' : 'warning.main',
                            fontWeight: 'bold'
                          }}>
                            {log.actionType === 'paperIn' ? '+' : 
                             log.actionType === 'paperOut' ? '-' : '±'}
                            {log.amount?.toFixed(2) || '0.00'} кг
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
  </Modal>
);
 
};

export default ProductDetailsModal;