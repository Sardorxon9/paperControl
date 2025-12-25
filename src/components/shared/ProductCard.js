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
import ImageLightbox from './ImageLightbox';
import { brandColors } from '../../theme/colors';

const ProductCard = ({ product, onEdit }) => {
  const navigate = useNavigate();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Collect all available images
  const images = [];
  if (product.imageURL) images.push(product.imageURL);
  if (product.imageURL2) images.push(product.imageURL2);
  if (product.imageURL3) images.push(product.imageURL3);
  if (product.imageURL4) images.push(product.imageURL4);
  if (product.imageURL5) images.push(product.imageURL5);

  // Check if product has valid paperDocID
  const hasPaperDoc = product.paperDocID && product.paperDocID !== 'n/a';

  const handleImageClick = (index) => {
    setSelectedImageIndex(index);
    setLightboxOpen(true);
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
          border: '1px solid #e0e0e0',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-4px)',
            border: '1px solid #bdbdbd',
          },
        }}
      >
        {/* Image Section */}
        <Box sx={{ position: 'relative', height: 240, width: '100%', overflow: 'hidden', flexShrink: 0 }}>
          <CardMedia
            component="img"
            image={images[0] || 'https://via.placeholder.com/400'}
            alt={product.productName}
            onClick={() => handleImageClick(0)}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              cursor: 'pointer',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          />

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

          {/* Image count badge */}
          {images.length > 1 && (
            <Chip
              label={`${images.length} фото`}
              size="small"
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          )}
        </Box>

        {/* Additional thumbnail images */}
        {images.length > 1 && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              p: 1,
              pb: 0,
              overflowX: 'auto',
              flexShrink: 0,
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: brandColors.dark,
                borderRadius: 3,
              },
            }}
          >
            {images.slice(1, 5).map((img, idx) => (
              <Box
                key={idx}
                component="img"
                src={img}
                alt={`Thumbnail ${idx + 2}`}
                onClick={() => handleImageClick(idx + 1)}
                sx={{
                  width: 60,
                  height: 60,
                  flexShrink: 0,
                  objectFit: 'cover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: `2px solid ${brandColors.border}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: brandColors.dark,
                    transform: 'scale(1.1)',
                  },
                }}
              />
            ))}
          </Box>
        )}

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
