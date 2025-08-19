import React, { useState } from 'react';
import {
  Modal,
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
  RadioGroup,
  Radio
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const AddStandardDesignModal = ({ open, onClose, onDesignAdded, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    packaging: 'Сашет',
    gramm: '',
    shellNum: '',
    notifyWhen: 3
  });
  const [paperRolls, setPaperRolls] = useState([{ id: 1, paperRemaining: '' }]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleInputChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleAddPaperRoll = () => {
    setPaperRolls([...paperRolls, { id: Date.now(), paperRemaining: '' }]);
  };

  const handleRemovePaperRoll = (id) => {
    if (paperRolls.length > 1) {
      setPaperRolls(paperRolls.filter(roll => roll.id !== id));
    }
  };

  const handlePaperRollChange = (id, value) => {
    setPaperRolls(paperRolls.map(roll => 
      roll.id === id ? { ...roll, paperRemaining: value } : roll
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions
    setLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.type || !formData.packaging || !formData.gramm || !formData.shellNum) {
        throw new Error('Пожалуйста, заполните все обязательные поля');
      }

      if (paperRolls.some(roll => !roll.paperRemaining || isNaN(roll.paperRemaining))) {
        throw new Error('Пожалуйста, укажите корректное количество бумаги для всех рулонов');
      }

      // Calculate total paper from rolls
      const totalKg = paperRolls.reduce((sum, roll) => sum + parseFloat(roll.paperRemaining), 0);

      // Create product document
      const productRef = await addDoc(collection(db, 'productTypes'), {
        name: formData.name,
        type: formData.type,
        packaging: formData.packaging,
        gramm: formData.gramm,
        shellNum: formData.shellNum,
        totalKG: totalKg,
        notifyWhen: parseFloat(formData.notifyWhen) || 3,
        createdAt: serverTimestamp()
      });

      // Create paperInfo document
      const paperInfoRef = await addDoc(collection(db, 'productTypes', productRef.id, 'paperInfo'), {
        paperRemaining: totalKg,
        dateCreated: serverTimestamp()
      });

      // Add individual rolls
      await Promise.all(paperRolls.map(async (roll) => {
        await addDoc(
          collection(db, 'productTypes', productRef.id, 'paperInfo', paperInfoRef.id, 'individualRolls'),
          {
            paperRemaining: parseFloat(roll.paperRemaining),
            dateCreated: serverTimestamp()
          }
        );
      }));

      // Add initial log entries
      await Promise.all(paperRolls.map(async (roll) => {
        await addDoc(collection(db, 'productTypes', productRef.id, 'logs'), {
          actionType: 'paperIn',
          amount: parseFloat(roll.paperRemaining),
          date: serverTimestamp(),
          remainingAfter: totalKg,
          rollId: roll.id,
          userID: currentUser?.uid || 'system'
        });
      }));

      setSnackbar({
        open: true,
        message: 'Стандартный дизайн успешно добавлен!',
        severity: 'success'
      });

      if (onDesignAdded) {
        onDesignAdded();
      }

      // Reset form
      setFormData({
        name: '',
        type: '',
        packaging: 'Сашет',
        gramm: '',
        shellNum: '',
        notifyWhen: 3
      });
      setPaperRolls([{ id: 1, paperRemaining: '' }]);

    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при добавлении стандартного дизайна',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      {/* Single container wrapping all modal content */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '800px',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 2,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
          Добавить стандартный дизайн
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Product Info */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Информация о продукте
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Название"
                      value={formData.name}
                      onChange={handleInputChange('name')}
                      required
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Тип продукта"
                      value={formData.type}
                      onChange={handleInputChange('type')}
                      required
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Упаковка *
                    </Typography>
                    <RadioGroup
                      value={formData.packaging}
                      onChange={handleInputChange('packaging')}
                      row
                    >
                      <FormControlLabel
                        value="Сашет"
                        control={<Radio size="small" />}
                        label="Сашет"
                      />
                      <FormControlLabel
                        value="Стик"
                        control={<Radio size="small" />}
                        label="Стик"
                      />
                    </RadioGroup>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Граммовка"
                      value={formData.gramm}
                      onChange={handleInputChange('gramm')}
                      required
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Номер полки"
                      value={formData.shellNum}
                      onChange={handleInputChange('shellNum')}
                      required
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Уведомить при (кг)"
                      type="number"
                      value={formData.notifyWhen}
                      onChange={handleInputChange('notifyWhen')}
                      inputProps={{ step: '0.01', min: '0' }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Paper Rolls */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Рулоны бумаги
                  </Typography>
                  <IconButton
                    onClick={handleAddPaperRoll}
                    color="primary"
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>

                <Grid container spacing={2}>
                  {paperRolls.map((roll, index) => (
                    <Grid item xs={12} sm={6} key={roll.id}>
                      <Card variant="outlined" sx={{ position: 'relative' }}>
                        {paperRolls.length > 1 && (
                          <IconButton
                            onClick={() => handleRemovePaperRoll(roll.id)}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              color: 'error.main',
                              zIndex: 1
                            }}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Рулон {index + 1}
                          </Typography>
                          <TextField
                            fullWidth
                            label="Количество (кг)"
                            type="number"
                            value={roll.paperRemaining}
                            onChange={(e) => handlePaperRollChange(roll.id, e.target.value)}
                            required
                            size="small"
                            inputProps={{ step: '0.01', min: '0.01' }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={onClose} variant="outlined" disabled={loading}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Сохранить'}
            </Button>
          </Box>
        </Box>

        {/* Snackbar now inside the main container */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </Modal>
  );
};

export default AddStandardDesignModal;