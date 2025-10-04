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
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
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
import { PhotoProvider, PhotoView } from 'react-photo-view';
import EditStandardDesignModal from './EditStandardDesignModal';

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
  const [paperInfo, setPaperInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [individualRolls, setIndividualRolls] = useState([]);
  const [loading, setLoading] = useState(false);

  const [addingPaper, setAddingPaper] = useState(false);
  const [paperToAdd, setPaperToAdd] = useState("");
  const [showAddPaperInput, setShowAddPaperInput] = useState(false);

  const [editingRollId, setEditingRollId] = useState(null);
  const [rollEditValue, setRollEditValue] = useState("");
  const [updatingRoll, setUpdatingRoll] = useState(false);
  const [isCorrection, setIsCorrection] = useState(false);
  const [correctWeight, setCorrectWeight] = useState("");

  const [productData, setProductData] = useState(null);

  // Ftulka deletion states
  const [showFtulkaModal, setShowFtulkaModal] = useState(false);
  const [ftulkaWeight, setFtulkaWeight] = useState('');
  const [rollToDelete, setRollToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);


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
      setProductData(null);
      // Reset ftulka states
      setShowFtulkaModal(false);
      setFtulkaWeight('');
      setRollToDelete(null);
    }
  }, [open]);

  const fetchProductDetails = async () => {
    if (!product?.id) return;

    setLoading(true);
    try {
      // fetch productType doc (for totalKG, shellNum, name)
      const productRef = doc(db, "productTypes", product.id);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        setProductData({ id: productSnap.id, ...productSnap.data() });
      }

      // fetch paperInfo
      const paperInfoQuery = await getDocs(collection(db, 'productTypes', product.id, 'paperInfo'));
      if (!paperInfoQuery.empty) {
        const paperInfoDoc = paperInfoQuery.docs[0];
        setPaperInfo({
          id: paperInfoDoc.id,
          ...paperInfoDoc.data(),
          paperRemaining: paperInfoDoc.data().paperRemaining || 0
        });

        const rollsQuery = query(
          collection(db, 'productTypes', product.id, 'paperInfo', paperInfoDoc.id, 'individualRolls'),
          orderBy('dateCreated', 'asc')
        );
        const rollsSnapshot = await getDocs(rollsQuery);
        // Filter out deleted rolls from UI
        const activeRolls = rollsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            paperRemaining: doc.data().paperRemaining || 0
          }))
          .filter(roll => roll.status !== 'deleted');
        setIndividualRolls(activeRolls);
      }

      // fetch logs
      const logsQuery = query(
        collection(db, 'productTypes', product.id, 'logs'),
        orderBy('date', 'desc')
      );
      const logsSnapshot = await getDocs(logsQuery);
      setLogs(logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        amount: doc.data().amount || 0,
        remainingAfter: doc.data().remainingAfter || 0
      })));

    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  };

  // add new roll
  const handleAddPaper = async () => {
    if (!product?.id || !paperToAdd || !paperInfo?.id) return;

    setAddingPaper(true);
    const amount = parseFloat(paperToAdd);

    try {
      // create new roll
      const rollRef = await addDoc(
        collection(db, 'productTypes', product.id, 'paperInfo', paperInfo.id, 'individualRolls'),
        {
          dateCreated: serverTimestamp(),
          paperRemaining: amount
        }
      );

      // update totals: productType.totalKG + paperInfo.paperRemaining
      await updateDoc(doc(db, 'productTypes', product.id), {
        totalKG: increment(amount)
      });
      await updateDoc(doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id), {
        paperRemaining: increment(amount)
      });

      // add log
      await addDoc(collection(db, 'productTypes', product.id, 'logs'), {
        actionType: 'paperIn',
        amount: amount,
        date: serverTimestamp(),
        rollId: rollRef.id,
        userID: currentUser?.uid || 'unknown',
        remainingAfter: (paperInfo.paperRemaining || 0) + amount
      });

      await fetchProductDetails();
      setPaperToAdd("");
      setShowAddPaperInput(false);

    } catch (error) {
      console.error('Error adding paper:', error);
    } finally {
      setAddingPaper(false);
    }
  };

  // update roll
  const handleUpdateRoll = async (rollId, newAmount) => {
    if (!product?.id || !paperInfo?.id) return;

    const newAmountValue = parseFloat(newAmount);

    // If new amount is 0, show ftulka modal
    if (newAmountValue === 0) {
      setRollToDelete(rollId);
      setShowFtulkaModal(true);
      return;
    }

    setUpdatingRoll(true);

    try {
      const rollRef = doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id, 'individualRolls', rollId);
      const rollSnap = await getDoc(rollRef);
      const currentAmount = rollSnap.data().paperRemaining || 0;

      if (isCorrection) {
        const difference = newAmountValue - currentAmount;

        await updateDoc(rollRef, { paperRemaining: newAmountValue });
        await updateDoc(doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id), {
          paperRemaining: increment(difference)
        });
        await updateDoc(doc(db, 'productTypes', product.id), {
          totalKG: increment(difference)
        });

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
        const amountUsed = currentAmount - newAmountValue;

        await updateDoc(rollRef, { paperRemaining: newAmountValue });
        await updateDoc(doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id), {
          paperRemaining: increment(-amountUsed)
        });

        await addDoc(collection(db, 'productTypes', product.id, 'logs'), {
          actionType: 'paperOut',
          amount: amountUsed,
          date: serverTimestamp(),
          rollId: rollId,
          userID: currentUser?.uid || 'unknown',
          remainingAfter: (paperInfo.paperRemaining || 0) - amountUsed
        });
      }

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

  // Handle ftulka deletion
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
      const rollRef = doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id, 'individualRolls', rollToDelete);
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
        deletedAt: serverTimestamp()
      });

      // Subtract ftulka weight from totalKG
      await updateDoc(doc(db, 'productTypes', product.id), {
        totalKG: increment(-ftulkaWeightKg) // Subtract ftulka weight
      });

      // Update paperInfo remaining (subtract any remaining paper)
      if (currentAmount > 0) {
        await updateDoc(doc(db, 'productTypes', product.id, 'paperInfo', paperInfo.id), {
          paperRemaining: increment(-currentAmount)
        });
      }

      // Create deletion log entries
      // Log the paper usage (if any paper was remaining)
      if (currentAmount > 0) {
        await addDoc(collection(db, 'productTypes', product.id, 'logs'), {
          date: serverTimestamp(),
          userID: currentUser?.uid || 'unknown',
          actionType: 'paperOut',
          amount: currentAmount,
          rollId: rollToDelete,
          remainingAfter: (paperInfo.paperRemaining || 0) - currentAmount,
          details: `Paper used when roll was finished`
        });
      }

      // Log the deletion with ftulka
      await addDoc(collection(db, 'productTypes', product.id, 'logs'), {
        date: serverTimestamp(),
        userID: currentUser?.uid || 'unknown',
        actionType: 'paperOut',
        amount: ftulkaWeightKg,
        rollId: rollToDelete,
        remainingAfter: (paperInfo.paperRemaining || 0) - currentAmount,
        details: `Roll deleted with ftulka: ${ftulkaWeightGrams}g`
      });

      // Close modal and reset states
      setShowFtulkaModal(false);
      setFtulkaWeight('');
      setRollToDelete(null);
      setEditingRollId(null);
      setRollEditValue('');
      setIsCorrection(false);
      setCorrectWeight('');

      await fetchProductDetails();

      alert(`Рулон удален. Футулка (${ftulkaWeightGrams}г) вычтена из общего веса.`);

    } catch (error) {
      console.error('Error deleting roll with ftulka:', error);
      alert('Ошибка при удалении рулона');
    } finally {
      setUpdatingRoll(false);
    }
  };

  useEffect(() => {
    if (open && product?.id) {
      fetchProductDetails();
    }
  }, [open, product?.id]);

  if (!product || !open) return null;

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box sx={modalStyle}>
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 16, top: 16 }}>
            <CloseIcon />
          </IconButton>
          {/* ADD THIS EDIT BUTTON */}
