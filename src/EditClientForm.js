import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Snackbar,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  IconButton,
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputAdornment,
  Card,
  CardContent
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import InventoryIcon from "@mui/icons-material/Inventory";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CommentIcon from "@mui/icons-material/Comment";
import ImageIcon from "@mui/icons-material/Image";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  GeoPoint,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

import './components/ui/css/EditClientForm.css'
// 🔗 Default placeholder
const DEFAULT_PLACEHOLDER_URL =
  "https://ik.imagekit.io/php1jcf0t/default_placeholder.jpg?updatedAt=1755710788958";

// 🔧 Upload function (same as in ImageUploadComponent)
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

// 🖼️ Editable single-slot component
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
      <Typography variant="body2" sx={{ mb: 1, color: "#616161", fontWeight: 500 }}>
        {label}
      </Typography>
      <Box sx={{ position: "relative", width: 160, height: 160, mx: "auto" }}>
        <img
          src={imageUrl}
          alt="client"
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

export default function EditClientForm({ clientId, onClientUpdated, onClose }) {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    orgName: "",
    addressShort: "",
    geoPoint: "",
    designType: "unique",
    shellNum: "",
    notifyWhen: "",
    comment: "",
    imageURL1: DEFAULT_PLACEHOLDER_URL,
  });
  const [productInputs, setProductInputs] = useState({
    type: "",
    packaging: "",
    gramm: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const isStandardDesign = formData.designType === "standart";

  // Fetch client + productTypes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodSnap = await getDocs(collection(db, "productTypes"));
        const productList = prodSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productList);

        const clientRef = doc(db, "clients", clientId);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          const data = clientSnap.data();
          setFormData({
            name: data.name || "",
            orgName: data.orgName || "",
            addressShort: data.addressShort || "",
            geoPoint: data.addressLong
              ? `${data.addressLong.latitude}, ${data.addressLong.longitude}`
              : "",
            designType: data.designType || "unique",
            shellNum: data.shellNum || "",
            notifyWhen: data.notifyWhen || "",
            comment: data.comment || "",
            imageURL1: data.imageURL1 || DEFAULT_PLACEHOLDER_URL,
          });

          const matchedProduct = productList.find(
            (p) => p.productId === data.productId
          );
          if (matchedProduct) {
            setProductInputs({
              type: matchedProduct.type || "",
              packaging: matchedProduct.packaging || "",
              gramm: matchedProduct.gramm || ""
            });
          }
        }
      } catch (err) {
        console.error("Error loading client:", err);
        setMessage({ type: "error", text: "Ошибка при загрузке клиента" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  // Input handlers
  const handleInputChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  // Update client
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const clientRef = doc(db, "clients", clientId);

      const [lat, lng] = formData.geoPoint
        .split(",")
        .map((coord) => parseFloat(coord.trim()));

      const updateData = {
        name: formData.name,
        orgName: formData.orgName,
        addressShort: formData.addressShort,
        addressLong: new GeoPoint(lat, lng),
        designType: formData.designType,
        shellNum: formData.shellNum,
        notifyWhen: parseFloat(formData.notifyWhen),
        comment: formData.comment,
        imageURL1: formData.imageURL1 || DEFAULT_PLACEHOLDER_URL,
        updatedAt: Timestamp.now()
      };

      await updateDoc(clientRef, updateData);

      setMessage({ type: "success", text: "Клиент обновлен" });
      if (onClientUpdated) onClientUpdated();
      onClose();
    } catch (err) {
      console.error("Error updating client:", err);
      setMessage({ type: "error", text: "Ошибка при обновлении клиента" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  // Helpers
  const getUniqueTypes = () =>
    [...new Set(products.map((p) => p.type))].filter(Boolean);
  const getUniquePackaging = () =>
    [...new Set(products.map((p) => p.packaging))].filter(Boolean);
  const getUniqueGramms = () =>
    [...new Set(products.map((p) => p.gramm))].filter(Boolean);

  return (
    <Box className="edit-client-modal">
      <Paper className="edit-client-paper">
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 16, right: 16 }}
        >
          <CloseIcon />
        </IconButton>

        <Typography variant="h5" className="edit-client-header">
          Редактировать клиента
        </Typography>
        <Divider className="edit-client-divider" />

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {/* Restaurant Information Section */}
          <Card className="form-section" variant="outlined">
            <CardContent>
              <Typography variant="h6" className="form-section-title">
                <BusinessIcon /> Информация о ресторане
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Название ресторана"
                    value={formData.name}
                    onChange={handleInputChange("name")}
                   
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Организация"
                    value={formData.orgName}
                    onChange={handleInputChange("orgName")}
                  
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Design Type Section */}
          <Card className="form-section" variant="outlined">
            <CardContent>
              <Typography variant="h6" className="form-section-title">
                <DesignServicesIcon /> Тип дизайна
              </Typography>
              
              <FormControl component="fieldset" className="radio-group-container">
                <RadioGroup
                  row
                  value={formData.designType}
                  onChange={handleInputChange("designType")}
                >
                  <FormControlLabel
                    value="unique"
                    control={<Radio color="primary" />}
                    label="Уникальный"
                  />
                  <FormControlLabel
                    value="standart"
                    control={<Radio color="primary" />}
                    label="Стандартный"
                  />
                </RadioGroup>
              </FormControl>

              {!isStandardDesign && (
                <TextField
                  fullWidth
                  label="Номер полки"
                  value={formData.shellNum}
                  onChange={handleInputChange("shellNum")}
                  sx={{ mt: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <InventoryIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Location Section */}
          <Card className="form-section" variant="outlined">
            <CardContent>
              <Typography variant="h6" className="form-section-title">
                <LocationOnIcon /> Местоположение
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Адрес"
                    value={formData.addressShort}
                    onChange={handleInputChange("addressShort")}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOnIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Координаты (широта, долгота)"
                    placeholder="например: 41.2995, 69.2401"
                    value={formData.geoPoint}
                    onChange={handleInputChange("geoPoint")}
                    helperText="Введите координаты через запятую"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Product Section */}
          <Card className="form-section" variant="outlined">
            <CardContent>
              <Typography variant="h6" className="form-section-title">
                <LocalOfferIcon /> Продукт
              </Typography>
              
              <div className="product-inputs-grid">
                <TextField
                  select
                  fullWidth
                  label="Тип продукта"
                  value={productInputs.type}
                  onChange={(e) =>
                    setProductInputs((p) => ({ ...p, type: e.target.value }))
                  }
                >
                  {getUniqueTypes().map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Упаковка"
                  value={productInputs.packaging}
                  onChange={(e) =>
                    setProductInputs((p) => ({ ...p, packaging: e.target.value }))
                  }
                >
                  {getUniquePackaging().map((p) => (
                    <MenuItem key={p} value={p}>
                      {p}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  fullWidth
                  label="Граммаж"
                  value={productInputs.gramm}
                  onChange={(e) =>
                    setProductInputs((p) => ({ ...p, gramm: e.target.value }))
                  }
                >
                  {getUniqueGramms().map((g) => (
                    <MenuItem key={g} value={g}>
                      {g} г
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </CardContent>
          </Card>

          {/* Notification Section */}
          {!isStandardDesign && (
            <Card className="form-section" variant="outlined">
              <CardContent>
                <Typography variant="h6" className="form-section-title">
                  <NotificationsIcon /> Уведомления
                </Typography>
                
                <TextField
                  fullWidth
                  label="Уведомить при остатке (кг)"
                  type="number"
                  value={formData.notifyWhen}
                  onChange={handleInputChange("notifyWhen")}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <NotificationsIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Comment Section */}
          <Card className="form-section" variant="outlined">
            <CardContent>
              <Typography variant="h6" className="form-section-title">
                <CommentIcon /> Комментарии
              </Typography>
              
              <TextField
                fullWidth
                multiline
                minRows={3}
                placeholder="Добавьте комментарии о клиенте..."
                value={formData.comment}
                onChange={handleInputChange("comment")}
              />
            </CardContent>
          </Card>

          {/* Images Section */}
          <Card className="form-section" variant="outlined">
            <CardContent>
              <Typography variant="h6" className="form-section-title">
                <ImageIcon /> Изображения клиента
              </Typography>
              
              <div className="image-upload-container">
                <EditableImageSlot
                  label="Основное изображение"
                  imageUrl={formData.imageURL1 || DEFAULT_PLACEHOLDER_URL}
                  onImageChange={(url) =>
                    setFormData((prev) => ({ ...prev, imageURL1: url }))
                  }
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="form-actions">
            <Button variant="outlined" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : null}
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </div>
        </Box>
      </Paper>

      <Snackbar
        open={!!message.text}
        autoHideDuration={4000}
        onClose={() => setMessage({ type: "", text: "" })}
      >
        <Alert severity={message.type}>{message.text}</Alert>
      </Snackbar>
    </Box>
  );
}