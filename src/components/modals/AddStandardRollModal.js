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
  Snackbar,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import StandardDesignPicker from '../shared/StandardDesignPicker';
import { brandColors } from '../../theme/colors';

/**
 * AddStandardRollModal - Modal for adding paper rolls to standard designs
 * This creates or updates productTypes based on catalogue Design+Gramm selection
 */
const AddStandardRollModal = ({ open, onClose, onRollAdded, currentUser }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCatalogueItemId, setSelectedCatalogueItemId] = useState(null);
  const [selectedGramm, setSelectedGramm] = useState(null);
  const [selectedCatalogueItem, setSelectedCatalogueItem] = useState(null);

  const [formData, setFormData] = useState({
    shellNum: '',
    notifyWhen: 50,
  });

  const [paperRolls, setPaperRolls] = useState([{ id: 1, paperRemaining: '' }]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const steps = ['Выбор дизайна', 'Параметры хранения', 'Добавление рулонов'];

  const handleDesignSelect = (catalogueItemId, gramm, catalogueItem) => {
    setSelectedCatalogueItemId(catalogueItemId);
    setSelectedGramm(gramm);
    setSelectedCatalogueItem(catalogueItem);
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!selectedCatalogueItemId || !selectedGramm) {
        setSnackbar({
          open: true,
          message: 'Пожалуйста, выберите дизайн и граммовку',
          severity: 'warning',
        });
        return;
      }
    }

    if (activeStep === 1) {
      if (!formData.shellNum) {
        setSnackbar({
          open: true,
          message: 'Пожалуйста, укажите номер полки',
          severity: 'warning',
        });
        return;
      }
    }

    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleAddPaperRoll = () => {
    setPaperRolls([...paperRolls, { id: Date.now(), paperRemaining: '' }]);
  };

  const handleRemovePaperRoll = (id) => {
    if (paperRolls.length > 1) {
      setPaperRolls(paperRolls.filter((roll) => roll.id !== id));
    }
  };

  const handlePaperRollChange = (id, value) => {
    setPaperRolls(
      paperRolls.map((roll) => (roll.id === id ? { ...roll, paperRemaining: value } : roll))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validate paper rolls
    if (paperRolls.some((roll) => !roll.paperRemaining || isNaN(roll.paperRemaining))) {
      setSnackbar({
        open: true,
        message: 'Пожалуйста, укажите корректное количество бумаги для всех рулонов',
        severity: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      // Calculate total paper from rolls
      const totalKg = paperRolls.reduce((sum, roll) => sum + parseFloat(roll.paperRemaining), 0);

      // Check if productType already exists for this catalogue item + gramm
      const productTypesQuery = query(
        collection(db, 'productTypes'),
        where('catalogueItemID', '==', selectedCatalogueItemId),
        where('gramm', '==', selectedGramm)
      );
      const existingProductTypes = await getDocs(productTypesQuery);

      let productTypeId;

      if (existingProductTypes.empty) {
        // Create new productType
        const productTypeRef = await addDoc(collection(db, 'productTypes'), {
          catalogueItemID: selectedCatalogueItemId,
          name: selectedCatalogueItem.productName,
          productCode: selectedCatalogueItem.productCode,
          imageURL: selectedCatalogueItem.imageURL || '',
          usedMaterial: selectedCatalogueItem.usedMaterial,
          packageType: selectedCatalogueItem.packageType,
          gramm: selectedGramm,
          shellNum: formData.shellNum,
          totalKG: totalKg,
          paperRemaining: totalKg,
          notifyWhen: parseFloat(formData.notifyWhen) || 50,
          productID_2: selectedCatalogueItem.productID_2 || '',
          packageID: selectedCatalogueItem.packageID || '',
          createdAt: serverTimestamp(),
        });
        productTypeId = productTypeRef.id;

        // Create paperInfo document
        const paperInfoRef = await addDoc(
          collection(db, 'productTypes', productTypeId, 'paperInfo'),
          {
            paperRemaining: totalKg,
            dateCreated: serverTimestamp(),
          }
        );

        // Add individual rolls
        await Promise.all(
          paperRolls.map(async (roll) => {
            await addDoc(
              collection(
                db,
                'productTypes',
                productTypeId,
                'paperInfo',
                paperInfoRef.id,
                'individualRolls'
              ),
              {
                paperRemaining: parseFloat(roll.paperRemaining),
                dateCreated: serverTimestamp(),
              }
            );
          })
        );

        // Add initial log entries
        await Promise.all(
          paperRolls.map(async (roll) => {
            await addDoc(collection(db, 'productTypes', productTypeId, 'logs'), {
              actionType: 'paperIn',
              amount: parseFloat(roll.paperRemaining),
              date: serverTimestamp(),
              details: `Добавлен рулон: ${parseFloat(roll.paperRemaining)} кг`,
              userID: currentUser?.uid || 'system',
            });
          })
        );

        setSnackbar({
          open: true,
          message: 'Новый стандартный дизайн и рулоны успешно добавлены!',
          severity: 'success',
        });
      } else {
        // Update existing productType
        productTypeId = existingProductTypes.docs[0].id;
        const existingData = existingProductTypes.docs[0].data();

        // Update totals
        await updateDoc(doc(db, 'productTypes', productTypeId), {
          totalKG: increment(totalKg),
          paperRemaining: increment(totalKg),
        });

        // Get or create paperInfo
        const paperInfoSnapshot = await getDocs(
          collection(db, 'productTypes', productTypeId, 'paperInfo')
        );
        let paperInfoId;

        if (paperInfoSnapshot.empty) {
          const paperInfoRef = await addDoc(
            collection(db, 'productTypes', productTypeId, 'paperInfo'),
            {
              paperRemaining: totalKg,
              dateCreated: serverTimestamp(),
            }
          );
          paperInfoId = paperInfoRef.id;
        } else {
          paperInfoId = paperInfoSnapshot.docs[0].id;
          await updateDoc(
            doc(db, 'productTypes', productTypeId, 'paperInfo', paperInfoId),
            {
              paperRemaining: increment(totalKg),
            }
          );
        }

        // Add individual rolls
        await Promise.all(
          paperRolls.map(async (roll) => {
            await addDoc(
              collection(
                db,
                'productTypes',
                productTypeId,
                'paperInfo',
                paperInfoId,
                'individualRolls'
              ),
              {
                paperRemaining: parseFloat(roll.paperRemaining),
                dateCreated: serverTimestamp(),
              }
            );
          })
        );

        // Add log entries
        await Promise.all(
          paperRolls.map(async (roll) => {
            await addDoc(collection(db, 'productTypes', productTypeId, 'logs'), {
              actionType: 'paperIn',
              amount: parseFloat(roll.paperRemaining),
              date: serverTimestamp(),
              details: `Добавлен рулон: ${parseFloat(roll.paperRemaining)} кг`,
              userID: currentUser?.uid || 'system',
            });
          })
        );

        setSnackbar({
          open: true,
          message: 'Рулоны успешно добавлены к существующему дизайну!',
          severity: 'success',
        });
      }

      if (onRollAdded) {
        onRollAdded();
      }

      // Reset form
      handleReset();
    } catch (error) {
      console.error('Error adding standard roll:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Ошибка при добавлении рулонов',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedCatalogueItemId(null);
    setSelectedGramm(null);
    setSelectedCatalogueItem(null);
    setFormData({
      shellNum: '',
      notifyWhen: 50,
    });
    setPaperRolls([{ id: 1, paperRemaining: '' }]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 2, color: brandColors.textSecondary }}>
              Выберите дизайн из каталога и укажите граммовку упаковки
            </Typography>
            <StandardDesignPicker
              onSelect={handleDesignSelect}
              selectedCatalogueItemId={selectedCatalogueItemId}
              selectedGramm={selectedGramm}
              compact={true}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Номер полки"
                  value={formData.shellNum}
                  onChange={handleInputChange('shellNum')}
                  required
                  placeholder="например: A-12"
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
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="body2" sx={{ mb: 3, color: brandColors.textSecondary }}>
              Добавьте рулоны бумаги для{' '}
              <strong>
                {selectedCatalogueItem?.productName} ({selectedGramm} гр)
              </strong>
            </Typography>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Рулоны бумаги
              </Typography>
              <IconButton
                onClick={handleAddPaperRoll}
                sx={{
                  bgcolor: brandColors.primary,
                  color: 'white',
                  '&:hover': { bgcolor: brandColors.primaryHover },
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
                          zIndex: 1,
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

            {/* Summary */}
            <Paper
              variant="outlined"
              sx={{
                mt: 3,
                p: 2,
                backgroundColor: brandColors.primaryVeryLight,
                border: `1px solid ${brandColors.primary}`,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: brandColors.primary }}>
                Итого бумаги:{' '}
                {paperRolls
                  .reduce((sum, roll) => sum + (parseFloat(roll.paperRemaining) || 0), 0)
                  .toFixed(2)}{' '}
                кг
              </Typography>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '900px',
          bgcolor: 'background.paper',
          boxShadow: 24,
          borderRadius: 3,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: `1px solid ${brandColors.border}` }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: brandColors.textPrimary }}>
            Добавить рулоны стандартного дизайна
          </Typography>
        </Box>

        {/* Stepper */}
        <Box sx={{ px: 3, pt: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: 3,
          }}
        >
          <Box component="form" onSubmit={handleSubmit}>
            {renderStepContent(activeStep)}
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 3,
            borderTop: `1px solid ${brandColors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <Button onClick={handleClose} variant="outlined" disabled={loading}>
            Отмена
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {activeStep > 0 && (
              <Button onClick={handleBack} disabled={loading}>
                Назад
              </Button>
            )}

            {activeStep < steps.length - 1 ? (
              <Button onClick={handleNext} variant="contained">
                Далее
              </Button>
            ) : (
              <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Сохранить'}
              </Button>
            )}
          </Box>
        </Box>

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

export default AddStandardRollModal;
