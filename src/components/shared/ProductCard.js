import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
  IconButton,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ImageLightbox from './ImageLightbox';
import { brandColors } from '../../theme/colors';

const ProductCard = ({ product, onEdit }) => {
  const navigate = useNavigate();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageHovered, setIsImageHovered] = useState(false);

  // Collect all available images
  const images = [];
  if (product.imageURL) images.push(product.imageURL);
  if (product.imageURL2) images.push(product.imageURL2);
  if (product.imageURL3) images.push(product.imageURL3);
  if (product.imageURL4) images.push(product.imageURL4);
  if (product.imageURL5) images.push(product.imageURL5);

  // Check if product has valid paperDocID
  const hasPaperDoc = product.paperDocID && product.paperDocID !== 'n/a';

  const handleImageClick = () => {
    setSelectedImageIndex(currentImageIndex);
    setLightboxOpen(true);
  };

  const handleIndicatorClick = (index, e) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  const handleNavigateToPaper = () => {
    // Navigate to paper-control page with query parameters
    navigate(`/paper-control?tab=1&highlight=${product.paperDocID}`);
  };

  return (
    <>
      <Card
        sx={{
          height: 580,
          width: '100%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          boxShadow: 'none',
          border: '1px solid transparent',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            border: '1px solid #bdbdbd',
          },
        }}
      >
        {/* Image Section */}
        <Box
          sx={{ position: 'relative', height: 240, width: '100%', overflow: 'hidden', flexShrink: 0 }}
          onMouseEnter={() => setIsImageHovered(true)}
          onMouseLeave={() => setIsImageHovered(false)}
        >
          <CardMedia
            component="img"
            image={images[currentImageIndex] || 'https://via.placeholder.com/400'}
            alt={product.productName}
            onClick={handleImageClick}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              cursor: 'zoom-in',
              transition: 'all 0.3s ease',
              filter: isImageHovered ? 'brightness(0.7)' : 'brightness(1)',
              transform: isImageHovered ? 'scale(1.05)' : 'scale(1)',
            }}
          />

          {/* Gradient overlays */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.3) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Zoom Icon Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: isImageHovered ? 1 : 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <ZoomInIcon
              sx={{
                fontSize: 64,
                color: 'white',
                filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.6))',
              }}
            />
          </Box>

          {/* Edit button - Top right corner */}
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(product);
            }}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              width: 36,
              height: 36,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'white',
                transform: 'scale(1.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              },
            }}
          >
            <EditIcon
              sx={{
                fontSize: 18,
                color: brandColors.primary,
              }}
            />
          </IconButton>

          {/* Circle indicators */}
          {images.length > 1 && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 0.75,
                zIndex: 2,
              }}
            >
              {images.map((_, index) => (
                <Box
                  key={index}
                  onClick={(e) => handleIndicatorClick(index, e)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: currentImageIndex === index ? 'white' : 'transparent',
                    border: '1.5px solid white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'scale(1.2)',
                    },
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* Content Section */}
        <CardContent sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
          <Box sx={{ overflow: 'hidden' }}>
            {/* Product Name */}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                mb: 0.5,
                color: brandColors.textPrimary,
                fontSize: '1.1rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.3,
                minHeight: '2.86em',
              }}
            >
              {product.productName}
            </Typography>

            {/* Package Type */}
            <Typography
              variant="body2"
              sx={{
                color: brandColors.textSecondary,
                mb: 1,
                fontSize: '0.875rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {product.packageType}
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
                maxWidth: '100%',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: brandColors.primary,
                  fontWeight: 600,
                  fontSize: '0.813rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {product.productCode}
              </Typography>
            </Box>

            {/* Material Used */}
            {product.usedMaterial && (
              <Box
                sx={{
                  backgroundColor: brandColors.gray,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  border: `1px solid ${brandColors.border}`,
                  mb: 1.5,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: brandColors.textSecondary,
                    fontSize: '0.688rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  Используемый материал
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: brandColors.textPrimary,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {product.usedMaterial}
                </Typography>
              </Box>
            )}

            {/* Gramm Options */}
            {product.possibleGramms && product.possibleGramms.length > 0 && (
              <Box
                sx={{
                  backgroundColor: brandColors.primaryVeryLight,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  border: `1px solid ${brandColors.primary}`,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: brandColors.textSecondary,
                    fontSize: '0.688rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  Доступные граммовки
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                  {product.possibleGramms.map((gramm) => (
                    <Chip
                      key={gramm}
                      label={`${gramm} гр`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: brandColors.primary,
                        color: 'white',
                        '& .MuiChip-label': {
                          px: 1,
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>

          {/* Button to navigate to paper control - Always shown for consistency */}
          <Button
            variant="outlined"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            onClick={handleNavigateToPaper}
            disabled={!hasPaperDoc}
            sx={{
              borderColor: hasPaperDoc ? brandColors.primary : brandColors.border,
              color: hasPaperDoc ? brandColors.primary : brandColors.textSecondary,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.2,
              borderRadius: 2,
              flexShrink: 0,
              '&:hover': {
                borderColor: hasPaperDoc ? brandColors.primaryHover : brandColors.border,
                backgroundColor: hasPaperDoc ? brandColors.primaryVeryLight : 'transparent',
              },
              '&.Mui-disabled': {
                borderColor: brandColors.border,
                color: brandColors.textSecondary,
                opacity: 0.5,
              },
            }}
          >
            Показать данные бумаги
          </Button>
        </CardContent>
      </Card>

      {/* Image Lightbox */}
      <ImageLightbox
        images={images}
        initialIndex={selectedImageIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export default ProductCard;
