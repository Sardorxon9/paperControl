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
  CardContent
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { 
  collection, 
  getDocs, 
  addDoc, 
  GeoPoint, 
  Timestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { checkAndNotifyLowPaper } from './notificationService';

export default function AddClientForm({ onClientAdded, onClose, currentUser }) {
  // Package Types for both design types
  const [packageTypes, setPackageTypes] = useState([]);
  
  // For Custom Unique Design
  const [products, setProducts] = useState([]); // from products collection
  const [possibleProducts, setPossibleProducts] = useState([]); // for selected package
  
  // For Standard Label Design
  const [productTypesData, setProductTypesData] = useState([]); // from productTypes collection
  const [availableProducts, setAvailableProducts] = useState([]); // filtered by package
  const [availableGrams, setAvailableGrams] = useState([]); // filtered by package+product
  const [availableNames, setAvailableNames] = useState([]); // for multiple matches
  
  const [productInputs, setProductInputs] = useState({
    packageType: "",
    product: "",
    gram: "",
    name: "" // Only for standard design when multiple matches exist
  });

  const [formData, setFormData] = useState({
    name: "",
    orgName: "",
    addressShort: "",
    geoPoint: "",
    designType: "unique", // Default to unique
    shellNum: "",
    notifyWhen: "",
    comment: ""
  });

  // State for multiple branches
  const [branches, setBranches] = useState([]);

  // State for multiple paper rolls (only for unique design)
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

  // Load initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch package types
        const packageTypesSnapshot = await getDocs(collection(db, "packageTypes"));
        const packageTypesList = packageTypesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPackageTypes(packageTypesList);

        // Fetch products collection (for unique design)
        const productsSnapshot = await getDocs(collection(db, "products"));
        const productsList = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsList);

        // Fetch productTypes collection (for standard design)
        const productTypesSnapshot = await getDocs(collection(db, "productTypes"));
        const productTypesList = productTypesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProductTypesData(productTypesList);

        console.log("Fetched data:", { packageTypesList, productsList, productTypesList });
      } catch (error) {
        console.error("Error fetching initial data:", error);
        setMessage({ type: "error", text: "Ошибка при загрузке данных" });
      }
    };

    fetchInitialData();
  }, []);

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

    // Reset product inputs when switching design types
    setProductInputs({
      packageType: "",
      product: "",
      gram: "",
      name: ""
    });

    // Reset paper rolls when switching design types
    if (newDesignType === "standart") {
      setPaperRolls([]);
    } else {
      setPaperRolls([{ id: 1, paperRemaining: "" }]);
    }

    // Clear dependent dropdowns
    setPossibleProducts([]);
    setAvailableProducts([]);
    setAvailableGrams([]);
    setAvailableNames([]);
  };

  // Handle product input changes based on design type
  const handleProductInputChange = async (field, value) => {
    setProductInputs(prev => ({ ...prev, [field]: value }));

    if (formData.designType === "unique") {
      await handleUniqueDesignChange(field, value);
    } else {
      await handleStandardDesignChange(field, value);
    }
  };

  // Handle changes for Custom Unique Design
  const handleUniqueDesignChange = async (field, value) => {
    if (field === 'packageType') {
      // Fetch possible products for selected package type
      try {
        const possibleProductsSnapshot = await getDocs(
          collection(db, `packageTypes/${value}/possibleProducts`)
        );
        
        const possibleProductIds = possibleProductsSnapshot.docs.map(doc => doc.data().productID);
        
        // Get product details from products collection
        const productsWithNames = await Promise.all(
          possibleProductIds.map(async (productID) => {
            const productDoc = await getDoc(doc(db, "products", productID));
            if (productDoc.exists()) {
              return {
                id: productID,
                productName: productDoc.data().productName,
                ...productDoc.data()
              };
            }
            return null;
          })
        );
        
        setPossibleProducts(productsWithNames.filter(p => p !== null));
        
        // Reset dependent fields
        setProductInputs(prev => ({ ...prev, product: "", gram: "" }));
        
      } catch (error) {
        console.error("Error fetching possible products:", error);
        setMessage({ type: "error", text: "Ошибка при загрузке продуктов" });
      }
    }
  };

  // Handle changes for Standard Label Design
  const handleStandardDesignChange = async (field, value) => {
    if (field === 'packageType') {
      // Filter products by selected package type
      const filteredProducts = productTypesData.filter(item => item.packageID === value);
      const uniqueProducts = [...new Set(filteredProducts.map(item => item.productID_2))];
      
      // Get product names from products collection
      const productsWithNames = await Promise.all(
        uniqueProducts.map(async (productID) => {
          try {
            const productDoc = await getDoc(doc(db, "products", productID));
            if (productDoc.exists()) {
              return {
                id: productID,
                productName: productDoc.data().productName,
                ...productDoc.data()
              };
            }
            return { id: productID, productName: productID };
          } catch (error) {
            console.error(`Error fetching product ${productID}:`, error);
            return { id: productID, productName: productID };
          }
        })
      );
      
      setAvailableProducts(productsWithNames);
      
      // Reset dependent fields
      setProductInputs(prev => ({ ...prev, product: "", gram: "", name: "" }));
      setAvailableGrams([]);
      setAvailableNames([]);
      
    } else if (field === 'product') {
      // Filter grams by selected package type and product
      const filteredItems = productTypesData.filter(item => 
        item.packageID === productInputs.packageType && item.productID_2 === value
      );
      const uniqueGrams = [...new Set(filteredItems.map(item => item.gram))].sort((a, b) => a - b);
      
      setAvailableGrams(uniqueGrams);
      
      // Reset dependent fields
      setProductInputs(prev => ({ ...prev, gram: "", name: "" }));
      setAvailableNames([]);
      
    } else if (field === 'gram') {
      // Check if multiple names exist for this combination
      const matchingItems = productTypesData.filter(item => 
        item.packageID === productInputs.packageType && 
        item.productID_2 === productInputs.product && 
        item.gram === parseInt(value)
      );
      
      if (matchingItems.length > 1) {
        const uniqueNames = [...new Set(matchingItems.map(item => item.name))];
        setAvailableNames(uniqueNames);
      } else {
        setAvailableNames([]);
        // Auto-select the name if only one exists
        if (matchingItems.length === 1 && matchingItems[0].name) {
          setProductInputs(prev => ({ ...prev, name: matchingItems[0].name }));
        }
      }
    }
  };

  // Handle paper roll changes (only for unique design)
  const handlePaperRollChange = (rollId, value) => {
    setPaperRolls(prev => 
      prev.map(roll => 
        roll.id === rollId 
          ? { ...roll, paperRemaining: value }
          : roll
      )
    );
  };

  const handleAddPaperRoll = () => {
    const newId = Math.max(...paperRolls.map(r => r.id), 0) + 1;
    setPaperRolls(prev => [...prev, { id: newId, paperRemaining: "" }]);
  };

  const handleRemovePaperRoll = (rollId) => {
    if (paperRolls.length > 1) {
      setPaperRolls(prev => prev.filter(roll => roll.id !== rollId));
    }
  };

  // Handle branch changes
  const handleBranchChange = (branchId, field, value) => {
    setBranches(prev =>
      prev.map(branch =>
        branch.id === branchId
          ? { ...branch, [field]: value }
          : branch
      )
    );
  };

  const handleAddBranch = () => {
    const newId = Math.max(...branches.map(b => b.id), 0) + 1;
    setBranches(prev => [...prev, {
      id: newId,
      orgName: "",
      addressShort: "",
      geoPoint: "",
      comment: ""
    }]);
  };

  const handleRemoveBranch = (branchId) => {
    setBranches(prev => prev.filter(branch => branch.id !== branchId));
  };

  const validateForm = () => {
    const errors = [];

    // Basic required fields
    if (!formData.name.trim()) errors.push("Название ресторана обязательно");
    if (!formData.designType) errors.push("Тип дизайна обязателен");

    // Branch validation
    if (branches.length > 0) {
      // Validate each branch
      branches.forEach((branch, index) => {
        if (!branch.orgName.trim()) errors.push(`Филиал ${index + 1}: Наименование организации обязательно`);
        if (!branch.addressShort.trim()) errors.push(`Филиал ${index + 1}: Адрес обязателен`);
        if (!branch.geoPoint.trim()) errors.push(`Филиал ${index + 1}: Координаты обязательны`);

        // Validate coordinates format for each branch
        if (branch.geoPoint) {
          const parts = branch.geoPoint.split(',').map(p => p.trim());
          if (parts.length !== 2) {
            errors.push(`Филиал ${index + 1}: Координаты должны быть в формате: широта, долгота`);
          } else {
            const [lat, lng] = parts;
            if (isNaN(lat) || lat < -90 || lat > 90)
              errors.push(`Филиал ${index + 1}: Широта должна быть между -90 и 90`);
            if (isNaN(lng) || lng < -180 || lng > 180)
              errors.push(`Филиал ${index + 1}: Долгота должна быть между -180 и 180`);
          }
        }
      });
    } else {
      // Old validation for clients without branches (backward compatibility)
      if (!formData.addressShort.trim()) errors.push("Адрес обязателен");
      if (!formData.geoPoint.trim()) errors.push("Координаты обязательны");

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
    }

    // Product selection validation
    if (!productInputs.packageType) errors.push("Выберите тип упаковки");
    if (!productInputs.product) errors.push("Выберите продукт");
    if (!productInputs.gram) errors.push("Выберите граммаж");

    // For standard design, check if name is required
    if (formData.designType === "standart" && availableNames.length > 0 && !productInputs.name) {
      errors.push("Выберите название");
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

    return errors;
  };

  // Function to create log entries for initial paper rolls
  const createInitialPaperLogs = async (clientId, createdRolls, userId) => {
    try {
      console.log("Creating logs for rolls:", createdRolls);
      const logsRef = collection(db, `clients/${clientId}/logs`);
      
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
      console.log(`Successfully created ${logResults.length} initial log entries`);
      
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
    }
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
    // Parse coordinates - use first branch if branches exist, otherwise use formData
    let latitude, longitude;
    if (branches.length > 0) {
      [latitude, longitude] = branches[0].geoPoint.split(',').map(coord => parseFloat(coord.trim()));
    } else {
      [latitude, longitude] = formData.geoPoint.split(',').map(coord => parseFloat(coord.trim()));
    }

    // Build client data based on design type - FIXED: Always use productID_2
    const baseClientData = {
      name: formData.name.trim(),
      orgName: branches.length > 0 ? branches[0].orgName.trim() : formData.orgName.trim(),
      restaurant: formData.name.trim(),
      addressShort: branches.length > 0 ? branches[0].addressShort.trim() : formData.addressShort.trim(),
      addressLong: new GeoPoint(latitude, longitude),
      designType: formData.designType,
      comment: branches.length > 0 ? (branches[0].comment || '').trim() : formData.comment.trim(),
      // Save the new product selection format
      packageID: productInputs.packageType,
      productID_2: productInputs.product, // ← ALWAYS use productID_2
      gram: parseInt(productInputs.gram),
      ...(productInputs.name && { name: productInputs.name })
    };

    let clientData;

    if (formData.designType === "standart") {
      // For standard design type
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
        totalKg: totalAvailable,
        paperRemaining: totalAvailable,
        notifyWhen: parseFloat(formData.notifyWhen)
      };
    }

    console.log("Saving client data:", clientData);

    // Add the main client document
    const clientDocRef = await addDoc(collection(db, "clients"), clientData);
    const clientId = clientDocRef.id;

    // Save branches to subcollection if they exist
    if (branches.length > 0) {
      console.log("Creating branches subcollection...");
      const branchesPromises = branches.map(async (branch, index) => {
        const [branchLat, branchLng] = branch.geoPoint.split(',').map(coord => parseFloat(coord.trim()));
        return await addDoc(collection(db, `clients/${clientId}/branches`), {
          branchName: `Филиал ${index + 1}`,
          orgName: branch.orgName.trim(),
          addressShort: branch.addressShort.trim(),
          addressLong: new GeoPoint(branchLat, branchLng),
          comment: (branch.comment || '').trim(),
          createdAt: Timestamp.now(),
          branchIndex: index + 1
        });
      });
      await Promise.all(branchesPromises);
      console.log(`Created ${branches.length} branches for client ${clientId}`);
    }

    // If unique design, create paper rolls subcollection and logs
    if (formData.designType === "unique") {
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
      
      const createdRollsData = createdRollRefs.map((rollRef, index) => {
        const rollId = rollRef.id;
        const rollData = {
          rollId: rollId,
          paperRemaining: parseFloat(paperRolls[index].paperRemaining),
          dateCreated: Timestamp.now()
        };
        console.log(`✅ Roll ${index + 1} created with rollId=${rollId}`, rollData);
        return rollData;
      });

      console.log(`Created ${createdRollsData.length} paper rolls for client ${clientId}`);

      // Create initial log entries with correct rollIDs
      console.log("Creating log entries with rollIDs...");
      await createInitialPaperLogs(
        clientId, 
        createdRollsData,
        currentUser?.uid
      );

      // Check for low paper notification
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
      comment: ""
    });

    setProductInputs({
      packageType: "",
      product: "",
      gram: "",
      name: ""
    });

    setPaperRolls([{ id: 1, paperRemaining: "" }]);
    setBranches([]);

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

  const isStandardDesign = formData.designType === "standart";

  // Static gram options for unique design
  const staticGramOptions = [1, 2, 3, 4, 5, 6];

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
      overflow: 'auto', // Fixed scrolling
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
          maxHeight: '90vh', // Added maxHeight
          overflow: 'auto', // Added scrolling
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
            {/* --- All your existing form content remains here --- */}
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

                  {/* Button to add branches */}
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddBranch}
                      sx={{
                        borderColor: '#0F9D8C',
                        color: '#0F9D8C',
                        '&:hover': {
                          borderColor: '#0c7a6e',
                          backgroundColor: 'rgba(15, 157, 140, 0.04)'
                        }
                      }}
                    >
                      Добавить филиал
                    </Button>
                  </Grid>

                  {/* Show old fields if no branches */}
                  {branches.length === 0 && (
                    <>
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
                    </>
                  )}

                  {/* Display branches */}
                  {branches.map((branch, index) => (
                    <Grid item xs={12} key={branch.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          p: 2,
                          backgroundColor: '#f0faf9',
                          border: '1.5px solid #0F9D8C',
                          borderRadius: 2
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: '#0F9D8C' }}>
                            Филиал {index + 1}
                          </Typography>
                          <IconButton
                            onClick={() => handleRemoveBranch(branch.id)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Наименование организации"
                              variant="outlined"
                              value={branch.orgName}
                              onChange={(e) => handleBranchChange(branch.id, 'orgName', e.target.value)}
                              required
                              size="small"
                              sx={{ fontSize: '1.15em' }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Адрес"
                              variant="outlined"
                              value={branch.addressShort}
                              onChange={(e) => handleBranchChange(branch.id, 'addressShort', e.target.value)}
                              required
                              size="small"
                              sx={{ fontSize: '1.15em' }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Локация ( координаты )"
                              variant="outlined"
                              value={branch.geoPoint}
                              onChange={(e) => handleBranchChange(branch.id, 'geoPoint', e.target.value)}
                              required
                              size="small"
                              placeholder="41.2995, 69.2401"
                              sx={{ fontSize: '1.15em' }}
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Комментарий"
                              variant="outlined"
                              value={branch.comment}
                              onChange={(e) => handleBranchChange(branch.id, 'comment', e.target.value)}
                              size="small"
                              sx={{ fontSize: '1.15em' }}
                            />
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  ))}

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
                  {/* Package Type */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      label="Тип упаковки"
                      value={productInputs.packageType}
                      onChange={(e) => handleProductInputChange('packageType', e.target.value)}
                      required
                      size="small"
                      SelectProps={{
                        renderValue: (selected) => {
                          if (!selected) {
                            return <span style={{ opacity: 0.6, fontStyle: "italic" }}>Выбрать</span>;
                          }
                          
                          const selectedPackage = packageTypes.find((p) => p.id === selected);
                          
                          if (!selectedPackage) {
                            const fallbackPackage = packageTypes.find((p) => 
                              p.name === selected || p.type === selected || p.id === selected
                            );
                            
                            if (fallbackPackage) {
                              return fallbackPackage.name || fallbackPackage.type || fallbackPackage.id;
                            }
                            
                            return selected;
                          }
                          
                          return selectedPackage.name || selectedPackage.type || selectedPackage.id;
                        },
                        MenuProps: {
                          PaperProps: {
                            sx: {
                              maxHeight: 250,
                              minWidth: 200,
                              '& .MuiMenuItem-root': {
                                fontSize: '0.9rem',
                                minHeight: '36px',
                                padding: '8px 16px',
                              }
                            }
                          }
                        }
                      }}
                    >
                      {packageTypes.length > 0 ? (
                        packageTypes.map((pkg) => (
                          <MenuItem key={pkg.id} value={pkg.id}>
                            {pkg.name || pkg.type || pkg.id}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">
                          Загрузка типов упаковки...
                        </MenuItem>
                      )}
                    </TextField>
                  </Grid>

                  {/* Product */}
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      fullWidth
                      label="Продукт"
                      value={productInputs.product}
                      onChange={(e) => handleProductInputChange('product', e.target.value)}
                      required
                      size="small"
                      disabled={!productInputs.packageType}
                      SelectProps={{
                        renderValue: (selected) => {
                          if (!selected) return <span style={{ opacity: 0.6, fontStyle: "italic" }}>Выбрать</span>;
                          
                          const source = formData.designType === "unique" ? possibleProducts : availableProducts;
                          const item = source.find((p) => p.id === selected);
                          
                          if (!item) {
                            const fallbackItem = source.find((p) => 
                              p.productName === selected || p.name === selected || p.id === selected
                            );
                            
                            if (fallbackItem) {
                              return fallbackItem.productName || fallbackItem.name || fallbackItem.id;
                            }
                            
                            return selected;
                          }
                          
                          return item.productName || item.name || item.id;
                        },
                        MenuProps: {
                          PaperProps: { 
                            sx: { 
                              maxHeight: 250,
                              minWidth: 200 
                            } 
                          }
                        }
                      }}
                    >
                      {(formData.designType === "unique" ? possibleProducts : availableProducts).length > 0 ? (
                        (formData.designType === "unique" ? possibleProducts : availableProducts).map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.productName || product.name || product.id}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled value="">
                          {productInputs.packageType ? "Загрузка продуктов..." : "Сначала выберите тип упаковки"}
                        </MenuItem>
                      )}
                    </TextField>
                  </Grid>

          
                  {/* Gram */}
<Grid item xs={12} sm={4}>
  <TextField
    select
    fullWidth
    label="Граммаж"
    value={productInputs.gram}
    onChange={(e) => handleProductInputChange('gram', e.target.value)}
    required
    size="small"
    disabled={!productInputs.product}
    SelectProps={{
      renderValue: (selected) =>
        selected
          ? `${selected} г`
          : <span style={{ opacity: 0.6, fontStyle: "italic" }}>Выбрать</span>,
      MenuProps: { 
        PaperProps: { 
          sx: { 
            maxHeight: 200,
            minWidth: 120 
          } 
        } 
      }
    }}
  >
    {/* Always show static gram options for both design types */}
    {staticGramOptions.map((gram) => (
      <MenuItem key={gram} value={gram}>
        {gram} г
      </MenuItem>
    ))}
  </TextField>
</Grid>

                  {/* Name (only for Standard Design with multiple options) */}
                  {isStandardDesign && availableNames.length > 0 && (
                    <Grid item xs={12} sm={4}>
                      <TextField
                        select
                        fullWidth
                        label="Название"
                        value={productInputs.name}
                        onChange={(e) => handleProductInputChange('name', e.target.value)}
                        required
                        size="small"
                        SelectProps={{
                          renderValue: (selected) =>
                            selected
                              ? selected
                              : <span style={{ opacity: 0.6, fontStyle: "italic" }}>Выбрать</span>,
                          MenuProps: { 
                            PaperProps: { 
                              sx: { 
                                maxHeight: 200,
                                minWidth: 200 
                              } 
                            } 
                          }
                        }}
                      >
                        {availableNames.map((name) => (
                          <MenuItem key={name} value={name}>
                            {name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Grid>

            {/* --- SUBMIT BUTTON --- */}
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mt: 4,
                pt: 3,
                borderTop: '1px solid',
                borderColor: 'divider'
              }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    minWidth: 200,
                    fontSize: '1.1em',
                    py: 1.5,
                    fontWeight: 600
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'Сохранить клиента'
                  )}
                </Button>
              </Box>
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