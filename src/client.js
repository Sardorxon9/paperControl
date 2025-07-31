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
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Divider
} from "@mui/material";

export default function AddClientForm({ onClientAdded }) {
  const [formData, setFormData] = useState({
    name: "",
    addressShort: "",
    geoLocation: "", // Combined input for latitude and longitude
    productType: "",
    shellNum: "",
    totalKg: "",
    paperRemaining: "",
    notifyWhen: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const productTypes = [
    { value: "stick", label: "Stick" },
    { value: "box", label: "Box" },
    { value: "bag", label: "Bag" },
    { value: "roll", label: "Roll" },
    { value: "sheet", label: "Sheet" }
  ];

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    // Clear message when user starts typing
    if (message.text) {
      setMessage({ type: "", text: "" });
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.name.trim()) errors.push("Название ресторана обязательно");
    if (!formData.addressShort.trim()) errors.push("Адрес обязателен");
    if (!formData.geoLocation.trim()) errors.push("Гео-Локация обязательна");
    if (!formData.productType) errors.push("Тип продукции обязателен");
    if (!formData.shellNum.trim()) errors.push("Номер полки обязателен");
    if (!formData.totalKg || parseFloat(formData.totalKg) <= 0) errors.push("Общий вес должен быть больше 0");
    if (!formData.paperRemaining || parseFloat(formData.paperRemaining) < 0) errors.push("Остаток бумаги не может быть отрицательным");
    if (!formData.notifyWhen || parseFloat(formData.notifyWhen) <= 0) errors.push("Уведомление при остатке должно быть больше 0");

    // Check if paperRemaining doesn't exceed totalKg
    if (formData.totalKg && formData.paperRemaining) {
      if (parseFloat(formData.paperRemaining) > parseFloat(formData.totalKg)) {
        errors.push("Остаток бумаги не может превышать общий вес");
      }
    }

    // Validate and parse geoLocation
    const geoParts = formData.geoLocation.split(',').map(part => parseFloat(part.trim()));
    if (geoParts.length !== 2 || isNaN(geoParts[0]) || isNaN(geoParts[1])) {
      errors.push("Гео-Локация должна быть в формате 'широта, долгота' (например, '41.31409, 69.281165')");
    } else {
      const [lat, lng] = geoParts;
      if (lat < -90 || lat > 90) errors.push("Широта должна быть между -90 и 90");
      if (lng < -180 || lng > 180) errors.push("Долгота должна быть между -180 и 180");
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
      const totalKg = parseFloat(formData.totalKg);
      const paperRemaining = parseFloat(formData.paperRemaining);
      const paperUsed = totalKg - paperRemaining;

      const [latitude, longitude] = formData.geoLocation.split(',').map(part => parseFloat(part.trim()));

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
      
      // Reset form (optional, could just close the modal)
      setFormData({
        name: "",
        addressShort: "",
        geoLocation: "",
        productType: "",
        shellNum: "",
        totalKg: "",
        paperRemaining: "",
        notifyWhen: ""
      });

      // Call the callback function to refresh parent component and/or close modal
      if (onClientAdded) {
        setTimeout(() => {
          onClientAdded(); // This function should also close the modal
        }, 1000); // Small delay to show success message
      }

    } catch (error) {
      console.error("Error adding client:", error);
      setMessage({ type: "error", text: "Ошибка при добавлении клиента. Попробуйте еще раз." });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (onClientAdded) { // Assuming onClientAdded also handles closing
      onClientAdded();
    }
  };

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3, textAlign: 'center', color: 'primary.main' }}>
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
            {/* Restaurant Information */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom>
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
                placeholder="Например: улица Истиклол, 6, Ташкент"
              />
            </Grid>

            {/* Combined Geo-Location Input */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Гео-Локация"
                variant="outlined"
                value={formData.geoLocation}
                onChange={handleInputChange('geoLocation')}
                required
                placeholder="Например: 41.31409, 69.281165 (широта, долгота)"
                helperText="Введите широту и долготу, разделенные запятой."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Тип продукции"
                variant="outlined"
                value={formData.productType}
                onChange={handleInputChange('productType')}
                required
              >
                {productTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Paper Information */}
            <Grid item xs={12}>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mt: 2 }}>
                Информация о бумаге
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Общий вес бумаги (кг)"
                variant="outlined"
                type="number"
                value={formData.totalKg}
                onChange={handleInputChange('totalKg')}
                required
                inputProps={{ step: "0.01", min: "0" }}
                placeholder="Например: 95"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Остаток бумаги (кг)"
                variant="outlined"
                type="number"
                value={formData.paperRemaining}
                onChange={handleInputChange('paperRemaining')}
                required
                inputProps={{ 
                  step: "0.01", 
                  min: "0",
                  max: formData.totalKg || undefined
                }}
                placeholder="Например: 55"
                helperText={formData.totalKg && formData.paperRemaining ? 
                  `Использовано: ${(parseFloat(formData.totalKg) - parseFloat(formData.paperRemaining)).toFixed(2)} кг` : 
                  ""
                }
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Уведомить при остатке (кг)"
                variant="outlined"
                type="number"
                value={formData.notifyWhen}
                onChange={handleInputChange('notifyWhen')}
                required
                inputProps={{ step: "0.01", min: "0" }}
                placeholder="Например: 4"
                helperText="Когда остаток достигнет этого значения, будет уведомление"
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ 
                    minWidth: 150,
                    fontSize: '1.1rem',
                    py: 1.5
                  }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Добавление...
                    </>
                  ) : (
                    "Добавить клиента"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  onClick={handleClose}
                  disabled={loading}
                  sx={{ 
                    minWidth: 120,
                    fontSize: '1.1rem',
                    py: 1.5
                  }}
                >
                  Закрыть
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}