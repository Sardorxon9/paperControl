import React, { useState, useRef } from 'react';
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
  IconButton,
  Alert,
  Card,
  CardMedia,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { brandColors } from '../../theme/colors';

// ImageKit upload function
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

    let expireTimestamp = authParams.expire;
    if (typeof expireTimestamp === 'string') {
      expireTimestamp = parseInt(expireTimestamp, 10);
    }

    const now = Math.floor(Date.now() / 1000);
    const oneHourFromNow = now + 3600;

    if (expireTimestamp > oneHourFromNow) {
      expireTimestamp = now + 1800;
    }
    if (expireTimestamp <= now) {
      expireTimestamp = now + 1800;
    }

    formData.append("expire", expireTimestamp.toString());
    formData.append("fileName", file.name);
    formData.append("folder", "/Catalogue");

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

// Image Upload Slot Component
const ImageUploadSlot = ({ index, imageUrl, onImageChange, onRemove, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (!allowed.includes(file.type)) {
      setError("Только JPG и PNG.");
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
      onImageChange(index, url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!imageUrl) {
    return (
      <Card sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e0e0e0' }}>
        <Stack alignItems="center" spacing={1}>
          <input
            accept="image/jpeg,image/jpg,image/png"
            style={{ display: 'none' }}
            id={`image-upload-${index}`}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            ref={fileInputRef}
          />
          <label htmlFor={`image-upload-${index}`}>
            <Button
              variant="outlined"
              component="span"
              startIcon={<CloudUploadIcon />}
              disabled={uploading || disabled}
              size="small"
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </label>
          {error && (
            <Typography variant="caption" color="error" sx={{ fontSize: 10 }}>
              {error}
            </Typography>
          )}
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ position: 'relative', height: 140 }}>
      <CardMedia
        component="img"
        height="140"
        image={imageUrl}
        alt={`Изображение ${index + 1}`}
        sx={{ objectFit: 'cover' }}
      />
      <IconButton
        size="small"
        onClick={() => onRemove(index)}
        disabled={disabled}
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 1)',
          },
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
      {uploading && (
        <CircularProgress
          size={32}
          sx={{ position: 'absolute', top: '40%', left: '45%' }}
        />
      )}
    </Card>
  );
};

