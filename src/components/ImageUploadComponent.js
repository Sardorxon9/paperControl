import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  IconButton,
  Card,
  CardMedia,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// Function to upload a single image to ImageKit
const uploadToImageKit = async (file) => {
  try {
    const authResponse = await fetch('/api/auth');
    if (!authResponse.ok) {
      throw new Error('Failed to get auth parameters from server.');
    }
    const authParams = await authResponse.json();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("publicKey", authParams.publicKey);
    formData.append("signature", authParams.signature);
    formData.append("token", authParams.token);
    // Ensure the expire parameter is sent as a number
    formData.append("expire", authParams.expire);
    formData.append("fileName", file.name);
    formData.append("folder", "/Clients");


    const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.message || 'Image upload failed');
    }

    const result = await uploadResponse.json();
    return result.url;
  } catch (err) {
    throw new Error(`Upload failed: ${err.message}`);
  }
};

const ImageUploadComponent = ({ 
  onImagesChange, 
  existingImages = [], 
  disabled = false 
}) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load existing images if provided
    if (existingImages.length > 0) {
      const loadedImages = existingImages.map((url, index) => ({
        id: `existing-${index}`,
        url: url,
        file: null,
        uploaded: true,
        preview: url
      }));
      setImages(loadedImages);
    }
  }, [existingImages]);

  // Validate file before upload
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 3 * 1024 * 1024; // 3MB

    if (!allowedTypes.includes(file.type)) {
      setError('Недопустимый тип файла. Поддерживаются только JPG и PNG.');
      return false;
    }

    if (file.size > maxSize) {
      setError('Размер файла превышает 3МБ.');
      return false;
    }

    setError('');
    return true;
  };

  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!validateFile(file)) return;

    if (images.length >= 2) {
      setError('Вы можете добавить только 2 изображения.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const imageUrl = await uploadToImageKit(file);
      const newImage = {
        id: file.name,
        url: imageUrl,
        file: file,
        uploaded: true,
        preview: URL.createObjectURL(file)
      };

      const newImages = [...images, newImage];
      setImages(newImages);
      onImagesChange(newImages.map(img => img.url));

    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (id) => {
    const newImages = images.filter(image => image.id !== id);
    setImages(newImages);
    onImagesChange(newImages.map(img => img.url));
  };
  
  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Загрузить изображения клиента
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {images.map((image) => (
          <Grid item xs={6} key={image.id}>
            <Card sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                height="140"
                image={image.preview}
                alt={`Image preview ${image.id}`}
              />
              <IconButton
                aria-label="delete"
                onClick={() => handleRemoveImage(image.id)}
                disabled={disabled}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Card>
          </Grid>
        ))}

        {images.length < 2 && (
          <Grid item xs={6}>
            <Card sx={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stack alignItems="center" spacing={1}>
                <input
                  accept="image/jpeg,image/jpg,image/png"
                  style={{ display: 'none' }}
                  id={`image-upload-${images.length}`}
                  multiple={images.length === 0}
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading || disabled}
                />
                <label htmlFor={`image-upload-${images.length}`}>
                  <Button
                    variant="contained"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={uploading || disabled}
                  >
                    Добавить изображение
                  </Button>
                </label>
                <Typography variant="caption" color="text.secondary">
                  JPG, PNG (макс. 3MB)
                </Typography>
              </Stack>
            </Card>
          </Grid>
        )}
      </Grid>

      {images.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Добавьте 2 изображения клиента (обязательно)
        </Typography>
      )}
      
      {images.length > 0 && images.length < 2 && (
        <Typography variant="body2" color="warning.main" sx={{ mt: 2 }}>
          Добавьте еще {2 - images.length} изображение(й)
        </Typography>
      )}
    </Paper>
  );
};

export default ImageUploadComponent;