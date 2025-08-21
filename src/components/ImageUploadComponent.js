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
      return 'Поддерживаются только JPG и PNG форматы';
    }

    if (file.size > maxSize) {
      return 'Размер файла не должен превышать 3MB';
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    if (images.length + files.length > 2) {
      setError('Можно загрузить максимум 2 изображения');
      return;
    }

    const validFiles = [];
    for (const file of files) {
      const validation = validateFile(file);
      if (validation) {
        setError(validation);
        return;
      }
      validFiles.push(file);
    }

    // Create preview objects
    const newImages = validFiles.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      url: null,
      file: file,
      uploaded: false,
      preview: URL.createObjectURL(file)
    }));

    setImages(prev => [...prev, ...newImages]);
    setError('');

    // Start upload process
    uploadImages(newImages);
  };

  // Upload images to ImageKit
const uploadImages = async (imagesToUpload) => {
  setUploading(true);
  const updatedImages = [...images];

  try {
    for (let i = 0; i < imagesToUpload.length; i++) {
      const imageObj = imagesToUpload[i];
      const imageIndex = updatedImages.findIndex(img => img.id === imageObj.id);

      // Upload using ImageKit with authentication
      const uploadedUrl = await uploadToImageKit(imageObj.file);
      
      updatedImages[imageIndex] = {
        ...updatedImages[imageIndex],
        url: uploadedUrl,
        uploaded: true
      };
      setImages([...updatedImages]);
    }

    // Call parent callback with uploaded URLs
    const uploadedUrls = updatedImages
      .filter(img => img.uploaded && img.url)
      .map(img => img.url);
    
    onImagesChange(uploadedUrls);

  } catch (error) {
    console.error('Upload error:', error);
    setError('Ошибка при загрузке изображения. Попробуйте еще раз.');
    
    // Remove failed uploads
    setImages(prev => prev.filter(img => img.uploaded));
  } finally {
    setUploading(false);
  }
};


  // Upload single image using ImageKit with proper authentication
const uploadToImageKit = async (file) => {
  try {
    console.log("📤 Starting ImageKit upload for file:", file.name);

    // 1. Get authentication parameters from your auth server
  const authResponse = await fetch("/api/auth"); 


    if (!authResponse.ok) {
      throw new Error(`Auth server error: ${authResponse.status} - ${authResponse.statusText}`);
    }

    const authParams = await authResponse.json();
    console.log("🔑 Auth parameters received:", authParams);

    // 2. Prepare form data with EXACT parameter names ImageKit expects
    const uniqueFileName = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const formData = new FormData();
    
    // File and basic parameters
    formData.append("file", file);
    formData.append("fileName", uniqueFileName);
    formData.append("folder", "/clients");

    // CRITICAL: Authentication parameters with correct names
    formData.append("signature", authParams.signature);
    formData.append("expire", authParams.expire.toString()); // Ensure it's a string
    formData.append("token", authParams.token);
    formData.append("publicKey", authParams.publicKey); // This was missing before

    // Optional: Add additional parameters if needed
    formData.append("useUniqueFileName", "false"); // Since we're providing fileName

    console.log("📦 Upload parameters being sent:", {
      fileName: uniqueFileName,
      folder: "/clients",
      fileSize: file.size,
      fileType: file.type,
      expire: authParams.expire,
      token: authParams.token.substring(0, 8) + "...",
      signature: authParams.signature.substring(0, 10) + "...",
      publicKey: authParams.publicKey.substring(0, 10) + "..."
    });

    // 3. Upload to ImageKit with proper headers
    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for FormData
    });

    console.log("📡 ImageKit response status:", uploadResponse.status);

    // 4. Handle response
    if (!uploadResponse.ok) {
      let errorMessage = `Upload failed: ${uploadResponse.status}`;
      try {
        const errorData = await uploadResponse.json();
        console.error("❌ ImageKit error response:", errorData);
        errorMessage += ` - ${errorData.message || JSON.stringify(errorData)}`;
      } catch {
        const rawText = await uploadResponse.text();
        console.error("❌ Non-JSON error response:", rawText);
        errorMessage += " - " + rawText.substring(0, 200);
      }
      throw new Error(errorMessage);
    }

    // 5. Parse successful response
    const data = await uploadResponse.json();
    console.log("✅ ImageKit upload successful:", data);

    if (data.url) {
      return data.url;
    } else {
      throw new Error("Upload failed: No URL returned by ImageKit");
    }
  } catch (error) {
    console.error("🔥 ImageKit upload error:", error);
    throw error;
  }
};
  // Remove image
  const handleRemoveImage = (imageId) => {
    const imageToRemove = images.find(img => img.id === imageId);
    
    // Revoke object URL to prevent memory leaks
    if (imageToRemove && imageToRemove.preview && imageToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    const updatedImages = images.filter(img => img.id !== imageId);
    setImages(updatedImages);
    
    const uploadedUrls = updatedImages
      .filter(img => img.uploaded && img.url)
      .map(img => img.url);
    
    onImagesChange(uploadedUrls);
  };

  // Check if we can add more images
  const canAddMore = images.length < 2 && !disabled;

  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 3, 
        backgroundColor: 'grey.50',
        border: '1px solid',
        borderColor: 'grey.200'
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          mb: 2,
          color: 'text.primary',
          fontSize: '1.15em'
        }}
      >
        Изображения клиента *
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Display current images */}
        {images.map((image, index) => (
          <Grid item xs={12} sm={6} key={image.id}>
            <Card variant="outlined" sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                height="200"
                image={image.preview}
                alt={`Client image ${index + 1}`}
                sx={{ objectFit: 'cover' }}
              />
              
              {!image.uploaded && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <CircularProgress color="inherit" />
                  <Typography sx={{ ml: 1 }}>Загрузка...</Typography>
                </Box>
              )}

              <IconButton
                onClick={() => handleRemoveImage(image.id)}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  color: 'error.main',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.9)'
                  }
                }}
                size="small"
                disabled={uploading || disabled}
              >
                <DeleteIcon />
              </IconButton>
              
              <Box sx={{ p: 1, textAlign: 'center' }}>
                <Typography variant="caption">
                  {image.uploaded ? 'Загружено' : 'Загружается...'}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}

        {/* Add new image button */}
        {canAddMore && (
          <Grid item xs={12} sm={6}>
            <Card 
              variant="outlined" 
              sx={{ 
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2px dashed',
                borderColor: 'primary.main',
                backgroundColor: 'primary.50',
                '&:hover': {
                  backgroundColor: 'primary.100'
                }
              }}
            >
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