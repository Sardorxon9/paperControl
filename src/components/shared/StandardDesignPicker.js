import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Grid,
  IconButton,
  Paper,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { brandColors } from '../../theme/colors';

/**
 * StandardDesignPicker - Reusable component for selecting standard designs with gramm options
 *
 * Props:
 * - onSelect: (catalogueItemId, gramm, catalogueItem) => void - Callback when design + gramm selected
 * - selectedCatalogueItemId: string - Currently selected catalogue item ID
 * - selectedGramm: number - Currently selected gramm value
 * - compact: boolean - Use compact view (default: false)
 * - allowedMaterials: array - Filter by specific materials (optional)
 * - showOnlyWithRolls: boolean - Show only designs with paper rolls (future feature)
 */
const StandardDesignPicker = ({
  onSelect,
  selectedCatalogueItemId = null,
  selectedGramm = null,
  compact = false,
  allowedMaterials = null,
  showOnlyWithRolls = false,
}) => {
  const [catalogueItems, setCatalogueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Fetch catalogue items
  useEffect(() => {
    const fetchCatalogueItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const querySnapshot = await getDocs(collection(db, 'catalogue'));
        let items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter by allowed materials if specified
        if (allowedMaterials && allowedMaterials.length > 0) {
          items = items.filter((item) =>
            allowedMaterials.includes(item.usedMaterial)
          );
        }

        // Filter only items with possibleGramms
        items = items.filter((item) => item.possibleGramms && item.possibleGramms.length > 0);

        setCatalogueItems(items);
      } catch (err) {
        console.error('Error fetching catalogue items:', err);
        setError('Ошибка загрузки каталога');
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogueItems();
  }, [allowedMaterials]);

  // Filter by search query
  const filteredItems = catalogueItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      item.productName?.toLowerCase().includes(query) ||
      item.productCode?.toLowerCase().includes(query) ||
      item.usedMaterial?.toLowerCase().includes(query)
    );
  });

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleSelectDesignGramm = (catalogueItem, gramm) => {
    if (onSelect) {
      onSelect(catalogueItem.id, gramm, catalogueItem);
    }
  };

  const isSelected = (catalogueItemId, gramm) => {
    return selectedCatalogueItemId === catalogueItemId && selectedGramm === gramm;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress sx={{ color: brandColors.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Search Bar */}
      <TextField
        fullWidth
        size={compact ? 'small' : 'medium'}
        variant="outlined"
        placeholder="Поиск по коду или названию..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: brandColors.textSecondary, fontSize: compact ? 20 : 24 }} />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton onClick={handleClearSearch} size="small">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            '&:hover fieldset': {
              borderColor: brandColors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: brandColors.primary,
            },
          },
        }}
      />

      {/* Results count */}
      {searchQuery && (
        <Typography
          variant="body2"
          sx={{ color: brandColors.textSecondary, mb: 2 }}
        >
          Найдено: <strong>{filteredItems.length}</strong>
        </Typography>
      )}

      {/* Catalogue Items Grid */}
      {filteredItems.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            border: `1px solid ${brandColors.border}`,
          }}
        >
          <Typography variant="body1" sx={{ color: brandColors.textSecondary }}>
            {searchQuery ? 'Ничего не найдено' : 'Нет доступных дизайнов'}
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            maxHeight: compact ? 400 : 600,
            overflowY: 'auto',
            pr: 1,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: brandColors.gray,
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: brandColors.border,
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: brandColors.textSecondary,
              },
            },
          }}
        >
          <Grid container spacing={compact ? 2 : 3}>
            {filteredItems.map((item) => (
              <Grid item xs={12} sm={compact ? 12 : 6} md={compact ? 6 : 4} key={item.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: brandColors.border,
                    '&:hover': {
                      borderColor: brandColors.primary,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  {/* Image */}
                  <CardMedia
                    component="img"
                    image={item.imageURL || 'https://via.placeholder.com/400'}
                    alt={item.productName}
                    sx={{
                      height: compact ? 120 : 160,
                      objectFit: 'cover',
                    }}
                  />

                  {/* Content */}
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    {/* Product Name */}
                    <Typography
                      variant={compact ? 'body1' : 'h6'}
                      sx={{
                        fontWeight: 700,
                        mb: 0.5,
                        color: brandColors.textPrimary,
                        fontSize: compact ? '0.95rem' : '1.1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.productName}
                    </Typography>

                    {/* Package Type */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: brandColors.textSecondary,
                        mb: 1,
                        fontSize: compact ? '0.8rem' : '0.875rem',
                      }}
                    >
                      {item.packageType}
                    </Typography>

                    {/* Product Code */}
                    <Box
                      sx={{
                        display: 'inline-block',
                        backgroundColor: brandColors.primaryVeryLight,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        mb: 1.5,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: brandColors.primary,
                          fontWeight: 600,
                          fontSize: compact ? '0.75rem' : '0.813rem',
                        }}
                      >
                        {item.productCode}
                      </Typography>
                    </Box>

                    {/* Material */}
                    <Typography
                      variant="caption"
                      sx={{
                        color: brandColors.textSecondary,
                        display: 'block',
                        mb: 1,
                        fontSize: compact ? '0.7rem' : '0.75rem',
                      }}
                    >
                      {item.usedMaterial}
                    </Typography>

                    {/* Gramm Options */}
                    <Box sx={{ mt: 1.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: brandColors.textSecondary,
                          fontWeight: 600,
                          display: 'block',
                          mb: 1,
                          fontSize: compact ? '0.7rem' : '0.75rem',
                        }}
                      >
                        Доступные граммы:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {item.possibleGramms?.map((gramm) => {
                          const selected = isSelected(item.id, gramm);
                          return (
                            <Chip
                              key={gramm}
                              label={`${gramm} гр`}
                              onClick={() => handleSelectDesignGramm(item, gramm)}
                              icon={selected ? <CheckCircleIcon /> : null}
                              sx={{
                                backgroundColor: selected
                                  ? brandColors.primary
                                  : 'white',
                                color: selected ? 'white' : brandColors.textPrimary,
                                fontWeight: 600,
                                fontSize: compact ? '0.75rem' : '0.813rem',
                                borderRadius: 1.5,
                                border: `1.5px solid ${
                                  selected ? brandColors.primary : brandColors.border
                                }`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                '& .MuiChip-icon': {
                                  color: 'white',
                                  fontSize: compact ? 16 : 18,
                                },
                                '&:hover': {
                                  backgroundColor: selected
                                    ? brandColors.primaryHover
                                    : brandColors.primaryVeryLight,
                                  borderColor: brandColors.primary,
                                  transform: 'scale(1.05)',
                                },
                              }}
                            />
                          );
                        })}
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default StandardDesignPicker;
