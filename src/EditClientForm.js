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
  Radio
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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
    comment: ""
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
        // Load productTypes
        const prodSnap = await getDocs(collection(db, "productTypes"));
        const productList = prodSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productList);

        // Load client
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
            comment: data.comment || ""
          });

          // Pre-fill product fields
          const matchedProduct = productList.find(
            p => p.productId === data.productId
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
  const handleInputChange = field => e =>
    setFormData(prev => ({ ...prev, [field]: e.target.value }));

  // Update client
  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);

    try {
      const clientRef = doc(db, "clients", clientId);

      const [lat, lng] = formData.geoPoint
        .split(",")
        .map(coord => parseFloat(coord.trim()));

      const updateData = {
        name: formData.name,
        orgName: formData.orgName,
        addressShort: formData.addressShort,
        addressLong: new GeoPoint(lat, lng),
        designType: formData.designType,
        shellNum: formData.shellNum,
        notifyWhen: parseFloat(formData.notifyWhen),
        comment: formData.comment,
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

  // Helpers for dropdowns
  const getUniqueTypes = () =>
    [...new Set(products.map(p => p.type))].filter(Boolean);
  const getUniquePackaging = () =>
    [...new Set(products.map(p => p.packaging))].filter(Boolean);
  const getUniqueGramms = () =>
    [...new Set(products.map(p => p.gramm))].filter(Boolean);

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        pt: 4,
        pb: 4
      }}
    >
      <Paper
        elevation={24}
        sx={{ p: 4, position: "relative", width: "90%", maxWidth: 900 }}
      >
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", top: 16, right: 16 }}
        >
          <CloseIcon />
        </IconButton>

        <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
          Редактировать клиента
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {message.text && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Restaurant Info */}
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

            {/* Design Type Radio Buttons */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Тип дизайна</FormLabel>
                <RadioGroup
                  row
                  value={formData.designType}
                  onChange={handleInputChange("designType")}
                >
                  <FormControlLabel 
                    value="unique" 
                    control={<Radio />} 
                    label="Уникальный" 
                  />
                  <FormControlLabel 
                    value="standart" 
                    control={<Radio />} 
                    label="Стандартный" 
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {!isStandardDesign && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Номер полки"
                  value={formData.shellNum}
                  onChange={handleInputChange("shellNum")}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Адрес"
                value={formData.addressShort}
                onChange={handleInputChange("addressShort")}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Локация (координаты)"
                placeholder="например: 41.2995, 69.2401"
                value={formData.geoPoint}
                onChange={handleInputChange("geoPoint")}
              />
            </Grid>

            {!isStandardDesign && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Уведомить при (кг)"
                  type="number"
                  value={formData.notifyWhen}
                  onChange={handleInputChange("notifyWhen")}
                />
              </Grid>
            )}

            {/* Product */}
            <Grid item xs={12}>
              <Typography sx={{ mb: 2 }}>Продукт</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    label="Тип"
                    value={productInputs.type}
                    onChange={e =>
                      setProductInputs(p => ({ ...p, type: e.target.value }))
                    }
                  >
                    {getUniqueTypes().map(t => (
                      <MenuItem key={t} value={t}>
                        {t}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    label="Упаковка"
                    value={productInputs.packaging}
                    onChange={e =>
                      setProductInputs(p => ({ ...p, packaging: e.target.value }))
                    }
                  >
                    {getUniquePackaging().map(p => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    label="Граммаж"
                    value={productInputs.gramm}
                    onChange={e =>
                      setProductInputs(p => ({ ...p, gramm: e.target.value }))
                    }
                  >
                    {getUniqueGramms().map(g => (
                      <MenuItem key={g} value={g}>
                        {g} г
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Grid>

            {/* Comment */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Комментарии"
                value={formData.comment}
                onChange={handleInputChange("comment")}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={20} /> : "Сохранить"}
            </Button>
          </Stack>
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