import React, { useState, useEffect } from 'react';
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
  Button,
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
  Tab
} from '@mui/material';
import {
  ArrowBack,
  Search,
  KeyboardArrowUp,
  KeyboardArrowDown,
  ExpandMore,
  ExpandLess,
  History
} from '@mui/icons-material';
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';

const InvoiceHistory = ({ onNavigateToInvoices }) => {
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
  const [activeTab, setActiveTab] = useState('cash'); // Default to 'cash' tab

  useEffect(() => {
    fetchReferenceData();
  }, []);

  useEffect(() => {
    if (Object.keys(productsMap).length > 0 || Object.keys(packagesMap).length > 0) {
      fetchInvoicesData();
      fetchUsers();
    }
  }, [productsMap, packagesMap]);

  useEffect(() => {
    handleSearchAndFilter();
  }, [searchQuery, invoices, activeTab]);

  const fetchReferenceData = async () => {
    try {
      // загрузка всех продуктов
      const productsSnap = await getDocs(collection(db, "products"));
      const prodMap = {};
      productsSnap.forEach(doc => {
        prodMap[doc.id] = doc.data().productName || '';
      });

      // загрузка всех упаковок
      const packagesSnap = await getDocs(collection(db, "packageTypes"));
      const pkgMap = {};
      packagesSnap.forEach(doc => {
        pkgMap[doc.id] = doc.data().type || '';
      });

      setProductsMap(prodMap);
      setPackagesMap(pkgMap);
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

      const clientsSnapshot = await getDocs(collection(db, "clients"));
      const allInvoices = [];

      // загружаем все invoices для каждого клиента
      const invoicesPromises = clientsSnapshot.docs.map(async (clientDoc) => {
        const clientData = clientDoc.data();

        const invoicesSnapshot = await getDocs(
          query(
            collection(db, `clients/${clientDoc.id}/invoices`),
            orderBy('dateCreated', 'desc')
          )
        );

        return invoicesSnapshot.docs.map(invoiceDoc => {
          const invoiceData = invoiceDoc.data();

          // Получаем продукт/упаковку из reference map
          const productName = invoiceData.productID_2
            ? productsMap[invoiceData.productID_2] || ''
            : '';
          const packageType = invoiceData.packageID
            ? packagesMap[invoiceData.packageID] || ''
            : '';

          return {
            id: invoiceDoc.id,
            clientId: clientDoc.id,
            clientOrgName: clientData.orgName || clientData.name || clientData.restaurant || '',
            clientRestaurant: clientData.name || clientData.restaurant || '',
            clientProductName: productName,
            clientPackageType: packageType,
            ...invoiceData
          };
        });
      });

      const resolved = await Promise.all(invoicesPromises);
      const flattened = resolved.flat();
      setInvoices(flattened);
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

  const handleSearchAndFilter = () => {
    let filtered = invoices;

    // Filter by paymentType based on active tab
    filtered = filtered.filter(invoice => invoice.paymentType === activeTab);

    // Apply search query
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
        invoice.clientPackageType?.toLowerCase().includes(searchLower)
      ));
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'dateCreated') {
        aValue = aValue?.seconds ? aValue.seconds : new Date(aValue).getTime() / 1000;
        bValue = bValue?.seconds ? bValue.seconds : new Date(bValue).getTime() / 1000;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
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

    if (invoice.products && Array.isArray(invoice.products) && invoice.products.length === 1) {
      const product = invoice.products[0];
      productName = productsMap[product.productID_2] || 'Неизвестный продукт';
      packageType = packagesMap[product.packageID] || 'Неизвестная упаковка';
      gramm = product.gramm;
    } else {
      productName = invoice.clientProductName || 'Неизвестный продукт';
      packageType = invoice.clientPackageType || 'Неизвестная упаковка';
      gramm = invoice.gramm;
    }

    return (
      <Box>
        <Typography variant="body2" fontWeight="600">
          {productName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {packageType}{gramm ? ` • ${gramm} гр` : ''}
        </Typography>
      </Box>
    );
  };

  const renderExpandedProducts = (products) => {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight="600" gutterBottom>
          Продукты в накладной:
        </Typography>
        {products.map((product, index) => {
          const productName = productsMap[product.productID_2] || 'Неизвестный продукт';
          const packageType = packagesMap[product.packageID] || 'Неизвестная упаковка';
          
          return (
            <Card key={index} sx={{ mb: 1, backgroundColor: '#f8f9fa' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" fontWeight="600">
                      {productName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {packageType} • {product.gramm} гр
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="body2">
                      {product.quantity?.toLocaleString('ru-RU')} шт × {product.price} сум
                    </Typography>
                    <Typography variant="body2" fontWeight="600" color="primary">
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

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={onNavigateToInvoices} color="primary">
          <ArrowBack />
        </IconButton>
        <History color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h4" color="primary">
          История созданных накладных
        </Typography>
      </Box>

      {/* Info Card */}
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

      {/* Tabs */}
      <Box mb={3}>
      <Tabs
          value={activeTab}
          onChange={(event, newValue) => setActiveTab(newValue)}
          centered
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 1,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#078570',
            },
          }}
        >
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
      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Поиск по номеру накладной, клиенту, продукту, пользователю..."
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

      {/* Table */}
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#3c7570ff' }}>
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
                  Общая сумма
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Компания-отправитель
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                  Создал
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <React.Fragment key={invoice.id}>
                  <TableRow
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                      '&:hover': { backgroundColor: '#e3f2fd' }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: '#1976d2' }}>
                      {invoice.invoiceNumber}
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
                          {invoice.clientOrgName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {renderProductsCell(invoice)}
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
                  </TableRow>
                  {expandedRows.has(invoice.id) && invoice.products && invoice.products.length > 1 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0 }}>
                        <Collapse in={expandedRows.has(invoice.id)}>
                          {renderExpandedProducts(invoice.products)}
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
    </Container>
  );
};

export default InvoiceHistory;