<IconButton 
  onClick={() => setShowEditModal(true)}
  sx={{ 
    position: 'absolute', 
    right: 60, 
    top: 16,
    bgcolor: 'primary.main',
    color: 'white',
    '&:hover': { bgcolor: 'primary.dark' }
  }}
>
  <EditIcon />
</IconButton>

          <Typography variant="h4" gutterBottom fontWeight="bold">
            {productData?.type || "Продукт"}- 
            {productData?.packaging || "Тип"}-
            {productData?.gramm || "Грамм"}гр,
          </Typography>

          <Typography variant="h4" gutterBottom fontWeight="bold">
            {productData?.name || "Продукт"}
          </Typography>

          <Divider sx={{ mb: 4 }} />

          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Left Column */}
              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Основная информация
                  </Typography>

                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Название</Typography>
                      <Typography variant="body1">{productData?.name || '-'}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="textSecondary">Всего куплено</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {productData?.totalKG?.toFixed(2) || '0.00'} кг
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="textSecondary">Остаток бумаги</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {paperInfo?.paperRemaining?.toFixed(2) || '0.00'} кг
                      </Typography>
                    </Box>
{/* --- Product Image Block --- */}
{productData?.imageURL1 && (
  <PhotoProvider
    toolbarRender={({ rotate, onRotate, scale, onScale, onClose }) => (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '8px',
        zIndex: 1000
      }}>
        {/* Rotate */}
        <button onClick={() => onRotate(rotate + 90)} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
          ⟳
        </button>
        {/* Zoom out */}
        <button onClick={() => onScale(scale - 0.5)} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
          ➖
        </button>
        {/* Zoom in */}
        <button onClick={() => onScale(scale + 0.5)} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
          ➕
        </button>
        {/* Close */}
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' }}>
          ✕
        </button>
      </div>
    )}
  >
    <PhotoView src={productData.imageURL1}>
      <Box
        component="img"
        src={productData.imageURL1}
        alt="Product Image"
        sx={{
          width: 120,
          height: 120,
          objectFit: 'cover',
          borderRadius: 2,
          cursor: 'pointer',
          border: '1px solid #ddd',
          mt: 2
        }}
      />
    </PhotoView>
  </PhotoProvider>
)}

                    {/* Shelf Number */}
                    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, justifyContent: 'left', mb: 3 }}>
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <Typography variant="body1" color="#9fb1af" sx={{ fontSize: '1.125rem', mb: 1 }}>
                          Номер полки
                        </Typography>
                        <Box
                          sx={{
                            minWidth: 120,
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
                            {productData?.shellNum || '2-A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Middle Column */}
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2.5, 
                    height: '100%', 
                    width: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: '#fafafa'
                  }}
                >
                  <Typography variant="h6" textAlign="center" mb={2}>
                    Рулоны бумаги
                  </Typography>

                  {/* Add Paper Section */}
                  <Box mb={3}>
                    {!showAddPaperInput ? (
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
                        Добавить рулон
                      </Button>
                    ) : (
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
                            onClick={() => { setShowAddPaperInput(false); setPaperToAdd(''); }}
                            disabled={addingPaper}
                            fullWidth
                          >
                            Отмена
                          </Button>
                        </Box>
                      </Stack>
                    )}
                  </Box>

                  <Box flex={1} sx={{ overflow: 'auto' }}>
                    {individualRolls.map((roll, index) => (
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
                                      helperText="Это исправит общий вес продукта"
                                    />
                                  )}
                                </Box>
                              ) : (
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#065345' }}>
                                  {roll.paperRemaining?.toFixed(2) || '0.00'} кг
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
                                        handleUpdateRoll(roll.id, valueToUse);
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
                                    onClick={() => { 
                                      setEditingRollId(null); 
                                      setRollEditValue(''); 
                                      setIsCorrection(false); 
                                      setCorrectWeight(''); 
                                    }}
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
                                  onClick={() => { 
                                    setEditingRollId(roll.id); 
                                    setRollEditValue(roll.paperRemaining?.toString() || '0'); 
                                  }}
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

              {/* Right Column */}
              <Grid item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">История операций</Typography>
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
                            <TableCell>{log.date?.toDate?.()?.toLocaleDateString('ru-RU') || '-'}</TableCell>
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
                              color: log.actionType === 'paperIn' ? 'success.main' : log.actionType === 'paperOut' ? 'error.main' : 'warning.main',
                              fontWeight: 'bold'
                            }}>
                              {log.actionType === 'paperIn' ? '+' : log.actionType === 'paperOut' ? '-' : '±'}
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
            helperText="Этот вес будет вычтен из общего веса продукта"
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
       {/* Edit Standard Design Modal */}
     <EditStandardDesignModal
  open={showEditModal}
  onClose={() => setShowEditModal(false)}
  productId={product?.id}
  onSaveSuccess={fetchProductDetails}
/>
    </>
  );
};

export default ProductDetailsModal;