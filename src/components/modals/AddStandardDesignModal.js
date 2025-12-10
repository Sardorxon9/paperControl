import React, { useState, useEffect } from 'react';
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
  MenuItem
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, addDoc, serverTimestamp, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const AddStandardDesignModal = ({ open, onClose, onDesignAdded, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    gramm: '',
    shellNum: '',
    notifyWhen: 3
  });

  // Product selection state
  const [productInputs, setProductInputs] = useState({
    packageType: "",
    product: ""
  });

  // Data from collections
  const [packageTypes, setPackageTypes] = useState([]);
  const [products, setProducts] = useState([]);
  const [possibleProducts, setPossibleProducts] = useState([]);

  const [paperRolls, setPaperRolls] = useState([{ id: 1, paperRemaining: '' }]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load initial data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch package types
        const packageTypesSnapshot = await getDocs(collection(db, "packageTypes"));
        const packageTypesList = packageTypesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPackageTypes(packageTypesList);

        // Fetch products collection
        const productsSnapshot = await getDocs(collection(db, "products"));
        const productsList = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsList);

        console.log("Fetched data:", { packageTypesList, productsList });
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке данных',
          severity: 'error'
        });
      }
    };

    if (open) {
      fetchInitialData();
    }
  }, [open]);

  // Handle product input changes
  const handleProductInputChange = async (field, value) => {
    setProductInputs(prev => ({ ...prev, [field]: value }));

    if (field === 'packageType') {
      // Fetch possible products for selected package type
      try {
        const possibleProductsSnapshot = await getDocs(
          collection(db, `packageTypes/${value}/possibleProducts`)
        );
        
        const possibleProductIds = possibleProductsSnapshot.docs.map(doc => doc.data().productID);
        
        // Get product details from products collection
        const productsWithNames = await Promise.all(
          possibleProductIds.map(async (productID) => {
            const productDoc = await getDoc(doc(db, "products", productID));
            if (productDoc.exists()) {
              return {
                id: productID,
                productName: productDoc.data().productName,
                ...productDoc.data()
              };
            }
            return null;
          })
        );
        
        setPossibleProducts(productsWithNames.filter(p => p !== null));
        
        // Reset dependent fields
        setProductInputs(prev => ({ ...prev, product: "" }));
        
      } catch (error) {
        console.error("Error fetching possible products:", error);
        setSnackbar({
          open: true,
          message: 'Ошибка при загрузке продуктов',
          severity: 'error'
        });
      }
    }
  };

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
    if (loading) return;
    setLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.gramm || !formData.shellNum) {
        throw new Error('Пожалуйста, заполните все обязательные поля');
      }

      if (!productInputs.packageType || !productInputs.product) {
        throw new Error('Пожалуйста, выберите тип упаковки и продукт');
      }

      if (paperRolls.some(roll => !roll.paperRemaining || isNaN(roll.paperRemaining))) {
        throw new Error('Пожалуйста, укажите корректное количество бумаги для всех рулонов');
      }

      // Calculate total paper from rolls
      const totalKg = paperRolls.reduce((sum, roll) => sum + parseFloat(roll.paperRemaining), 0);

      // Create product document with the new structure
      const productRef = await addDoc(collection(db, 'productTypes'), {
        name: formData.name,
        gramm: formData.gramm, // Keep as string
        shellNum: formData.shellNum,
        totalKG: totalKg,
        notifyWhen: parseFloat(formData.notifyWhen) || 3,
        packageID: productInputs.packageType, // Reference to packageTypes collection
        productID_2: productInputs.product, // Reference to products collection
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
        gramm: '',
        shellNum: '',
        notifyWhen: 3
      });

      setProductInputs({
        packageType: "",
        product: ""
      });

      setPaperRolls([{ id: 1, paperRemaining: '' }]);
      setPossibleProducts([]);

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
            {/* Product Selection Section */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  Выбор продукта
                </Typography>
                
                <Grid container spacing={2}>
                  {/* Package Type */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Тип упаковки"
                      value={productInputs.packageType}
                      onChange={(e) => handleProductInputChange('packageType', e.target.value)}
                      required
                      size="small"
                      SelectProps={{
                        renderValue: (selected) => {
                          if (!selected) {
                            return <span style={{ opacity: 0.6, fontStyle: "italic" }}>Выбрать</span>;
                          }
                          
                          const selectedPackage = packageTypes.find((p) => p.id === selected);
                          
                          if (!selectedPackage) {
                            const fallbackPackage = packageTypes.find((p) => 
                              p.name === selected || p.type === selected || p.id === selected
                            );
                            
                            if (fallbackPackage) {
                              return fallbackPackage.name || fallbackPackage.type || fallbackPackage.id;
                            }
                            
                            return selected;
                          }
                          
                          return selectedPackage.name || selectedPackage.type || selectedPackage.id;
                        },
                        MenuProps: {
                          PaperProps: {
                            sx: {
                              maxHeight: 250,
                              minWidth: 200,
                              '& .MuiMenuItem-root': {
                                fontSize: '0.9rem',
                                minHeight: '36px',
                                padding: '8px 16px',
                              }
                            }
                          }
                        }
                      }}
                    >
                      {packageTypes.length > 0 ? (
                        packageTypes.map((pkg) => (
                          <MenuItem key={pkg.id} value={pkg.id}>
                            {pkg.name || pkg.type || pkg.id}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">
                          Загрузка типов упаковки...
                        </MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  {/* Product */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Продукт"
                      value={productInputs.product}
                      onChange={(e) => handleProductInputChange('product', e.target.value)}
                      required
                      size="small"
                      disabled={!productInputs.packageType}
                      SelectProps={{
                        renderValue: (selected) => {
                          if (!selected) return <span style={{ opacity: 0.6, fontStyle: "italic" }}>Выбрать</span>;
                          
                          const item = possibleProducts.find((p) => p.id === selected);
                          
                          if (!item) {
                            const fallbackItem = possibleProducts.find((p) => 
                              p.productName === selected || p.name === selected || p.id === selected
                            );
                            
                            if (fallbackItem) {
                              return fallbackItem.productName || fallbackItem.name || fallbackItem.id;
                            }
                            
                            return selected;
                          }
                          
                          return item.productName || item.name || item.id;
                        },
                        MenuProps: {
                          PaperProps: { 
                            sx: { 
                              maxHeight: 250,
                              minWidth: 200 
                            } 
                          }
                        }
                      }}
                    >
                      {possibleProducts.length > 0 ? (
                        possibleProducts.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.productName || product.name || product.id}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">
                          {productInputs.packageType ? "Загрузка продуктов..." : "Сначала выберите тип упаковки"}
                        </MenuItem>
                      )}
                    </TextField>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

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
                  
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Граммовка"
                      value={formData.gramm}
                      onChange={handleInputChange('gramm')}
                      required
                      size="small"
                      placeholder="например: 120г"
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
                      placeholder="например: 2-A"
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