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
  Card,
  CardContent,
  CardMedia
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { 
  collection, 
  getDocs, 
  addDoc, 
  GeoPoint, 
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { checkAndNotifyLowPaper } from './notificationService';
import ImageUploadComponent from "./components/ImageUploadComponent";


export default function AddClientForm({ onClientAdded, onClose, currentUser }) {
  const [products, setProducts] = useState([]);
  const [productInputs, setProductInputs] = useState({
    type: "",
    packaging: "",
    gramm: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    orgName: "",
    addressShort: "",
    geoPoint: "",
    designType: "unique", // Default to unique
    shellNum: "",
    notifyWhen: "",
    comment: "",
    imageURLs: [] // Store the uploaded URLs here
  });

  // State for multiple paper rolls
  const [paperRolls, setPaperRolls] = useState([
    { id: 1, paperRemaining: "" }
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  // Snackbar for notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

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
        notifyWhen: ""
      })
    }));

    // Reset paper rolls when switching design types
    if (newDesignType === "standart") {
      setPaperRolls([]);
    } else {
      setPaperRolls([{ id: 1, paperRemaining: "" }]);
    }
  };

  // Handle paper roll changes
  const handlePaperRollChange = (rollId, value) => {
    setPaperRolls(prev => 
      prev.map(roll => 
        roll.id === rollId 
          ? { ...roll, paperRemaining: value }
          : roll
      )
    );
  };

  // Add new paper roll
  const handleAddPaperRoll = () => {
    const newId = Math.max(...paperRolls.map(r => r.id), 0) + 1;
    setPaperRolls(prev => [...prev, { id: newId, paperRemaining: "" }]);
  };

  // Remove paper roll
  const handleRemovePaperRoll = (rollId) => {
    if (paperRolls.length > 1) {
      setPaperRolls(prev => prev.filter(roll => roll.id !== rollId));
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "productTypes"));
        const productList = snapshot.docs.map(doc => ({
          id: doc.id,
          productId: doc.data().productId || doc.id,
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

    // Image validation (now using formData.imageURLs)
   if (!formData.imageURLs || formData.imageURLs.length > 1) {
  errors.push("Можно загрузить максимум 1 изображение");
}

    // Product selection validation
    if (!productInputs.type || !productInputs.packaging || !productInputs.gramm) {
      errors.push("Заполните все поля продукта");
    }

    // Design type specific validation
    if (formData.designType === "unique") {
      if (!formData.shellNum.trim()) errors.push("Номер полки обязателен для уникального дизайна");
      if (!formData.notifyWhen || parseFloat(formData.notifyWhen) <= 0) 
        errors.push("Уведомление при остатке должно быть больше 0");

      // Validate paper rolls
      if (paperRolls.length === 0) {
        errors.push("Добавьте хотя бы один рулон бумаги");
      } else {
        const invalidRolls = paperRolls.filter(roll => 
          !roll.paperRemaining || parseFloat(roll.paperRemaining) < 0
        );
        if (invalidRolls.length > 0) {
          errors.push("Все рулоны должны иметь корректное количество бумаги");
        }
      }
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

  // Function to create log entries for initial paper rolls with correct rollIDs
  const createInitialPaperLogs = async (clientId, createdRolls, userId) => {
    try {
      console.log("Creating logs for rolls:", createdRolls);
      const logsRef = collection(db, `clients/${clientId}/logs`);
      
      // Create log entries for each created paper roll with their actual rollIDs
      const logPromises = createdRolls.map(async (rollData, index) => {
        const amount = rollData.paperRemaining;
        const logEntry = {
          date: Timestamp.now(),
          userID: userId || 'unknown',
          actionType: 'paperIn',
          amount: amount,
          details: `Initial paper added - Roll ${index + 1}: ${amount}kg`,
          rollId: rollData.rollId || 'MISSING'
        };

        console.log("📝 Creating log entry:", logEntry);
        return addDoc(logsRef, logEntry);
      });

      const logResults = await Promise.all(logPromises);
      console.log(`Successfully created ${logResults.length} initial log entries with rollIDs for client ${clientId}`);
      
    } catch (error) {
      console.error('Error creating initial paper logs:', error);
      throw error;
    }
  };

  // Function to check and notify low paper for new client
  const checkInitialLowPaperNotification = async (clientData, totalPaper) => {
    try {
      const thresholdValue = parseFloat(clientData.notifyWhen) || 3;
      
      if (totalPaper <= thresholdValue) {
        const notificationResult = await checkAndNotifyLowPaper(
          clientData,
          totalPaper,
          thresholdValue,
          db
        );

        if (notificationResult.notificationSent) {
          setSnackbar({
            open: true,
            message: `Клиент создан! Уведомление отправлено ${notificationResult.successfulNotifications} администраторам о низком уровне бумаги!`,
            severity: 'warning'
          });
        }
      }
    } catch (error) {
      console.error('Error checking initial low paper notification:', error);
      // Don't throw error as this is not critical for client creation
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setMessage({ type: "error", text: errors.join(", ") });
      return;
    }

    // Enhanced product matching with debugging
    console.log("Looking for product with:", {
      type: productInputs.type,
      packaging: productInputs.packaging,
      gramm: productInputs.gramm,
      grammAsNumber: Number(productInputs.gramm)
    });

    const matchedProduct = products.find(p => {
      const typeMatch = p.type === productInputs.type;
      const packagingMatch = p.packaging === productInputs.packaging;
      
      // More robust gramm comparison
      let grammMatch = false;
      const inputGramm = productInputs.gramm;
      const productGramm = p.gramm;
      
      if (String(productGramm) === String(inputGramm)) {
        grammMatch = true;
      } else if (Number(productGramm) === Number(inputGramm)) {
        grammMatch = true;
      } else if (parseFloat(productGramm) === parseFloat(inputGramm)) {
        grammMatch = true;
      }
      
      return typeMatch && packagingMatch && grammMatch;
    });

    if (!matchedProduct) {
      setMessage({ 
        type: "error", 
        text: `Продукт не найден: ${productInputs.type}, ${productInputs.packaging}, ${productInputs.gramm}г. 
               Доступные продукты: ${products.map(p => `${p.type}-${p.packaging}-${p.gramm}г`).join(', ')}` 
      });
      return;
    }

    console.log("Found matching product:", matchedProduct);

    setLoading(true);
    try {
      // Parse coordinates
      const [latitude, longitude] = formData.geoPoint.split(',').map(coord => parseFloat(coord.trim()));
      
      const imageURL1 = formData.imageURLs[0] 
  || "https://ik.imagekit.io/php1jcf0t/default_placeholder.jpg?updatedAt=1755710788958";
      
      
      // Build client data based on design type
      const baseClientData = {
        name: formData.name.trim(),
        orgName: formData.orgName.trim(),
        restaurant: formData.name.trim(), // Add restaurant field for compatibility
        addressShort: formData.addressShort.trim(),
        addressLong: new GeoPoint(latitude, longitude),
        productId: matchedProduct.productId || matchedProduct.id,
        designType: formData.designType,
        comment: formData.comment.trim(),
        imageURL1: imageURL1,
       
      };

      let clientData;

      if (formData.designType === "standart") {
        // For standard design type, don't store individual paper data
        clientData = {
          ...baseClientData
        };
      } else {
        // For unique design type, calculate totals from all rolls
        const totalAvailable = paperRolls.reduce((sum, roll) => 
          sum + parseFloat(roll.paperRemaining || 0), 0
        );

        clientData = {
          ...baseClientData,
          shellNum: formData.shellNum.trim(),
          totalKg: totalAvailable, // Sum of all paper added initially
          paperRemaining: totalAvailable, // Sum of paperRemaining of all rolls
          notifyWhen: parseFloat(formData.notifyWhen)
        };
      }

      console.log("Saving client data:", clientData);

      // Add the main client document
      const clientDocRef = await addDoc(collection(db, "clients"), clientData);
      const clientId = clientDocRef.id;

      // If unique design, create paper rolls subcollection and logs
      if (formData.designType === "unique") {
        // Step 1: Create paper rolls subcollection and collect their IDs
        console.log("Creating paper rolls...");
        const paperRollsPromises = paperRolls.map(async (roll, index) => {
          console.log(`Creating roll ${index + 1} with ${roll.paperRemaining}kg`);
          const rollRef = await addDoc(collection(db, `clients/${clientId}/paperRolls`), {
            dateCreated: Timestamp.now(),
            paperRemaining: parseFloat(roll.paperRemaining)
          });
          console.log(`Created roll ${index + 1} with ID: ${rollRef.id}`);
          return rollRef;
        });

        const createdRollRefs = await Promise.all(paperRollsPromises);
        
        // Step 2: Build array with roll data including their actual IDs
        const createdRollsData = createdRollRefs.map((rollRef, index) => {
          const rollId = rollRef.id;
          const rollData = {
            rollId: rollId, // Firestore doc ID
            paperRemaining: parseFloat(paperRolls[index].paperRemaining),
            dateCreated: Timestamp.now()
          };
          console.log(`✅ Roll ${index + 1} created with rollId=${rollId}`, rollData);
          return rollData;
        });

        console.log(`Created ${createdRollsData.length} paper rolls for client ${clientId}`);

        // Step 3: Create initial log entries with correct rollIDs
        console.log("Creating log entries with rollIDs...");
        await createInitialPaperLogs(
          clientId, 
          createdRollsData, // Pass the rolls with their actual IDs
          currentUser?.uid
        );

        // Step 4: Check for low paper notification
        const totalPaper = clientData.paperRemaining;
        await checkInitialLowPaperNotification(clientData, totalPaper);
      }
      
      setMessage({ type: "success", text: "Клиент успешно добавлен!" });
      
      // Reset form
      setFormData({
        name: "",
        orgName: "",    
        addressShort: "",
        geoPoint: "",
        designType: "unique",
        shellNum: "",
        notifyWhen: "",
        comment: "",
       imageURLs: []
      });

      setProductInputs({
        type: "",
        packaging: "",
        gramm: ""
      });

      setPaperRolls([{ id: 1, paperRemaining: "" }]);

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
    <>
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
                        label="Дизайн с лого" 
                      />
                      <FormControlLabel 
                        value="standart" 
                        control={<Radio />} 
                        label="Стандарт дизайн" 
                      />
                    </RadioGroup>
                  </FormControl>
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

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Наименование организации (Фирма)"
                        variant="outlined"
                        value={formData.orgName}
                        onChange={handleInputChange('orgName')}
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
                        size="small"
                        sx={{ fontSize: '1.15em' }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Локация ( координаты )"
                        variant="outlined"
                        value={formData.geoPoint}
                        onChange={handleInputChange('geoPoint')}
                        required
                        size="small"
                        placeholder="41.2995, 69.2401"
                        sx={{ fontSize: '1.15em' }}
                      />
                    </Grid>

                    {/* Show notifyWhen only for unique design */}
                    {!isStandardDesign && (
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
                    )}
                  </Grid>
                </Paper>
              </Grid>

              {/* --- Paper Rolls Section (Only for Unique Design) --- */}
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
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          fontSize: '1.15em'
                        }}
                      >
                        Рулоны бумаги
                      </Typography>
                      <IconButton
                        onClick={handleAddPaperRoll}
                        color="primary"
                        sx={{
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' }
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>

                    <Grid container spacing={2}>
                      {paperRolls.map((roll, index) => (
                        <Grid item xs={12} sm={6} key={roll.id}>
                          <Card variant="outlined" sx={{ position: 'relative' }}>
                            {paperRolls.length > 1 && (
                              <IconButton
                                onClick={() => handleRemovePaperRoll(roll.id)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  color: 'error.main',
                                  zIndex: 1
                                }}
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                            <CardContent sx={{ p: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Рулон {index + 1}
                              </Typography>
                              <TextField
                                fullWidth
                                label="Остаток (кг)"
                                variant="outlined"
                                type="number"
                                value={roll.paperRemaining}
                                onChange={(e) => handlePaperRollChange(roll.id, e.target.value)}
                                required
                                size="small"
                                inputProps={{
                                  step: '0.01',
                                  min: '0'
                                }}
                                placeholder="55.00"
                                sx={{ fontSize: '1.15em' }}
                              />
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              )}

              {/* --- Image Upload Section --- */}
              <Grid item xs={12}>
                <ImageUploadComponent
                  onImagesChange={(urls) => setFormData(prev => ({ ...prev, imageURLs: urls }))}
                  disabled={loading}
                />
              </Grid>

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
                        label="Тип упаковки"
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

                    {/* Продукт */}
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        fullWidth
                        label="Продукт"
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
                        label="Граммаж"
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
                        label="Комментарии"
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}