import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
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
import CloseIcon from '@mui/icons-material/Close';
import { collection, getDocs, addDoc, GeoPoint } from "firebase/firestore";
import { db } from "./firebase";

export default function AddClientForm({ onClientAdded, onClose }) {
  const [products, setProducts] = useState([]);
  const [productInputs, setProductInputs] = useState({
    type: "",
    packaging: "",
    gramm: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    addressShort: "",
    geoPoint: "",
    designType: "unique", // Default to unique
    shellNum: "",
    totalKg: "",
    paperRemaining: "",
    notifyWhen: "",
    comment: ""
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

  const handleDesignTypeChange = (event) => {
    const newDesignType = event.target.value;
    setFormData(prev => ({
      ...prev,
      designType: newDesignType,
      // Clear fields that are not needed for standard design
      ...(newDesignType === "standart" && {
        shellNum: "",
        paperRemaining: "",
        notifyWhen: ""
      })
    }));
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "productTypes"));
        const productList = snapshot.docs.map(doc => ({
          id: doc.id,
          productId: doc.data().productId || doc.id, // Fallback to doc.id if productId doesn't exist
          ...doc.data()
        }));
        setProducts(productList);
        console.log("Fetched products:", productList);
      } catch (error) {
        console.error("Error fetching products:", error);
        setMessage({ type: "error", text: "Ошибка при загрузке продуктов" });
      }
    };

    fetchProducts();
  }, []);

  const validateForm = () => {
    const errors = [];

    // Basic required fields
    if (!formData.name.trim()) errors.push("Название ресторана обязательно");
    if (!formData.addressShort.trim()) errors.push("Адрес обязателен");
    if (!formData.geoPoint.trim()) errors.push("Координаты обязательны");
    if (!formData.designType) errors.push("Тип дизайна обязателен");

    // Product selection validation
    if (!productInputs.type || !productInputs.packaging || !productInputs.gramm) {
      errors.push("Заполните все поля продукта");
    }

    // Design type specific validation
    if (formData.designType === "unique") {
      if (!formData.shellNum.trim()) errors.push("Номер полки обязателен для уникального дизайна");
      if (!formData.paperRemaining || parseFloat(formData.paperRemaining) < 0) 
        errors.push("Остаток бумаги не может быть отрицательным");
      if (!formData.notifyWhen || parseFloat(formData.notifyWhen) <= 0) 
        errors.push("Уведомление при остатке должно быть больше 0");
    }

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

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setMessage({ type: "error", text: errors.join(", ") });
      return;
    }

    // Find matching product
    const matchedProduct = products.find(p => {
      const typeMatch = p.type === productInputs.type;
      const packagingMatch = p.packaging === productInputs.packaging;
      const grammMatch = Number(p.gramm) === Number(productInputs.gramm);
      
      return typeMatch && packagingMatch && grammMatch;
    });

    if (!matchedProduct) {
      setMessage({ 
        type: "error", 
        text: `Продукт не найден: ${productInputs.type}, ${productInputs.packaging}, ${productInputs.gramm}г. Проверьте данные в базе.` 
      });
      return;
    }

    setLoading(true);
    try {
      // Parse coordinates
      const [latitude, longitude] = formData.geoPoint.split(',').map(coord => parseFloat(coord.trim()));
      
      // Build client data based on design type
      const baseClientData = {
        name: formData.name.trim(),
        restaurant: formData.name.trim(), // Add restaurant field for compatibility
        addressShort: formData.addressShort.trim(),
        addressLong: new GeoPoint(latitude, longitude),
        productId: matchedProduct.productId || matchedProduct.id,
        designType: formData.designType,
        comment: formData.comment.trim()
      };

      let clientData;

      if (formData.designType === "standart") {
        // For standard design type, don't store individual paper data
        // Paper data will be fetched from productTypes -> paperInfo
        clientData = {
          ...baseClientData
          // No shellNum, paperRemaining, totalKg, paperUsed, notifyWhen
        };
      } else {
        // For unique design type, store individual paper tracking data
        const paperRemaining = parseFloat(formData.paperRemaining);
        const totalKg = paperRemaining; // Set totalKg to paperRemaining
        const paperUsed = 0; // Since totalKg equals paperRemaining, paperUsed is 0

        clientData = {
          ...baseClientData,
          shellNum: formData.shellNum.trim(),
          totalKg: totalKg,
          paperRemaining: paperRemaining,
          paperUsed: paperUsed,
          notifyWhen: parseFloat(formData.notifyWhen)
        };
      }

      console.log("Saving client data:", clientData);

      await addDoc(collection(db, "clients"), clientData);
      
      setMessage({ type: "success", text: "Клиент успешно добавлен!" });
      
      // Reset form
      setFormData({
        name: "",
        addressShort: "",
        geoPoint: "",
        designType: "unique",
        shellNum: "",
        totalKg: "",
        paperRemaining: "",
        notifyWhen: "",
        comment: ""
      });

      setProductInputs({
        type: "",
        packaging: "",
        gramm: ""
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

  // Get unique values for dropdowns from fetched products
  const getUniqueTypes = () => {
    const types = [...new Set(products.map(p => p.type))];
    return types.filter(Boolean);
  };

  const getUniquePackaging = () => {
    const packaging = [...new Set(products.map(p => p.packaging))];
    return packaging.filter(Boolean);
  };

  const getUniqueGramms = () => {
    const gramms = [...new Set(products.map(p => p.gramm))];
    return gramms.filter(Boolean).sort((a, b) => Number(a) - Number(b));
  };

  const isStandardDesign = formData.designType === "standart";

  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9999,
      overflow: 'auto',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      pt: 4,
      pb: 4
    }}>
      <Paper 
        elevation={24} 
        sx={{ 
          p: 4, 
          position: 'relative', 
          width: '90%',
          maxWidth: 900,
          minHeight: 'auto',
          fontSize: '1.15em',
          backgroundColor: 'white',
          mx: 'auto'
        }}
      >
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
            color: 'primary.dark',
            fontSize: '1.15em'
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
          <Grid container spacing={4}>
            {/* --- Design Type Selection --- */}
            <Grid item xs={12}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  backgroundColor: 'primary.50',
                  border: '2px solid',
                  borderColor: 'primary.200'
                }}
              >
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontWeight: 600, fontSize: '1.15em', mb: 2 }}>
                    Тип дизайна *
                  </FormLabel>
                  <RadioGroup
                    row
                    value={formData.designType}
                    onChange={handleDesignTypeChange}
                  >
                    <FormControlLabel 
                      value="unique" 
                      control={<Radio />} 
                      label="Уникальный (индивидуальный учет бумаги)" 
                    />
                    <FormControlLabel 
                      value="standart" 
                      control={<Radio />} 
                      label="Стандартный (общий учет по типу продукта)" 
                    />
                  </RadioGroup>
                </FormControl>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {isStandardDesign 
                    ? "Для стандартного дизайна данные о бумаге берутся из общего склада по типу продукта"
                    : "Для уникального дизайна ведется индивидуальный учет бумаги для каждого клиента"
                  }
                </Typography>
              </Paper>
            </Grid>

            {/* --- Restaurant Info Section --- */}
            <Grid item xs={12}>
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
                    mb: 3,
                    color: 'text.primary',
                    fontSize: '1.15em'
                  }}
                >
                  Информация о ресторане
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Название ресторана"
                      variant="outlined"
                      value={formData.name}
                      onChange={handleInputChange('name')}
                      required
                      size="small"
                      sx={{ fontSize: '1.15em' }}
                    />
                  </Grid>

                  {/* Show shellNum only for unique design */}
                  {!isStandardDesign && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Номер полки"
                        variant="outlined"
                        value={formData.shellNum}
                        onChange={handleInputChange('shellNum')}
                        required
                        size="small"
                        sx={{ fontSize: '1.15em' }}
                      />
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Адрес"
                      variant="outlined"
                      value={formData.addressShort}
                      onChange={handleInputChange('addressShort')}
                      required
                      size="small"
                      sx={{ fontSize: '1.15em' }}
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
                      placeholder="41.2995, 69.2401"
                      sx={{ fontSize: '1.15em' }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* --- Paper Info Section (Only for Unique Design) --- */}
            {!isStandardDesign && (
              <Grid item xs={12}>
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
                      mb: 3,
                      color: 'text.primary',
                      fontSize: '1.15em'
                    }}
                  >
                    Информация о бумаге (Индивидуальный учет)
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
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
                          min: '0'
                        }}
                        placeholder="55"
                        sx={{ fontSize: '1.15em' }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
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
                        sx={{ fontSize: '1.15em' }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* --- Product Section --- */}
            <Grid item xs={12}>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  backgroundColor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3, fontSize: '1.15em' }}>
                  Продукт
                </Typography>

                <Grid container spacing={3}>
                  {/* Тип продукта */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      label="Тип продукта"
                      value={productInputs.type}
                      onChange={(e) =>
                        setProductInputs((prev) => ({ ...prev, type: e.target.value }))
                      }
                      required
                      size="small"
                      sx={{ fontSize: '1.15em' }}
                    >
                      <MenuItem value="">-- Выберите --</MenuItem>
                      {getUniqueTypes().map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Тип упаковки */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      label="Тип упаковки"
                      value={productInputs.packaging}
                      onChange={(e) =>
                        setProductInputs((prev) => ({ ...prev, packaging: e.target.value }))
                      }
                      required
                      size="small"
                      sx={{ fontSize: '1.15em' }}
                    >
                      <MenuItem value="">-- Выберите --</MenuItem>
                      {getUniquePackaging().map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  {/* Грамм */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      label="Грамм"
                      value={productInputs.gramm}
                      onChange={(e) =>
                        setProductInputs((prev) => ({ ...prev, gramm: e.target.value }))
                      }
                      required
                      size="small"
                      sx={{ fontSize: '1.15em' }}
                    >
                      <MenuItem value="">-- Выберите --</MenuItem>
                      {getUniqueGramms().map((gram) => (
                        <MenuItem key={gram} value={gram}>
                          {gram} г
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>

                {/* Comment Field */}
                <Grid container sx={{ mt: 2 }}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Комментарий"
                      variant="outlined"
                      multiline
                      minRows={4}
                      value={formData.comment}
                      onChange={handleInputChange('comment')}
                      size="small"
                      placeholder="Дополнительная информация, например, особенности доставки или учета"
                      sx={{ fontSize: '1.15em' }}
                    />
                  </Grid>
                </Grid>

                {/* Action Buttons */}
                <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                  <Button 
                    variant="outlined" 
                    onClick={onClose} 
                    disabled={loading} 
                    size="medium"
                    sx={{ fontSize: '1.15em' }}
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    size="medium" 
                    disabled={loading}
                    sx={{ fontSize: '1.15em' }}
                  >
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
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
}