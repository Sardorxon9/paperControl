import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  MenuItem,
  Stack,
  IconButton,
  Alert
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';

const DEFAULT_PLACEHOLDER_URL = "https://ik.imagekit.io/php1jcf0t/default_placeholder.jpg";

// ImageKit upload function (server-side auth)
const uploadToImageKit = async (file) => {
  try {
    const authResponse = await fetch("/api/auth");
    if (!authResponse.ok) {
      throw new Error("Failed to get auth parameters from server.");
    }
    const authParams = await authResponse.json();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("publicKey", authParams.publicKey);
    formData.append("signature", authParams.signature);
    formData.append("token", authParams.token);
    formData.append("expire", authParams.expire);
    formData.append("fileName", file.name);

    const uploadResponse = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        body: formData
      }
    );

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.message || "Image upload failed");
    }

    const result = await uploadResponse.json();
    return result.url;
  } catch (err) {
    throw new Error(`Upload failed: ${err.message}`);
  }
};

// EditableImageSlot Component
const EditableImageSlot = ({ label, imageUrl, onImageChange, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (!allowed.includes(file.type)) {
      setError("Недопустимый тип файла. Только JPG и PNG.");
      return false;
    }
    if (file.size > maxSize) {
      setError("Файл превышает 3 МБ.");
      return false;
    }
    setError("");
    return true;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateFile(file)) return;

    setUploading(true);
    try {
      const url = await uploadToImageKit(file);
      onImageChange(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = imageUrl || DEFAULT_PLACEHOLDER_URL;

  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="body2" sx={{ mb: 1, color: "#616161", fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ position: "relative", width: 160, height: 160, mx: "auto" }}>
        <img
          src={displayUrl}
          alt="product"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #e0e0e0",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        />
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          id={`file-input-${label}`}
          style={{ display: "none" }}
          onChange={handleFileSelect}
          disabled={uploading || disabled}
          ref={fileInputRef}
        />
        <label htmlFor={`file-input-${label}`}>
          <IconButton
            component="span"
            size="small"
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": { bgcolor: "#f5f5f5" }
            }}
            disabled={uploading || disabled}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </label>
        {uploading && (
          <CircularProgress
            size={32}
            sx={{ position: "absolute", top: "40%", left: "40%" }}
          />
        )}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 1, fontSize: 12 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

// Main Edit Modal Component
const EditStandardDesignModal = ({ open, onClose, productId, onSaveSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    gramm: '',
    shellNum: '',
    notifyWhen: 3,
    packageType: '',
    product: '',
    imageURL1: '',
    imageURL2: ''
  });

  const [packageTypes, setPackageTypes] = useState([]);
  const [possibleProducts, setPossibleProducts] = useState([]);
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
        name: '',
        gramm: '',
        shellNum: '',
        notifyWhen: 3,
        packageType: '',
        product: '',
        imageURL1: '',
        imageURL2: ''
      });
      setPackageTypes([]);
      setPossibleProducts([]);
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

      // Fetch package types
      const packageTypesSnapshot = await getDocs(collection(db, "packageTypes"));
      const packageTypesList = packageTypesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPackageTypes(packageTypesList);

      // Fetch possible products for current package type
      if (data.packageID) {
        const possibleProductsSnapshot = await getDocs(
          collection(db, `packageTypes/${data.packageID}/possibleProducts`)
        );
        const possibleProductIds = possibleProductsSnapshot.docs.map(doc => doc.data().productID);
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
      }

      // Set form data
      setFormData({
        name: data.name || '',
        gramm: data.gramm || '',
        shellNum: data.shellNum || '',
        notifyWhen: data.notifyWhen || 3,
        packageType: data.packageID || '',
        product: data.productID_2 || '',
        imageURL1: data.imageURL1 || '',
        imageURL2: data.imageURL2 || ''
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

  const handlePackageTypeChange = async (value) => {
    setFormData(prev => ({ ...prev, packageType: value, product: '' }));

    if (value) {
      try {
        const possibleProductsSnapshot = await getDocs(
          collection(db, `packageTypes/${value}/possibleProducts`)
        );
        const possibleProductIds = possibleProductsSnapshot.docs.map(doc => doc.data().productID);
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
      } catch (error) {
        console.error("Error fetching possible products:", error);
        alert('Ошибка при загрузке продуктов');
      }
    } else {
      setPossibleProducts([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // Validate required fields
    if (!formData.name || !formData.gramm || !formData.shellNum) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (!formData.packageType || !formData.product) {
      alert('Пожалуйста, выберите тип упаковки и продукт');
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        name: formData.name,
        gramm: formData.gramm,
        shellNum: formData.shellNum,
        notifyWhen: parseFloat(formData.notifyWhen) || 3,
        packageID: formData.packageType,
        productID_2: formData.product,
        imageURL1: formData.imageURL1 || DEFAULT_PLACEHOLDER_URL,
        imageURL2: formData.imageURL2 || '',
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
              {/* Product Selection Section */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Выбор продукта
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        label="Тип упаковки"
                        value={formData.packageType}
                        onChange={(e) => handlePackageTypeChange(e.target.value)}
                        required
                        size="small"
                      >
                        {packageTypes.map((pkg) => (
                          <MenuItem key={pkg.id} value={pkg.id}>
                            {pkg.name || pkg.type || pkg.id}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        label="Продукт"
                        value={formData.product}
                        onChange={handleInputChange('product')}
                        required
                        size="small"
                        disabled={!formData.packageType}
                      >
                        {possibleProducts.length > 0 ? (
                          possibleProducts.map((product) => (
                            <MenuItem key={product.id} value={product.id}>
                              {product.productName || product.name || product.id}
                            </MenuItem>
                          ))
                        ) : (
                          <MenuItem disabled value="">
                            {formData.packageType ? "Загрузка продуктов..." : "Сначала выберите тип упаковки"}
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
                    
                    <Grid item xs={12} sm={3}>
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
                    
                    <Grid item xs={12} sm={3}>
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

              {/* Images Section */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Изображения продукта
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <EditableImageSlot
                        label="Основное изображение"
                        imageUrl={formData.imageURL1}
                        onImageChange={(url) =>
                          setFormData((prev) => ({ ...prev, imageURL1: url }))
                        }
                        disabled={saving}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <EditableImageSlot
                        label="Дополнительное изображение"
                        imageUrl={formData.imageURL2}
                        onImageChange={(url) =>
                          setFormData((prev) => ({ ...prev, imageURL2: url }))
                        }
                        disabled={saving}
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