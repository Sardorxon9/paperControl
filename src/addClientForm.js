import { useState } from "react";
import { collection, addDoc, GeoPoint } from "firebase/firestore";
import { db } from "./firebase";
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  Grid,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  FormControl
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

export default function AddClientForm({ onClientAdded, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    addressShort: "",
    geoPoint: "",
    productType: "stick",
    shellNum: "",
    totalKg: "",
    paperRemaining: "",
    notifyWhen: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    
    if (message.text) {
      setMessage({ type: "", text: "" });
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) errors.push("Название ресторана обязательно");
    if (!formData.addressShort.trim()) errors.push("Адрес обязателен");
    if (!formData.geoPoint.trim()) errors.push("Координаты обязательны");
    if (!formData.productType) errors.push("Тип продукции обязателен");
    if (!formData.shellNum.trim()) errors.push("Номер полки обязателен");
    
    if (!formData.totalKg || parseFloat(formData.totalKg) <= 0) 
      errors.push("Общий вес должен быть больше 0");
    
    if (!formData.paperRemaining || parseFloat(formData.paperRemaining) < 0) 
      errors.push("Остаток бумаги не может быть отрицательным");
    
    if (!formData.notifyWhen || parseFloat(formData.notifyWhen) <= 0) 
      errors.push("Уведомление при остатке должно быть больше 0");

    // Validate coordinates format
    if (formData.geoPoint) {
      const parts = formData.geoPoint.split(',').map(p => p.trim());
      if (parts.length !== 2) {
        errors.push("Координаты должны быть в формате: широта, долгота");
      } else {
        const [lat, lng] = parts;
        if (isNaN(lat) || lat < -90 || lat > 90) 
          errors.push("Широта должна быть между -90 и 90");
        if (isNaN(lng) || lng < -180 || lng > 180) 
          errors.push("Долгота должна быть между -180 и 180");
      }
    }

    // Validate paper quantities
    if (formData.totalKg && formData.paperRemaining) {
      const total = parseFloat(formData.totalKg);
      const remaining = parseFloat(formData.paperRemaining);
      
      if (remaining > total) {
        errors.push("Остаток бумаги не может превышать общий вес");
      }
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setMessage({ type: "error", text: errors.join(", ") });
      return;
    }

    setLoading(true);
    try {
      // Parse coordinates
      const [latitude, longitude] = formData.geoPoint.split(',').map(coord => parseFloat(coord.trim()));
      
      const totalKg = parseFloat(formData.totalKg);
      const paperRemaining = parseFloat(formData.paperRemaining);
      const paperUsed = totalKg - paperRemaining;

      const clientData = {
        name: formData.name.trim(),
        addressShort: formData.addressShort.trim(),
        addressLong: new GeoPoint(latitude, longitude),
        productType: formData.productType,
        shellNum: formData.shellNum.trim(),
        totalKg: totalKg,
        paperRemaining: paperRemaining,
        paperUsed: paperUsed,
        notifyWhen: parseFloat(formData.notifyWhen)
      };

      await addDoc(collection(db, "clients"), clientData);
      
      setMessage({ type: "success", text: "Клиент успешно добавлен!" });
      
      // Reset form
      setFormData({
        name: "",
        addressShort: "",
        geoPoint: "",
        productType: "stick",
        shellNum: "",
        totalKg: "",
        paperRemaining: "",
        notifyWhen: ""
      });

      if (onClientAdded) {
        setTimeout(() => {
          onClientAdded();
        }, 1000);
      }

    } catch (error) {
      console.error("Error adding client:", error);
      setMessage({ type: "error", text: "Ошибка при добавлении клиента. Попробуйте еще раз." });
    } finally {
      setLoading(false);
    }
  };

return (
  <Paper elevation={3} sx={{ p: 4, position: 'relative', maxWidth: 'md', mx: 'auto', my: 4 }}>
    {/* Close Button */}
    <IconButton
      onClick={onClose}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        color: 'text.secondary'
      }}
    >
      <CloseIcon />
    </IconButton>

    {/* Title */}
    <Typography
      variant="h5"
      gutterBottom
      sx={{
        mb: 3,
        textAlign: 'center',
        fontWeight: 600,
        color: 'primary.dark'
      }}
    >
      Добавить нового клиента
    </Typography>

    <Divider sx={{ mb: 3 }} />

    {message.text && (
      <Alert severity={message.type} sx={{ mb: 3 }}>
        {message.text}
      </Alert>
    )}

    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={3}>
        {/* --- Restaurant Info --- */}
        <Grid item xs={12}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              mb: 1,
              color: 'text.primary',
              borderBottom: '1px solid',
              borderColor: 'divider',
              pb: 1
            }}
          >
            Информация о ресторане
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Название ресторана"
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange('name')}
            required
            size="small"
            placeholder="Например: BBQ"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Номер полки"
            variant="outlined"
            value={formData.shellNum}
            onChange={handleInputChange('shellNum')}
            required
            size="small"
            placeholder="Например: A-5"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Адрес"
            variant="outlined"
            value={formData.addressShort}
            onChange={handleInputChange('addressShort')}
            required
            size="small"
            placeholder="Например: улица Истиклол, 6, Ташкент"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Координаты (широта, долгота)"
            variant="outlined"
            value={formData.geoPoint}
            onChange={handleInputChange('geoPoint')}
            required
            size="small"
            placeholder="Например: 41.31409, 69.281165"
            helperText="Введите координаты через запятую"
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
              Тип продукции
            </FormLabel>
            <RadioGroup
              row
              value={formData.productType}
              onChange={handleInputChange('productType')}
            >
              <FormControlLabel value="stick" control={<Radio size="small" />} label="Stick" />
              <FormControlLabel value="sachet" control={<Radio size="small" />} label="Sachet" />
            </RadioGroup>
          </FormControl>
        </Grid>

        {/* --- Paper Info --- */}
        <Grid item xs={12}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              mb: 1,
              color: 'text.primary',
              borderBottom: '1px solid',
              borderColor: 'divider',
              pb: 1
            }}
          >
            Информация о бумаге
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Остаток (кг)"
            variant="outlined"
            type="number"
            value={formData.paperRemaining}
            onChange={handleInputChange('paperRemaining')}
            required
            size="small"
            inputProps={{
              step: '0.01',
              min: '0',
              max: formData.totalKg || undefined
            }}
            placeholder="55"
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Уведомить при (кг)"
            variant="outlined"
            type="number"
            value={formData.notifyWhen}
            onChange={handleInputChange('notifyWhen')}
            required
            size="small"
            inputProps={{ step: '0.01', min: '0' }}
            placeholder="4"
            helperText="Минимальный остаток для уведомления"
          />
        </Grid>

        {/* --- Actions --- */}
        <Grid item xs={12}>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="outlined" onClick={onClose} disabled={loading} size="medium">
              Отмена
            </Button>
            <Button type="submit" variant="contained" size="medium" disabled={loading}>
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Сохранение...
                </>
              ) : (
                'Сохранить'
              )}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  </Paper>
);

}