import { useState, useEffect } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Typography,
  FormControlLabel,
  Checkbox,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { brandColors } from "../../theme/colors";

// Default placeholder
const DEFAULT_PLACEHOLDER_URL =
  "https://ik.imagekit.io/php1jcf0t/default_placeholder.jpg?updatedAt=1755710788958";

// Upload function for ImageKit
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
        body: formData,
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

// Editable image slot component
const EditableImageSlot = ({ label, imageUrl, onImageChange, disabled }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const validateFile = (file) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    const maxSize = 3 * 1024 * 1024;
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

  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography
        variant="body2"
        sx={{ mb: 1, color: brandColors.textSecondary, fontWeight: 500 }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          position: "relative",
          width: 120,
          height: 120,
          mx: "auto",
        }}
      >
        <img
          src={imageUrl || DEFAULT_PLACEHOLDER_URL}
          alt="product"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 8,
            border: `1px solid ${brandColors.border}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        />
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          id={`file-input-${label}`}
          style={{ display: "none" }}
          onChange={handleFileSelect}
          disabled={uploading || disabled}
        />
        <label htmlFor={`file-input-${label}`}>
          <IconButton
            component="span"
            size="small"
            sx={{
              position: "absolute",
              bottom: 4,
              right: 4,
              bgcolor: "white",
              boxShadow: 2,
              "&:hover": { bgcolor: brandColors.gray },
            }}
            disabled={uploading || disabled}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </label>
        {uploading && (
          <CircularProgress
            size={32}
            sx={{
              position: "absolute",
              top: "35%",
              left: "35%",
              color: brandColors.primary,
            }}
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

export default function EditProductModal({ open, onClose, product, onProductUpdated }) {
  const [formData, setFormData] = useState({
    productName: "",
    packageType: "",
    usedMaterial: "",
    productCode: "",
    marketPlace: false,
    paperDocID: "",
    gramm: "",
    imageURL: "",
    imageURL2: "",
    imageURL3: "",
    imageURL4: "",
    imageURL5: "",
  });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        productName: product.productName || "",
        packageType: product.packageType || "",
        usedMaterial: product.usedMaterial || "",
        productCode: product.productCode || "",
        marketPlace: product.marketPlace || false,
        paperDocID: product.paperDocID || "",
        gramm: product.gramm || "",
        imageURL: product.imageURL || DEFAULT_PLACEHOLDER_URL,
        imageURL2: product.imageURL2 || "",
        imageURL3: product.imageURL3 || "",
        imageURL4: product.imageURL4 || "",
        imageURL5: product.imageURL5 || "",
      });
    }
  }, [product]);

  const handleInputChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (field, url) => {
    setFormData((prev) => ({ ...prev, [field]: url }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productRef = doc(db, "catalogue", product.id);

      const updateData = {
        productName: formData.productName.trim(),
        packageType: formData.packageType.trim(),
        usedMaterial: formData.usedMaterial.trim(),
        productCode: formData.productCode.trim(),
        marketPlace: formData.marketPlace,
        paperDocID: formData.paperDocID.trim(),
        gramm: formData.gramm.trim(),
        imageURL: formData.imageURL,
        imageURL2: formData.imageURL2,
        imageURL3: formData.imageURL3,
        imageURL4: formData.imageURL4,
        imageURL5: formData.imageURL5,
      };

      await updateDoc(productRef, updateData);

      setSnackbar({
        open: true,
        message: "Продукт успешно обновлен!",
        severity: "success",
      });

      // Call the callback to refresh the product list
      if (onProductUpdated) {
        onProductUpdated();
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Error updating product:", err);
      setSnackbar({
        open: true,
        message: "Ошибка при обновлении продукта",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (!product) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pb: 2,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: brandColors.dark }}>
            Редактировать продукт
          </Typography>
          <IconButton onClick={onClose} disabled={saving}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Info */}
              <Grid item xs={12}>
                <Typography
                  variant="h6"
                  sx={{ mb: 2, fontWeight: 600, color: brandColors.dark }}
                >
                  Основная информация
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Название продукта"
                  value={formData.productName}
                  onChange={handleInputChange("productName")}
                  required
                  disabled={saving}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Тип упаковки"
                  value={formData.packageType}
                  onChange={handleInputChange("packageType")}
                  required
                  disabled={saving}
                  placeholder="Например: Стик, Саше"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Используемый материал"
                  value={formData.usedMaterial}
                  onChange={handleInputChange("usedMaterial")}
                  required
                  disabled={saving}
                  placeholder="Например: Белый сахар"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Граммовка"
                  value={formData.gramm}
                  onChange={handleInputChange("gramm")}
                  disabled={saving}
                  placeholder="Например: 5, 8, 10"
                  helperText="Возможные значения граммовки через запятую"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Код продукта"
                  value={formData.productCode}
                  onChange={handleInputChange("productCode")}
                  required
                  disabled={saving}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ID документа бумаги"
                  value={formData.paperDocID}
                  onChange={handleInputChange("paperDocID")}
                  disabled={saving}
                  placeholder="Необязательно"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.marketPlace}
                      onChange={handleInputChange("marketPlace")}
                      disabled={saving}
                    />
                  }
                  label="Доступно на маркетплейсе"
                />
              </Grid>

              {/* Images Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography
                  variant="h6"
                  sx={{ mb: 3, fontWeight: 600, color: brandColors.dark }}
                >
                  Изображения продукта
                </Typography>
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <EditableImageSlot
                  label="Фото 1"
                  imageUrl={formData.imageURL}
                  onImageChange={(url) => handleImageChange("imageURL", url)}
                  disabled={saving}
                />
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <EditableImageSlot
                  label="Фото 2"
                  imageUrl={formData.imageURL2}
                  onImageChange={(url) => handleImageChange("imageURL2", url)}
                  disabled={saving}
                />
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <EditableImageSlot
                  label="Фото 3"
                  imageUrl={formData.imageURL3}
                  onImageChange={(url) => handleImageChange("imageURL3", url)}
                  disabled={saving}
                />
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <EditableImageSlot
                  label="Фото 4"
                  imageUrl={formData.imageURL4}
                  onImageChange={(url) => handleImageChange("imageURL4", url)}
                  disabled={saving}
                />
              </Grid>

              <Grid item xs={6} sm={4} md={2.4}>
                <EditableImageSlot
                  label="Фото 5"
                  imageUrl={formData.imageURL5}
                  onImageChange={(url) => handleImageChange("imageURL5", url)}
                  disabled={saving}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={onClose} disabled={saving} variant="outlined">
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            variant="contained"
            sx={{
              backgroundColor: brandColors.dark,
              "&:hover": {
                backgroundColor: brandColors.primary,
              },
            }}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? "Сохранение..." : "Сохранить изменения"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