// Main Add Catalogue Item Modal
const AddCatalogueItemModal = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    productName: '',
    productCode: '',
    packageType: '',
    usedMaterial: '',
    comment: '',
    marketPlace: false,
  });

  const [images, setImages] = useState(['', '', '', '', '']); // 5 image slots
  const [grammOptions, setGrammOptions] = useState([
    { id: 1, value: '' },
    { id: 2, value: '' },
    { id: 3, value: '' },
  ]); // Start with 3 gramm fields

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const usedMaterials = [
    'Белый сахар',
    'Коричневый сахар',
    'Сливки',
    'Соль',
    'Сахарозаменитель',
  ];

  const packageTypes = ['Стик', 'Саше'];

  const handleInputChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleCheckboxChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.checked });
  };

  const handleImageChange = (index, url) => {
    const newImages = [...images];
    newImages[index] = url;
    setImages(newImages);
  };

  const handleImageRemove = (index) => {
    const newImages = [...images];
    newImages[index] = '';
    setImages(newImages);
  };

  const handleGrammChange = (id, value) => {
    setGrammOptions(prev =>
      prev.map(option =>
        option.id === id ? { ...option, value } : option
      )
    );
  };

  const handleAddGrammField = () => {
    if (grammOptions.length < 5) {
      const newId = Math.max(...grammOptions.map(o => o.id), 0) + 1;
      setGrammOptions([...grammOptions, { id: newId, value: '' }]);
    }
  };

  const handleRemoveGrammField = (id) => {
    if (grammOptions.length > 3) {
      setGrammOptions(prev => prev.filter(option => option.id !== id));
    }
  };

  const handleReset = () => {
    setFormData({
      productName: '',
      productCode: '',
      packageType: '',
      usedMaterial: '',
      comment: '',
      marketPlace: false,
    });
    setImages(['', '', '', '', '']);
    setGrammOptions([
      { id: 1, value: '' },
      { id: 2, value: '' },
      { id: 3, value: '' },
    ]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    // Validate required fields
    if (!formData.productName.trim()) {
      setError('Название продукта обязательно');
      return;
    }
    if (!formData.productCode.trim()) {
      setError('Код продукта обязателен');
      return;
    }
    if (!formData.packageType) {
      setError('Выберите тип упаковки');
      return;
    }
    if (!formData.usedMaterial) {
      setError('Выберите используемый материал');
      return;
    }

    // Validate at least one image
    const uploadedImages = images.filter(img => img);
    if (uploadedImages.length === 0) {
      setError('Загрузите хотя бы одно изображение');
      return;
    }

    // Validate gramm options
    const validGramms = grammOptions
      .map(option => option.value.trim())
      .filter(value => value && !isNaN(parseFloat(value)))
      .map(value => parseFloat(value));

    if (validGramms.length === 0) {
      setError('Укажите хотя бы одну граммовку');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Prepare catalogue item data
      const catalogueData = {
        productName: formData.productName.trim(),
        productCode: formData.productCode.trim(),
        packageType: formData.packageType,
        usedMaterial: formData.usedMaterial,
        comment: formData.comment.trim() || 'n/a',
        marketPlace: formData.marketPlace,
        possibleGramms: validGramms.sort((a, b) => a - b),
        imageURL: uploadedImages[0] || '',
        imageURL2: uploadedImages[1] || '',
        imageURL3: uploadedImages[2] || '',
        imageURL4: uploadedImages[3] || '',
        imageURL5: uploadedImages[4] || '',
        paperDocID: 'n/a', // Will be set when paper rolls are added
        createdAt: serverTimestamp(),
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'catalogue'), catalogueData);

      console.log('Catalogue item created with ID:', docRef.id);

      // Reset form
      handleReset();

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      onClose();

    } catch (error) {
      console.error('Error creating catalogue item:', error);
      setError(`Ошибка при создании: ${error.message}`);
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
        maxWidth: '1000px',
        bgcolor: 'background.paper',
        boxShadow: 24,
        borderRadius: 3,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <Box sx={{
          p: 3,
          borderBottom: `1px solid ${brandColors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: brandColors.textPrimary }}>
            Добавить новый дизайн в каталог
          </Typography>
          <IconButton onClick={onClose} disabled={saving}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: brandColors.primary }}>
                    Основная информация
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Название продукта"
                        value={formData.productName}
                        onChange={handleInputChange('productName')}
                        required
                        placeholder="например: Сахар Белый в Стик упаковках"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Код продукта"
                        value={formData.productCode}
                        onChange={handleInputChange('productCode')}
                        required
                        placeholder="например: ST-OQ-300-2-UZM"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        label="Тип упаковки"
                        value={formData.packageType}
                        onChange={handleInputChange('packageType')}
                        required
                      >
                        {packageTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        select
                        fullWidth
                        label="Используемый материал"
                        value={formData.usedMaterial}
                        onChange={handleInputChange('usedMaterial')}
                        required
                      >
                        {usedMaterials.map((material) => (
                          <MenuItem key={material} value={material}>
                            {material}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Комментарий"
                        value={formData.comment}
                        onChange={handleInputChange('comment')}
                        multiline
                        rows={3}
                        placeholder="Дополнительная информация о продукте..."
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={formData.marketPlace}
                            onChange={handleCheckboxChange('marketPlace')}
                            color="primary"
                          />
                        }
                        label="Доступно на маркетплейсе"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Gramm Options */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: brandColors.primary }}>
                      Доступные граммовки
                    </Typography>
                    {grammOptions.length < 5 && (
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAddGrammField}
                        disabled={saving}
                      >
                        Добавить
                      </Button>
                    )}
                  </Box>

                  <Grid container spacing={2}>
                    {grammOptions.map((option, index) => (
                      <Grid item xs={12} sm={6} md={4} key={option.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TextField
                            fullWidth
                            label={`Граммовка ${index + 1}`}
                            value={option.value}
                            onChange={(e) => handleGrammChange(option.id, e.target.value)}
                            type="number"
                            placeholder="например: 5"
                            inputProps={{ step: '0.1', min: '0' }}
                          />
                          {grammOptions.length > 3 && (
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveGrammField(option.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Укажите от 1 до 5 возможных граммовок для данного продукта
                  </Typography>
                </Paper>
              </Grid>

              {/* Images */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: brandColors.primary }}>
                    Изображения продукта
                  </Typography>

                  <Grid container spacing={2}>
                    {images.map((imageUrl, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
                          {index === 0 ? 'Основное изображение' : `Изображение ${index + 1}`}
                        </Typography>
                        <ImageUploadSlot
                          index={index}
                          imageUrl={imageUrl}
                          onImageChange={handleImageChange}
                          onRemove={handleImageRemove}
                          disabled={saving}
                        />
                      </Grid>
                    ))}
                  </Grid>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Загрузите до 5 изображений продукта. Первое изображение будет основным.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{
          p: 3,
          borderTop: `1px solid ${brandColors.border}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
        }}>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={saving}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving}
            sx={{
              bgcolor: brandColors.primary,
              '&:hover': {
                bgcolor: brandColors.primaryHover,
              },
            }}
          >
            {saving ? <CircularProgress size={24} /> : 'Создать дизайн'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default AddCatalogueItemModal;
