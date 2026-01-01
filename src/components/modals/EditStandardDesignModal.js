import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';

// Main Edit Modal Component
const EditStandardDesignModal = ({ open, onClose, productId, onSaveSuccess }) => {
  const [formData, setFormData] = useState({
    gramm: '',
    shellNum: '',
    notifyWhen: 3,
  });

  const [catalogueData, setCatalogueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (open && productId) {
      loadProductData();
    }
  }, [open, productId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        gramm: '',
        shellNum: '',
        notifyWhen: 3,
      });
      setCatalogueData(null);
    }
  }, [open]);

  const loadProductData = async () => {
    setLoading(true);
    try {
      // Fetch current product data
      const productRef = doc(db, "productTypes", productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        throw new Error('Product not found');
      }

      const data = productSnap.data();

      // Fetch catalogue data using catalogueItemID
      if (data.catalogueItemID) {
        const catalogueRef = doc(db, "catalogue", data.catalogueItemID);
        const catalogueSnap = await getDoc(catalogueRef);
        if (catalogueSnap.exists()) {
          setCatalogueData(catalogueSnap.data());
        }
      }

      // Set form data (only editable fields)
      setFormData({
        gramm: data.gramm || '',
        shellNum: data.shellNum || '',
        notifyWhen: data.notifyWhen || 3,
      });

    } catch (error) {
      console.error('Error loading product data:', error);
      alert('Ошибка при загрузке данных продукта');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // Validate required fields
    if (!formData.gramm || !formData.shellNum) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        gramm: formData.gramm,
        shellNum: formData.shellNum,
        notifyWhen: parseFloat(formData.notifyWhen) || 3,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'productTypes', productId), updateData);

      alert('Изменения успешно сохранены!');

      if (onSaveSuccess) {
        onSaveSuccess();
      }

      onClose();

    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Ошибка при сохранении изменений');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={() => !saving && onClose()}
    >
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '900px',
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 2,
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
          Редактировать стандартный дизайн
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Catalogue Info (Read-only) */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Информация из каталога (только для чтения)
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Название продукта"
                        value={catalogueData?.productName || '-'}
                        disabled
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Код продукта"
                        value={catalogueData?.productCode || '-'}
                        disabled
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Тип упаковки"
                        value={catalogueData?.packageType || '-'}
                        disabled
                        size="small"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Используемый материал"
                        value={catalogueData?.usedMaterial || '-'}
                        disabled
                        size="small"
                      />
                    </Grid>
                  </Grid>

                  {catalogueData?.imageURL && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        Изображение из каталога
                      </Typography>
                      <img
                        src={catalogueData.imageURL}
                        alt="Product"
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid #ddd'
                        }}
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* Editable Fields */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Редактируемые параметры
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Граммовка"
                        value={formData.gramm}
                        onChange={handleInputChange('gramm')}
                        required
                        type="number"
                        inputProps={{ step: '0.1', min: '0' }}
                        placeholder="например: 5"
                        helperText="Граммовка упаковки"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Номер полки"
                        value={formData.shellNum}
                        onChange={handleInputChange('shellNum')}
                        required
                        placeholder="например: A-12"
                        helperText="Где находится на складе"
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Уведомить при (кг)"
                        type="number"
                        value={formData.notifyWhen}
                        onChange={handleInputChange('notifyWhen')}
                        inputProps={{ step: '0.01', min: '0' }}
                        helperText="Минимальный остаток"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button 
                onClick={onClose} 
                variant="outlined" 
                disabled={saving}
              >
                Отмена
              </Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? <CircularProgress size={24} /> : 'Сохранить изменения'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default EditStandardDesignModal;