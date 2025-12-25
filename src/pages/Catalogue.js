import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  TextField,
  Tabs,
  Tab,
  Grid,
  InputAdornment,
  CircularProgress,
  Paper,
  Stack,
  Button,
  IconButton,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import ProductCard from '../components/shared/ProductCard';
import EditProductModal from '../components/modals/EditProductModal';
import { brandColors } from '../theme/colors';

const Catalogue = ({ user, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'catalogue'));
        const productsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search query
  const getSearchFilteredProducts = (productsList) => {
    if (!searchQuery.trim()) return productsList;

    const query = searchQuery.toLowerCase().trim();
    return productsList.filter(
      (product) =>
        product.productName?.toLowerCase().includes(query) ||
        product.productCode?.toLowerCase().includes(query)
    );
  };

  // Filter products based on selected tab
  const getTabFilteredProducts = () => {
    let filtered = products;

    // Filter by package type based on tab
    if (currentTab === 1) {
      // Стик tab
      filtered = products.filter(
        (product) => product.packageType?.toLowerCase() === 'стик'
      );
    } else if (currentTab === 2) {
      // Саше tab
      filtered = products.filter(
        (product) => product.packageType?.toLowerCase() === 'саше'
      );
    }
    // currentTab === 0 shows all products

    // Filter by material types if any are selected
    if (selectedMaterialTypes.length > 0) {
      filtered = filtered.filter((product) =>
        selectedMaterialTypes.includes(product.usedMaterial)
      );
    }

    return filtered;
  };

  // Get unique material types from products
  const getMaterialTypes = () => {
    const types = new Set();
    products.forEach((product) => {
      if (product.usedMaterial) {
        types.add(product.usedMaterial);
      }
    });
    return Array.from(types).sort();
  };

  const materialTypes = getMaterialTypes();

  // Apply both filters
  const filteredProducts = getSearchFilteredProducts(getTabFilteredProducts());

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleMaterialTypeToggle = (materialType) => {
    setSelectedMaterialTypes((prev) => {
      if (prev.includes(materialType)) {
        return prev.filter((type) => type !== materialType);
      } else {
        return [...prev, materialType];
      }
    });
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingProduct(null);
  };

  const handleProductUpdated = async () => {
    // Refresh the products list after update
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'catalogue'));
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: brandColors.gray }}>
      {/* Header */}
      <Box
        sx={{
          backgroundColor: brandColors.dark,
          borderBottom: `1px solid ${brandColors.border}`,
          py: 2,
          mb: 3,
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton
              onClick={() => navigate('/')}
              sx={{
                color: 'white',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                Каталог продукции
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                {user?.name} ({user?.email})
              </Typography>
            </Box>

            <Button
              variant="outlined"
              onClick={onLogout}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Выйти
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl">
        {/* Search Bar */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            border: `1px solid ${brandColors.border}`,
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Поиск по названию или коду продукта..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: brandColors.textSecondary }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClearSearch} size="small">
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: brandColors.dark,
                },
                '&.Mui-focused fieldset': {
                  borderColor: brandColors.dark,
                },
              },
            }}
          />
        </Paper>

        {/* Tabs */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: 3,
            border: `1px solid ${brandColors.border}`,
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: `1px solid ${brandColors.border}`,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                minHeight: 60,
                color: brandColors.textSecondary,
                '&.Mui-selected': {
                  color: brandColors.primary,
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: brandColors.primary,
                height: 3,
              },
            }}
          >
            <Tab label={`Все (${products.length})`} />
            <Tab
              label={`Стик (${
                products.filter((p) => p.packageType?.toLowerCase() === 'стик')
                  .length
              })`}
            />
            <Tab
              label={`Саше (${
                products.filter((p) => p.packageType?.toLowerCase() === 'саше')
                  .length
              })`}
            />
          </Tabs>

          {/* Material Type Filters */}
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${brandColors.border}` }}>
            <Typography
              variant="body2"
              sx={{
                color: brandColors.dark,
                mb: 1.5,
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              Сырье :
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {materialTypes.map((materialType) => (
                <Chip
                  key={materialType}
                  label={materialType}
                  onClick={() => handleMaterialTypeToggle(materialType)}
                  sx={{
                    backgroundColor: selectedMaterialTypes.includes(materialType)
                      ? brandColors.dark
                      : 'white',
                    color: selectedMaterialTypes.includes(materialType)
                      ? 'white'
                      : brandColors.textSecondary,
                    fontWeight: 600,
                    fontSize: '0.813rem',
                    borderRadius: 2,
                    border: `1px solid ${selectedMaterialTypes.includes(materialType) ? brandColors.dark : brandColors.border}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: selectedMaterialTypes.includes(materialType)
                        ? brandColors.dark
                        : brandColors.gray,
                      borderColor: brandColors.dark,
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>

          {/* Results count */}
          <Box sx={{ px: 3, py: 2, backgroundColor: brandColors.bgLight }}>
            <Typography
              variant="body2"
              sx={{ color: brandColors.textSecondary }}
            >
              Найдено продуктов: <strong>{filteredProducts.length}</strong>
            </Typography>
          </Box>
        </Paper>

        {/* Products Grid */}
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400,
            }}
          >
            <CircularProgress sx={{ color: brandColors.primary }} size={60} />
          </Box>
        ) : filteredProducts.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              border: `1px solid ${brandColors.border}`,
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: brandColors.textSecondary, mb: 1 }}
            >
              Продукты не найдены
            </Typography>
            <Typography variant="body2" sx={{ color: brandColors.textLight }}>
              Попробуйте изменить параметры поиска или фильтры
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3} sx={{ pb: 6 }}>
            {filteredProducts.map((product) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                lg={3}
                key={product.id}
              >
                <ProductCard product={product} onEdit={handleEditProduct} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Edit Product Modal */}
      <EditProductModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        product={editingProduct}
        onProductUpdated={handleProductUpdated}
      />
    </Box>
  );
};

export default Catalogue;
