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
    
    // f (!formData.totalKg || parseFloat(formData.totalKg) <= 0) 
      // errors.push("Общий вес должен быть больше 0");
    
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
      console.log(111, formData.totalKg, formData.paperRemaining)

    formData.totalKg = parseFloat(formData.paperRemaining);

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
  <Paper
    elevation={0} /* let the Modal handle shadow & positioning */
    sx={{
      width: 900,               /* fixed width for the form itself */
      maxWidth: '90vw',
      maxHeight: '90vh',
      overflowY: 'auto',
      p: { xs: 3, md: 5 },
      borderRadius: 2,
      backgroundColor: 'background.paper'
    }}
  >
    {/* Close button */}
    <IconButton
      onClick={onClose}
      sx={{ position: 'absolute', top: 16, right: 16 }}
    >
      <CloseIcon />
    </IconButton>

    <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
      Добавить нового клиента
    </Typography>

    <Divider sx={{ mb: 3 }} />

    {message.text && (
      <Alert severity={message.type} sx={{ mb: 3 }}>
        {message.text}
      </Alert>
    )}

    <Box component="form" onSubmit={handleSubmit}>
      {/* RESTAURANT SECTION */}
      <Typography variant="h6" gutterBottom color="primary" fontWeight="600">
        Информация о ресторане
      </Typography>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Название ресторана"
            value={formData.name}
            onChange={handleInputChange('name')}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Номер полки"
            value={formData.shellNum}
            onChange={handleInputChange('shellNum')}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Адрес"
            value={formData.addressShort}
            onChange={handleInputChange('addressShort')}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Координаты (широта, долгота)"
            value={formData.geoPoint}
            onChange={handleInputChange('geoPoint')}
            required
            helperText="Пример: 41.31409, 69.281165"
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ mb: 1 }}>
              Тип продукции
            </FormLabel>
            <RadioGroup
              row
              value={formData.productType}
              onChange={handleInputChange('productType')}
            >
              <FormControlLabel value="stick" control={<Radio />} label="Stick" />
              <FormControlLabel value="sachet" control={<Radio />} label="Sachet" />
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* PAPER SECTION */}
      <Typography variant="h6" gutterBottom color="primary" fontWeight="600">
        Информация о бумаге
      </Typography>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Остаток (кг)"
            value={formData.paperRemaining}
            onChange={handleInputChange('paperRemaining')}
            required
            inputProps={{ step: '0.01', min: 0 }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            label="Уведомить при (кг)"
            value={formData.notifyWhen}
            onChange={handleInputChange('notifyWhen')}
            required
            inputProps={{ step: '0.01', min: 0 }}
            helperText="Минимальный остаток для уведомления"
          />
        </Grid>
      </Grid>

      {/* ACTIONS */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button type="submit" variant="contained" disabled={loading}>
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
    </Box>
  </Paper>
);

}