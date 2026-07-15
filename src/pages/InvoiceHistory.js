import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
  IconButton,
  TextField,
  InputAdornment,
  Collapse,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ArrowBack,
  Search,
  KeyboardArrowUp,
  KeyboardArrowDown,
  ExpandMore,
  ExpandLess,
  History,
  Send
} from '@mui/icons-material';
import { db } from "../services/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

const TelegramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const InvoiceHistory = ({ currentUser }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'dateCreated',
    direction: 'desc'
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [users, setUsers] = useState({});
  const [productsMap, setProductsMap] = useState({});
  const [packagesMap, setPackagesMap] = useState({});
  const [catalogueMap, setCatalogueMap] = useState({});
  const [activeTab, setActiveTab] = useState('all');

  const [sendingInvoiceId, setSendingInvoiceId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (Object.keys(productsMap).length > 0 || Object.keys(packagesMap).length > 0 || Object.keys(catalogueMap).length > 0) {
      fetchInvoicesData();
      fetchUsers();
    }
  }, [productsMap, packagesMap, catalogueMap]);

  useEffect(() => {
    handleSearchAndFilter();
  }, [searchQuery, invoices, activeTab]);

  const fetchReferenceData = async () => {
    try {
      const productsSnap = await getDocs(collection(db, "products"));
      const prodMap = {};
      productsSnap.forEach(doc => {
        prodMap[doc.id] = doc.data().productName || '';
      });

      const packagesSnap = await getDocs(collection(db, "packageTypes"));
      const pkgMap = {};
      packagesSnap.forEach(doc => {
        pkgMap[doc.id] = doc.data().type || '';
      });

      const catalogueSnap = await getDocs(collection(db, "catalogue"));
      const catMap = {};
      catalogueSnap.forEach(doc => {
        catMap[doc.id] = doc.data();
      });

      setProductsMap(prodMap);
      setPackagesMap(pkgMap);
      setCatalogueMap(catMap);
    } catch (error) {
      console.error("Error fetching reference data:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = {};
      usersSnapshot.forEach(doc => {
        usersData[doc.id] = doc.data();
      });
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchInvoicesData = async () => {
    try {
      setLoading(true);

      const allInvoicesSnapshot = await getDocs(
        query(
          collection(db, "all-invoices"),
          orderBy('dateCreated', 'desc')
        )
      );

      const allInvoices = allInvoicesSnapshot.docs.map(invoiceDoc => {
        const invoiceData = invoiceDoc.data();

        const productName = invoiceData.productID_2
          ? productsMap[invoiceData.productID_2] || ''
          : '';
        const packageType = invoiceData.packageID
          ? packagesMap[invoiceData.packageID] || ''
          : '';

        return {
          id: invoiceDoc.id,
          clientId: invoiceData.clientId || '',
          clientOrgName: invoiceData.orgName || '',
          clientRestaurant: invoiceData.customRestaurantName || '',
          clientProductName: productName,
          clientPackageType: packageType,
          ...invoiceData
        };
      });

      setInvoices(allInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (timestamp) => {
    if (!timestamp) return '';
    let date;
    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const handleSearchAndFilter = () => {
    let filtered = invoices;

    if (activeTab !== 'all') {
      filtered = filtered.filter(invoice => invoice.paymentType === activeTab);
    }

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice => (
        invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
        invoice.clientRestaurant?.toLowerCase().includes(searchLower) ||
        invoice.clientOrgName?.toLowerCase().includes(searchLower) ||
        invoice.customRestaurantName?.toLowerCase().includes(searchLower) ||
        invoice.senderCompany?.toLowerCase().includes(searchLower) ||
        invoice.userName?.toLowerCase().includes(searchLower) ||
        invoice.clientProductName?.toLowerCase().includes(searchLower) ||
        invoice.clientPackageType?.toLowerCase().includes(searchLower) ||
        invoice.orgName?.toLowerCase().includes(searchLower)
      ));
    }

    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'dateCreated') {
        aValue = aValue?.seconds ? aValue.seconds : new Date(aValue).getTime() / 1000;
        bValue = bValue?.seconds ? bValue.seconds : new Date(bValue).getTime() / 1000;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredInvoices(filtered);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleRowExpansion = (invoiceId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSendToTelegram = async (invoiceId) => {
    if (sendingInvoiceId) return;
    if (!currentUser?.chatId) {
      setSnackbar({ open: true, message: 'Telegram не привязан к вашему аккаунту', severity: 'warning' });
      return;
    }

    setSendingInvoiceId(invoiceId);
    try {
      const response = await fetch('/api/send-invoice-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, userUid: currentUser.uID })
      });

      const result = await response.json();

      if (result.success) {
        setSnackbar({ open: true, message: 'Накладная отправлена в Telegram!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: result.error || 'Ошибка отправки', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ошибка сети. Попробуйте снова', severity: 'error' });
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <Box sx={{ width: 20, height: 20 }} />;
    }
    return sortConfig.direction === 'asc' ? <KeyboardArrowUp /> : <KeyboardArrowDown />;
  };

  const renderProductsCell = (invoice) => {
    if (invoice.products && Array.isArray(invoice.products) && invoice.products.length > 1) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box>
            <Typography variant="body2" fontWeight="600">
              {invoice.products.length} продуктов
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Смешанная накладная
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => toggleRowExpansion(invoice.id)}
            sx={{ ml: 'auto' }}
          >
            {expandedRows.has(invoice.id) ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      );
    }

    let productName = 'Неизвестный продукт';
    let packageType = 'Неизвестная упаковка';
    let gramm = '';
    let productCode = '';
    let comment = '';

    if (invoice.products && Array.isArray(invoice.products) && invoice.products.length === 1) {
      const product = invoice.products[0];

      if (invoice.type === 'standard' && product.catalogueItemID) {
        const catalogueItem = catalogueMap[product.catalogueItemID];
        if (catalogueItem) {
          productName = catalogueItem.productName || 'Неизвестный продукт';
          packageType = catalogueItem.packageType || 'Неизвестная упаковка';
          productCode = catalogueItem.productCode || '';
          comment = catalogueItem.comment || '';
          gramm = product.gramm;
        }
      } else {
        productName = productsMap[product.productID_2] || 'Неизвестный продукт';
        packageType = packagesMap[product.packageID] || 'Неизвестная упаковка';
        gramm = product.gramm;
      }
    } else {
      productName = invoice.clientProductName || 'Неизвестный продукт';
      packageType = invoice.clientPackageType || 'Неизвестная упаковка';
      gramm = invoice.gramm;
    }

    if (invoice.type === 'standard' && productCode) {
      return (
        <Box>
          <Typography variant="body2" fontWeight="600">
            {productName} ({productCode})
          </Typography>
          {comment && comment !== 'n/a' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {comment}
            </Typography>
          )}
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="body2" fontWeight="600">
          {productName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {productCode && `${productCode} • `}{packageType}{gramm ? ` • ${gramm} гр` : ''}
        </Typography>
      </Box>
    );
  };

  const renderQuantityCell = (invoice) => {
    if (invoice.products && Array.isArray(invoice.products) && invoice.products.length > 1) {
      return (
        <Box>
          <Typography variant="body2" fontWeight="600">
            Несколько товаров
          </Typography>
          <Typography variant="caption" color="text.secondary">
            См. детали
          </Typography>
        </Box>
      );
    }

    let quantity = 0;
    let price = 0;

    if (invoice.products && Array.isArray(invoice.products) && invoice.products.length === 1) {
      const product = invoice.products[0];
      quantity = product.quantity || 0;
      price = product.price || 0;
    } else {
      quantity = invoice.quantity || 0;
      price = invoice.price || 0;
    }

    return (
      <Box>
        <Typography variant="body2" fontWeight="600">
          {quantity.toLocaleString('ru-RU')} шт
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {price.toLocaleString('ru-RU')} сум
        </Typography>
      </Box>
    );
  };

  const renderExpandedProducts = (products, invoiceType) => {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
          Продукты в накладной:
        </Typography>
        {products.map((product, index) => {
          let productName = 'Неизвестный продукт';
          let packageType = 'Неизвестная упаковка';
          let productCode = '';
          let comment = '';

          if (invoiceType === 'standard' && product.catalogueItemID) {
            const catalogueItem = catalogueMap[product.catalogueItemID];
            if (catalogueItem) {
              productName = catalogueItem.productName || 'Неизвестный продукт';
              packageType = catalogueItem.packageType || 'Неизвестная упаковка';
              productCode = catalogueItem.productCode || '';
              comment = catalogueItem.comment || '';
            }
          } else {
            productName = productsMap[product.productID_2] || 'Неизвестный продукт';
            packageType = packagesMap[product.packageID] || 'Неизвестная упаковка';
          }

          return (
            <Card key={index} sx={{ mb: 1, backgroundColor: '#f8f9fa' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    {invoiceType === 'standard' && productCode ? (
                      <>
                        <Typography variant="body2" fontWeight="600">
                          {productName} ({productCode})
                        </Typography>
                        {comment && comment !== 'n/a' && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {comment}
                          </Typography>
                        )}
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" fontWeight="600">
                          {productName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {productCode && `${productCode} • `}{packageType} • {product.gramm} гр
                        </Typography>
                      </>
                    )}
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2">
                      {product.quantity?.toLocaleString('ru-RU')} шт × {product.price} сум
                    </Typography>
                    <Typography variant="body2" fontWeight="700" color="primary">
                      = {product.totalPrice?.toLocaleString('ru-RU')} сум
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  const getProductSummary = (invoice) => {
    if (invoice.products && Array.isArray(invoice.products) && invoice.products.length > 1) {
      return `${invoice.products.length} товаров`;
    }
    if (invoice.products && Array.isArray(invoice.products) && invoice.products.length === 1) {
      const product = invoice.products[0];
      if (invoice.type === 'standard' && product.catalogueItemID) {
        const catItem = catalogueMap[product.catalogueItemID];
        if (catItem) return catItem.productName;
      } else {
        return productsMap[product.productID_2] || 'Продукт';
      }
    }
    return invoice.clientProductName || 'Продукт';
  };

  // ─── MOBILE CARD LAYOUT ───────────────────────────────────────────────
  const renderMobileLayout = () => {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filteredInvoices.map((invoice) => (
          <Card
            key={invoice.id}
            sx={{
              borderRadius: 2,
              border: '1px solid #e0e0e0',
              boxShadow: 'none',
              '&:active': { backgroundColor: '#f5f5f5' }
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              {/* Top row: Date + Company chip */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Chip
                  label={invoice.senderCompany || 'White Ray'}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: invoice.senderCompany === 'Pure Pack' ? '#f3e5f5' : '#e0f2f1',
                    color: invoice.senderCompany === 'Pure Pack' ? '#7b1fa2' : '#00695c',
                  }}
                />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {formatDateShort(invoice.dateCreated)}
                </Typography>
              </Box>

              {/* Client name */}
              <Typography variant="body1" fontWeight={700} sx={{ mb: 0.25, lineHeight: 1.3 }}>
                {invoice.customRestaurantName || invoice.clientRestaurant}
              </Typography>
              {(invoice.clientOrgName || invoice.orgName) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {invoice.clientOrgName || invoice.orgName}
                </Typography>
              )}

              {/* Product summary + Amount row */}
              <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={1.5}>
                <Typography variant="body2" color="text.secondary">
                  {getProductSummary(invoice)}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="#04907F" sx={{ lineHeight: 1 }}>
                  {invoice.totalInvoiceAmount?.toLocaleString('ru-RU')} <Typography component="span" variant="caption" color="#04907F">сум</Typography>
                </Typography>
              </Box>

              {/* Expanded products for multi-product invoices */}
              {invoice.products && invoice.products.length > 1 && (
                <>
                  <Box
                    onClick={() => toggleRowExpansion(invoice.id)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', mb: expandedRows.has(invoice.id) ? 1 : 0 }}
                  >
                    <Typography variant="caption" color="primary" fontWeight={600}>
                      {expandedRows.has(invoice.id) ? 'Скрыть' : 'Подробнее'}
                    </Typography>
                    {expandedRows.has(invoice.id) ? <ExpandLess sx={{ fontSize: 16 }} color="primary" /> : <ExpandMore sx={{ fontSize: 16 }} color="primary" />}
                  </Box>
                  <Collapse in={expandedRows.has(invoice.id)}>
                    {renderExpandedProducts(invoice.products, invoice.type)}
                  </Collapse>
                </>
              )}

              {/* Telegram send button */}
              <Box
                onClick={() => handleSendToTelegram(invoice.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  mt: 1,
                  py: 1,
                  borderRadius: 1.5,
                  border: '1.5px solid #0088cc',
                  color: '#0088cc',
                  cursor: 'pointer',
                  opacity: (!currentUser?.chatId || sendingInvoiceId === invoice.id) ? 0.5 : 1,
                  pointerEvents: (!currentUser?.chatId || sendingInvoiceId) ? 'none' : 'auto',
                  '&:active': { backgroundColor: '#e3f2fd' }
                }}
              >
                {sendingInvoiceId === invoice.id ? (
                  <CircularProgress size={18} sx={{ color: '#0088cc' }} />
                ) : (
                  <>
                    <TelegramIcon />
                    <Typography variant="body2" fontWeight={600}>
                      Отправить в Telegram
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        ))}

        {filteredInvoices.length === 0 && !loading && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {searchQuery ? 'Накладные не найдены' : 'Накладные отсутствуют'}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // ─── DESKTOP TABLE LAYOUT ─────────────────────────────────────────────
  const renderDesktopLayout = () => {
    return (
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '40px' }}>
                  №
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  № Накладной
                </TableCell>
                <TableCell
                  sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                  onClick={() => handleSort('dateCreated')}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    Дата создания
                    {renderSortIcon('dateCreated')}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Клиент
                </TableCell>
                <TableCell
                  sx={{ color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                  onClick={() => handleSort('products')}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    Продукт
                    {renderSortIcon('products')}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Количество
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Общая сумма
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Компания-отправитель
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Создал
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold', width: '60px', textAlign: 'center' }}>
                  TG
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice, index) => (
                <React.Fragment key={invoice.id}>
                  <TableRow
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                      '&:hover': { backgroundColor: '#e3f2fd' }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="600" color="#1976d2">
                          {invoice.invoiceNumber}
                        </Typography>
                        {invoice.type === 'standard' && (
                          <Chip
                            label="Стандарт"
                            size="small"
                            sx={{
                              height: '20px',
                              fontSize: '0.7rem',
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              fontWeight: 600
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {formatDate(invoice.dateCreated)}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="600">
                          {invoice.customRestaurantName || invoice.clientRestaurant}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {invoice.clientOrgName || invoice.orgName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {renderProductsCell(invoice)}
                    </TableCell>
                    <TableCell>
                      {renderQuantityCell(invoice)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="600" color="primary">
                        {invoice.totalInvoiceAmount?.toLocaleString('ru-RU')} сум
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={invoice.senderCompany || 'White Ray'}
                        size="small"
                        color={invoice.senderCompany === 'Pure Pack' ? 'secondary' : 'primary'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {invoice.userName || users[invoice.userID]?.name || 'Неизвестный пользователь'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title={!currentUser?.chatId ? 'Telegram не привязан' : 'Отправить в Telegram'}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleSendToTelegram(invoice.id)}
                            disabled={!currentUser?.chatId || sendingInvoiceId === invoice.id}
                            sx={{
                              color: '#0088cc',
                              '&:hover': { backgroundColor: '#e3f2fd' },
                              '&.Mui-disabled': { color: '#bdbdbd' }
                            }}
                          >
                            {sendingInvoiceId === invoice.id ? (
                              <CircularProgress size={20} sx={{ color: '#0088cc' }} />
                            ) : (
                              <Send sx={{ fontSize: 20 }} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(invoice.id) && invoice.products && invoice.products.length > 1 && (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ py: 0 }}>
                        <Collapse in={expandedRows.has(invoice.id)}>
                          {renderExpandedProducts(invoice.products, invoice.type)}
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredInvoices.length === 0 && !loading && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {searchQuery ? 'Накладные не найдены' : 'Накладные отсутствуют'}
            </Typography>
            {searchQuery && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Попробуйте изменить поисковый запрос
              </Typography>
            )}
          </Box>
        )}
      </Paper>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth={isMobile ? 'sm' : 'xl'} sx={{ mt: isMobile ? 2 : 4, px: isMobile ? 1.5 : 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={isMobile ? 1 : 2} mb={isMobile ? 2 : 3}>
        <IconButton onClick={() => navigate('/invoices')} color="primary" size={isMobile ? 'small' : 'medium'}>
          <ArrowBack />
        </IconButton>
        <History color="primary" sx={{ fontSize: isMobile ? 24 : 32 }} />
        <Typography variant={isMobile ? 'h6' : 'h4'} color="primary">
          {isMobile ? 'История накладных' : 'История созданных накладных'}
        </Typography>
      </Box>

      {/* Info Card */}
      {!isMobile && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  Журнал всех созданных накладных
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Всего накладных: {invoices.length}
                </Typography>
              </Box>
              <Chip
                label={`Показано: ${filteredInvoices.length}`}
                color="primary"
                variant="outlined"
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Box mb={isMobile ? 1.5 : 3}>
        <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue)}
          centered={!isMobile}
          variant={isMobile ? 'fullWidth' : 'standard'}
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 1,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: isMobile ? '0.85rem' : '1rem',
              minHeight: isMobile ? 40 : 48,
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#078570',
            },
          }}
        >
          <Tab
            label="Все"
            value="all"
            sx={{
              color: activeTab === 'all' ? '#1976d2 !important' : 'text.primary',
              bgcolor: activeTab === 'all' ? '#e3f2fd' : 'transparent',
            }}
          />
          <Tab
            label="Наличные"
            value="cash"
            sx={{
              color: activeTab === 'cash' ? '#2e7d32 !important' : 'text.primary',
              bgcolor: activeTab === 'cash' ? '#e8f5e9' : 'transparent',
            }}
          />
          <Tab
            label="Перечисление"
            value="transfer"
            sx={{
              color: activeTab === 'transfer' ? '#078570 !important' : 'text.primary',
              bgcolor: activeTab === 'transfer' ? '#e3f2fd' : 'transparent',
            }}
          />
        </Tabs>
      </Box>

      {/* Search */}
      <Box mb={isMobile ? 1.5 : 3}>
        <TextField
          fullWidth
          variant="outlined"
          size={isMobile ? 'small' : 'medium'}
          placeholder={isMobile ? 'Поиск...' : 'Поиск по номеру накладной, клиенту, продукту, пользователю...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Mobile count chip */}
      {isMobile && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="caption" color="text.secondary">
            Всего: {invoices.length}
          </Typography>
          <Chip
            label={`Показано: ${filteredInvoices.length}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
      )}

      {/* Main content - switch between mobile and desktop */}
      {isMobile ? renderMobileLayout() : renderDesktopLayout()}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
export default InvoiceHistory;
