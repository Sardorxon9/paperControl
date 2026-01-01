import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Typography,
  Card,
  Chip,
  Stack,
  IconButton,
  Paper,
  Alert,
  Avatar,
  Dialog,
  DialogContent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
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
  const [materialFilter, setMaterialFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);

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

  // Sync selected item when selectedCatalogueItemId changes
  useEffect(() => {
    if (selectedCatalogueItemId && catalogueItems.length > 0) {
      const item = catalogueItems.find(i => i.id === selectedCatalogueItemId);
      if (item) {
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(null);
    }
  }, [selectedCatalogueItemId, catalogueItems]);

  // Get unique materials for filters
  const uniqueMaterials = [...new Set(catalogueItems.map(item => item.usedMaterial).filter(Boolean))];

  // Material color mapping
  const getMaterialColor = (material) => {
    const colors = {
      'Термо': { bg: '#e3f2fd', color: '#1976d2' },
      'ЭКО': { bg: '#e8f5e9', color: '#2e7d32' },
      'Полупрозрачная': { bg: '#fff3e0', color: '#e65100' },
      'default': { bg: '#f5f5f5', color: '#616161' }
    };
    return colors[material] || colors.default;
  };

  // Filter by search query and material
  const filteredItems = catalogueItems.filter((item) => {
    // Material filter
    if (materialFilter !== 'all' && item.usedMaterial !== materialFilter) {
      return false;
    }

    // Search filter
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

  // Handle product selection (first step)
  const handleSelectProduct = (catalogueItem) => {
    setSelectedItem(catalogueItem);
    // If there's only one gramm option, auto-select it
    if (catalogueItem.possibleGramms?.length === 1) {
      handleSelectGramm(catalogueItem, catalogueItem.possibleGramms[0]);
    }
  };

  // Handle gramm selection (second step)
  const handleSelectGramm = (catalogueItem, gramm) => {
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
        size="medium"
        variant="outlined"
        placeholder="Поиск по коду, названию или материалу..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: brandColors.textSecondary, fontSize: 24 }} />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton onClick={handleClearSearch} size="small">
                <ClearIcon fontSize="medium" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2.5,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: '#fafafa',
            fontSize: '0.95rem',
            '&:hover fieldset': {
              borderColor: brandColors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: brandColors.primary,
              backgroundColor: 'white',
            },
          },
        }}
      />

      {/* Material Filters */}
      {uniqueMaterials.length > 1 && (
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" spacing={1.2} flexWrap="wrap" sx={{ gap: 1.2 }}>
            <Chip
              label="Все"
              onClick={() => setMaterialFilter('all')}
              sx={{
                backgroundColor: materialFilter === 'all' ? brandColors.primary : 'white',
                color: materialFilter === 'all' ? 'white' : brandColors.textPrimary,
                fontWeight: 600,
                fontSize: '0.9rem',
                height: '34px',
                px: 1,
                border: `1.5px solid ${materialFilter === 'all' ? brandColors.primary : brandColors.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: materialFilter === 'all' ? brandColors.primaryHover : brandColors.primaryVeryLight,
                  borderColor: brandColors.primary,
                },
              }}
            />
            {uniqueMaterials.map((material) => {
              const isActive = materialFilter === material;
              const colors = getMaterialColor(material);
              return (
                <Chip
                  key={material}
                  label={material}
                  onClick={() => setMaterialFilter(material)}
                  sx={{
                    backgroundColor: isActive ? colors.color : 'white',
                    color: isActive ? 'white' : colors.color,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    height: '34px',
                    px: 1,
                    border: `1.5px solid ${colors.color}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isActive ? colors.color : colors.bg,
                      transform: 'scale(1.05)',
                    },
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Results count */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="body1" sx={{ color: brandColors.textSecondary, fontSize: '0.95rem' }}>
          {filteredItems.length > 0 ? (
            <>
              Найдено: <strong>{filteredItems.length}</strong> {filteredItems.length === 1 ? 'дизайн' : 'дизайнов'}
            </>
          ) : (
            'Ничего не найдено'
          )}
        </Typography>
        {selectedCatalogueItemId && selectedGramm && (
          <Chip
            label="Выбран дизайн"
            size="medium"
            color="success"
            icon={<CheckCircleIcon />}
            sx={{ fontWeight: 600, fontSize: '0.85rem' }}
          />
        )}
      </Box>

      {/* Catalogue Items - Horizontal Cards */}
      {filteredItems.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            border: `1px dashed ${brandColors.border}`,
            backgroundColor: '#fafafa',
          }}
        >
          <Typography variant="body1" sx={{ color: brandColors.textSecondary, mb: 1 }}>
            {searchQuery || materialFilter !== 'all' ? 'Ничего не найдено' : 'Нет доступных дизайнов'}
          </Typography>
          {(searchQuery || materialFilter !== 'all') && (
            <Typography variant="body2" sx={{ color: brandColors.textSecondary }}>
              Попробуйте изменить фильтры или поисковый запрос
            </Typography>
          )}
        </Paper>
      ) : (
        <Box
          sx={{
            maxHeight: 450,
            overflowY: 'auto',
            pr: 1,
            mb: 3,
            '&::-webkit-scrollbar': {
              width: '7px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
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
          <Stack spacing={1.8}>
            {filteredItems.map((item) => {
              const isItemSelected = selectedItem?.id === item.id;
              const materialColors = getMaterialColor(item.usedMaterial);

              return (
                <Card
                  key={item.id}
                  onClick={() => handleSelectProduct(item)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    p: 2,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: isItemSelected ? brandColors.primary : brandColors.border,
                    borderLeft: isItemSelected ? `5px solid ${brandColors.primary}` : '1px solid',
                    backgroundColor: isItemSelected ? '#f0f9ff' : 'white',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: brandColors.primary,
                      boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                      transform: 'translateX(3px)',
                    },
                  }}
                >
                  {/* Thumbnail with Hover Effect */}
                  <Box
                    sx={{
                      position: 'relative',
                      mr: 2.5,
                      flexShrink: 0,
                      cursor: 'zoom-in',
                      '&:hover .zoom-overlay': {
                        opacity: 1,
                      },
                      '&:hover .thumbnail-image': {
                        filter: 'brightness(0.7)',
                      },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenImage(item);
                    }}
                  >
                    <Avatar
                      className="thumbnail-image"
                      src={item.imageURL || 'https://via.placeholder.com/81'}
                      alt={item.productName}
                      variant="rounded"
                      sx={{
                        width: 81,
                        height: 81,
                        border: `2px solid ${brandColors.border}`,
                        transition: 'filter 0.2s ease',
                      }}
                    />
                    <Box
                      className="zoom-overlay"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                        pointerEvents: 'none',
                      }}
                    >
                      <ZoomInIcon
                        sx={{
                          fontSize: 36,
                          color: 'white',
                          filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Content */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    {/* Product Code Badge + Name */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 0.8 }}>
                      <Chip
                        icon={<LocalOfferIcon sx={{ fontSize: 15 }} />}
                        label={item.productCode}
                        size="medium"
                        sx={{
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          height: '28px',
                          '& .MuiChip-icon': {
                            color: '#1976d2',
                          },
                        }}
                      />
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          color: brandColors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.productName}
                      </Typography>
                    </Box>

                    {/* Package Type + Material */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: brandColors.textSecondary,
                          fontSize: '0.9rem',
                        }}
                      >
                        📦 {item.packageType}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: brandColors.textSecondary,
                          fontSize: '0.9rem',
                        }}
                      >
                        •
                      </Typography>
                      <Chip
                        label={item.usedMaterial}
                        size="small"
                        sx={{
                          backgroundColor: materialColors.bg,
                          color: materialColors.color,
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          height: '22px',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Selection Indicator */}
                  {isItemSelected && (
                    <CheckCircleIcon
                      sx={{
                        fontSize: 32,
                        color: brandColors.primary,
                        ml: 2,
                      }}
                    />
                  )}
                </Card>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Gramm Selection Section - Separate */}
      {selectedItem && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: `2px solid ${brandColors.primary}`,
            backgroundColor: '#f0f9ff',
            mt: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '1.05rem',
              color: brandColors.textPrimary,
              mb: 2,
            }}
          >
            Выберите граммаж для: {selectedItem.productName}
          </Typography>
          <Stack direction="row" spacing={1.2} flexWrap="wrap" sx={{ gap: 1.2 }}>
            {selectedItem.possibleGramms?.map((gramm) => {
              const selected = isSelected(selectedItem.id, gramm);
              return (
                <Chip
                  key={gramm}
                  label={`${gramm} гр`}
                  onClick={() => handleSelectGramm(selectedItem, gramm)}
                  icon={selected ? <CheckCircleIcon /> : null}
                  sx={{
                    backgroundColor: selected ? brandColors.primary : 'white',
                    color: selected ? 'white' : brandColors.textPrimary,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    height: '38px',
                    minWidth: '75px',
                    px: 1.5,
                    border: `2px solid ${selected ? brandColors.primary : brandColors.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '& .MuiChip-icon': {
                      color: 'white',
                      fontSize: 20,
                    },
                    '&:hover': {
                      backgroundColor: selected ? brandColors.primaryHover : brandColors.primaryVeryLight,
                      borderColor: brandColors.primary,
                      transform: 'scale(1.08)',
                    },
                  }}
                />
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Full Screen Image Dialog */}
      <Dialog
        open={!!fullScreenImage}
        onClose={() => setFullScreenImage(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            boxShadow: 'none',
            maxWidth: '90vw',
            maxHeight: '90vh',
          },
        }}
      >
        <IconButton
          onClick={() => setFullScreenImage(null)}
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            zIndex: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        >
          <CloseIcon fontSize="large" />
        </IconButton>
        <DialogContent
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {fullScreenImage && (
            <>
              <Box
                component="img"
                src={fullScreenImage.imageURL || 'https://via.placeholder.com/800'}
                alt={fullScreenImage.productName}
                sx={{
                  maxWidth: '100%',
                  maxHeight: 'calc(90vh - 120px)',
                  objectFit: 'contain',
                  borderRadius: 2,
                }}
              />
              <Box
                sx={{
                  mt: 3,
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: 'white',
                    fontWeight: 700,
                    mb: 0.5,
                  }}
                >
                  {fullScreenImage.productName}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.95rem',
                  }}
                >
                  Код: {fullScreenImage.productCode} • {fullScreenImage.packageType} • {fullScreenImage.usedMaterial}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default StandardDesignPicker;
