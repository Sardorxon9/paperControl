// AnalyticsV2.js - Modern Dashboard Version
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs
} from "firebase/firestore";
import { db } from "../services/firebase";
import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Fade,
  Grow,
  ToggleButtonGroup,
  ToggleButton
} from "@mui/material";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import Shield from '@mui/icons-material/Shield';
import Work from '@mui/icons-material/Work';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TimelineIcon from '@mui/icons-material/Timeline';
import BusinessIcon from '@mui/icons-material/Business';
import { subMonths, format, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfWeek } from "date-fns";
import { ru } from 'date-fns/locale';

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  ChartTooltip,
  Legend,
  Filler
);

export default function AnalyticsV2({ user, userRole, onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('2026');

  // Data states
  const [packageStats, setPackageStats] = useState({ stick: 0, sachet: 0, total: 0 });
  const [productStats, setProductStats] = useState({});
  const [paymentStats, setPaymentStats] = useState({ cash: 0, transfer: 0, total: 0 });
  const [topClients, setTopClients] = useState([]);
  const [senderCompanyStats, setSenderCompanyStats] = useState([]);
  const [topPaperUsageClients, setTopPaperUsageClients] = useState([]);
  const [dailyUsageData, setDailyUsageData] = useState([]);
  const [totalPaperBought, setTotalPaperBought] = useState(0);
  const dateRangeStart = subMonths(new Date(), 3);
  const dateRangeEnd = new Date();
  const [chartScale, setChartScale] = useState('daily');

  // Helper functions
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const matchesYearFilter = (date) => {
    if (yearFilter === 'all') return true;
    const year = date.getFullYear();
    return year.toString() === yearFilter;
  };

  // Fetch data
  const fetchClientData = async () => {
    try {
      const clientSnapshot = await getDocs(collection(db, "clients"));
      const clientList = [];
      let earliestDate = null;
      const dailyUsageMap = {};
      let totalPaperBoughtAmount = 0;

      const clientPaperUsage = await Promise.all(clientSnapshot.docs.map(async (clientDoc) => {
        const client = { id: clientDoc.id, ...clientDoc.data() };
        clientList.push(client);

        const logsRef = collection(db, "clients", clientDoc.id, "logs");
        const logSnapshot = await getDocs(logsRef);

        let totalPaperUsed = 0;

        logSnapshot.docs.forEach((logDoc) => {
          const log = logDoc.data();
          const logDate = log.date?.toDate ? log.date.toDate() : new Date(log.date);

          if (!earliestDate || logDate < earliestDate) {
            earliestDate = logDate;
          }

          if (log.actionType === 'paperOut') {
            if (matchesYearFilter(logDate)) {
              totalPaperUsed += log.amount || 0;
              const dateKey = format(logDate, 'yyyy-MM-dd');
              if (!dailyUsageMap[dateKey]) {
                dailyUsageMap[dateKey] = 0;
              }
              dailyUsageMap[dateKey] += log.amount || 0;
            }
          }

          if (log.actionType === 'paperIn' && matchesYearFilter(logDate)) {
            totalPaperBoughtAmount += log.amount || 0;
          }
        });

        return { ...client, totalUsed: totalPaperUsed };
      }));

      // Fetch product types
      const productTypesSnapshot = await getDocs(collection(db, "productTypes"));
      await Promise.all(productTypesSnapshot.docs.map(async (productTypeDoc) => {
        const logsRef = collection(db, "productTypes", productTypeDoc.id, "logs");
        const logSnapshot = await getDocs(logsRef);

        logSnapshot.docs.forEach((logDoc) => {
          const log = logDoc.data();
          const logDate = log.date?.toDate ? log.date.toDate() : new Date(log.date);

          if (!earliestDate || logDate < earliestDate) {
            earliestDate = logDate;
          }

          if (log.actionType === 'paperOut') {
            if (matchesYearFilter(logDate)) {
              const dateKey = format(logDate, 'yyyy-MM-dd');
              if (!dailyUsageMap[dateKey]) {
                dailyUsageMap[dateKey] = 0;
              }
              dailyUsageMap[dateKey] += log.amount || 0;
            }
          }

          if (log.actionType === 'paperIn' && matchesYearFilter(logDate)) {
            totalPaperBoughtAmount += log.amount || 0;
          }
        });
      }));

      // Fetch products and packages
      const productSnapshot = await getDocs(collection(db, "products"));
      const productMap = {};
      productSnapshot.docs.forEach((doc) => {
        productMap[doc.id] = doc.data().productName;
      });

      const packageSnapshot = await getDocs(collection(db, "packageTypes"));
      const packageMap = {};
      packageSnapshot.docs.forEach((doc) => {
        packageMap[doc.id] = doc.data().type;
      });

      // Package stats
      const stats = { stick: 0, sachet: 0, total: clientList.length };
      clientList.forEach((client) => {
        if (client.packageID === "sKHbhJ8Ik7QpVUCEgbpP") stats.stick++;
        else if (client.packageID === "fhLBOV7ai4N7MZDPkSCL") stats.sachet++;
      });

      // Product stats
      const productStats = {};
      clientList.forEach((client) => {
        const productName = productMap[client.productID_2] || "Неизвестный продукт";
        productStats[productName] = (productStats[productName] || 0) + 1;
      });

      // Fetch invoices
      const invoicesSnapshot = await getDocs(collection(db, "all-invoices"));
      const clientTotals = {};
      const paymentTotals = { cash: 0, transfer: 0 };
      const senderCompanyTotals = {};

      invoicesSnapshot.docs.forEach((doc) => {
        const invoice = doc.data();
        const invoiceDate = invoice.dateCreated?.toDate ? invoice.dateCreated.toDate() : new Date(invoice.dateCreated);

        if (!matchesYearFilter(invoiceDate)) return;

        const clientId = invoice.clientId;
        const totalAmount = invoice.totalInvoiceAmount || 0;
        const paymentType = invoice.paymentType;
        const senderCompany = invoice.senderCompany || "Неизвестная организация";

        if (clientId) {
          clientTotals[clientId] = (clientTotals[clientId] || 0) + totalAmount;
        }

        if (paymentType === "cash") {
          paymentTotals.cash += totalAmount;
        } else if (paymentType === "transfer") {
          paymentTotals.transfer += totalAmount;
        }

        senderCompanyTotals[senderCompany] = (senderCompanyTotals[senderCompany] || 0) + totalAmount;
      });

      const totalPayments = paymentTotals.cash + paymentTotals.transfer;

      const clientsWithTotals = Object.entries(clientTotals).map(([clientId, total]) => {
        const client = clientList.find(c => c.id === clientId);
        return {
          id: clientId,
          name: client?.name || "Неизвестный клиент",
          total: total
        };
      });

      const topClientsData = clientsWithTotals
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const senderCompanyData = Object.entries(senderCompanyTotals).map(([company, total]) => ({
        company,
        total
      })).sort((a, b) => b.total - a.total);

      const topPaperUsage = clientPaperUsage
        .filter(client => client.totalUsed > 0)
        .map(client => ({
          id: client.id,
          restaurant: client.name || client.restaurant || "Неизвестный клиент",
          orgName: client.orgName || "—",
          packageType: packageMap[client.packageID] || "—",
          productName: productMap[client.productID_2] || "—",
          totalUsed: parseFloat(client.totalUsed.toFixed(2))
        }))
        .sort((a, b) => b.totalUsed - a.totalUsed)
        .slice(0, 15);

      const dailyUsageArray = Object.entries(dailyUsageMap)
        .map(([date, amount]) => ({
          date,
          amount: parseFloat(amount.toFixed(2))
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setPackageStats(stats);
      setProductStats(productStats);
      setTopClients(topClientsData);
      setPaymentStats({
        cash: paymentTotals.cash,
        transfer: paymentTotals.transfer,
        total: totalPayments
      });
      setSenderCompanyStats(senderCompanyData);
      setTopPaperUsageClients(topPaperUsage);
      setDailyUsageData(dailyUsageArray);
      setTotalPaperBought(parseFloat(totalPaperBoughtAmount.toFixed(2)));
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [yearFilter]);

  // Chart configurations with better quality
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 4,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 13, family: 'Inter, system-ui, sans-serif', weight: '500' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        bodyFont: { size: 13, family: 'Inter, system-ui, sans-serif' },
        titleFont: { size: 14, weight: '600', family: 'Inter, system-ui, sans-serif' },
        cornerRadius: 8,
        displayColors: true,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
      }
    }
  };

  const packageChartData = {
    labels: ['Стик', 'Сашет'],
    datasets: [{
      data: [packageStats.stick, packageStats.sachet],
      backgroundColor: ['#6366f1', '#8b5cf6'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  };

  const productChartData = {
    labels: Object.keys(productStats),
    datasets: [{
      data: Object.values(productStats),
      backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  };

  const paymentChartData = {
    labels: ['Наличные', 'Перечисление'],
    datasets: [{
      data: [paymentStats.cash, paymentStats.transfer],
      backgroundColor: ['#10b981', '#f59e0b'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  };

  // Filter and aggregate daily usage data
  const aggregateDataByScale = (data, scale) => {
    const aggregated = {};
    data.forEach(item => {
      const itemDate = new Date(item.date);
      let key;
      switch (scale) {
        case 'weekly':
          key = format(startOfWeek(itemDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          break;
        case 'monthly':
          key = format(startOfMonth(itemDate), 'yyyy-MM-dd');
          break;
        case 'daily':
        default:
          key = item.date;
          break;
      }
      if (!aggregated[key]) aggregated[key] = 0;
      aggregated[key] += item.amount;
    });
    return Object.entries(aggregated)
      .map(([date, amount]) => ({ date, amount: parseFloat(amount.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const formatChartLabel = (dateStr, scale) => {
    const date = new Date(dateStr);
    switch (scale) {
      case 'weekly':
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(date, 'dd.MM')} - ${format(weekEnd, 'dd.MM.yyyy')}`;
      case 'monthly':
        return format(date, 'LLLL yyyy', { locale: ru });
      case 'daily':
      default:
        return format(date, 'dd.MM.yyyy');
    }
  };

  const filteredDailyUsage = dailyUsageData.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= startOfDay(dateRangeStart) && itemDate <= endOfDay(dateRangeEnd);
  });

  const aggregatedUsageData = aggregateDataByScale(filteredDailyUsage, chartScale);

  const dailyUsageChartData = {
    labels: aggregatedUsageData.map(item => formatChartLabel(item.date, chartScale)),
    datasets: [{
      label: 'Расход бумаги (кг)',
      data: aggregatedUsageData.map(item => item.amount),
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      fill: true,
      tension: 0.4,
      borderWidth: 3,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#6366f1'
    }]
  };

  const dailyUsageChartOptions = {
    ...chartOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: {
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          callback: (value) => value + ' кг'
        }
      }
    }
  };

  const topClientsChartData = {
    labels: topClients.map(c => c.name),
    datasets: [{
      label: 'Сумма счетов',
      data: topClients.map(c => c.total),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  const topClientsChartOptions = {
    ...chartOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.03)' },
        ticks: {
          font: { size: 12, family: 'Inter, system-ui, sans-serif' },
          callback: (value) => formatNumber(value)
        }
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 13, family: 'Inter, system-ui, sans-serif' }
        }
      }
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: 'white',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          px: { xs: 2, sm: 4 },
          py: 2
        }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box sx={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              <img
                src="https://whiteray.uz/images/whiteray_1200px_logo_green.png"
                alt="WhiteRay"
                style={{ height: 32, objectFit: 'contain' }}
              />
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/')}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                Назад
              </Button>

              <Box
                display="flex"
                alignItems="center"
                gap={1.5}
                px={2}
                py={1}
                bgcolor="grey.50"
                borderRadius={2}
              >
                {userRole === 'admin' ? <Shield sx={{ fontSize: 20, color: 'primary.main' }} /> : <Work sx={{ fontSize: 20, color: 'success.main' }} />}
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {user?.name || 'Пользователь'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {userRole === 'admin' ? 'Администратор' : 'Сотрудник'}
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={onLogout}
                sx={{ textTransform: 'none' }}
              >
                Выйти
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Page Title & Filter */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Аналитика
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Статистика и отчеты по работе
              </Typography>
            </Box>

            <ToggleButtonGroup
              value={yearFilter}
              exclusive
              onChange={(_, newValue) => {
                if (newValue !== null) setYearFilter(newValue);
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 2.5,
                  py: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  '&.Mui-selected': {
                    bgcolor: '#6366f1',
                    color: 'white',
                    borderColor: '#6366f1',
                    '&:hover': {
                      bgcolor: '#5558e3'
                    }
                  }
                }
              }}
            >
              <ToggleButton value="all">Все время</ToggleButton>
              <ToggleButton value="2026">2026</ToggleButton>
              <ToggleButton value="2025">2025</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress size={60} sx={{ color: '#6366f1' }} />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* KPI Cards */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Grow in timeout={300}>
                  <Card sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Всего клиентов
                          </Typography>
                          <Typography variant="h3" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
                            {packageStats.total}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <TrendingUpIcon sx={{ fontSize: 16 }} />
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              Активные
                            </Typography>
                          </Stack>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                          <PeopleIcon sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Grow in timeout={400}>
                  <Card sx={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    borderRadius: 3
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Стик упаковка
                          </Typography>
                          <Typography variant="h3" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
                            {packageStats.stick}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {packageStats.total > 0 ? Math.round((packageStats.stick / packageStats.total) * 100) : 0}% от всех
                          </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                          <InventoryIcon sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Grow in timeout={500}>
                  <Card sx={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white',
                    borderRadius: 3
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                            Сашет упаковка
                          </Typography>
                          <Typography variant="h3" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
                            {packageStats.sachet}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {packageStats.total > 0 ? Math.round((packageStats.sachet / packageStats.total) * 100) : 0}% от всех
                          </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                          <ShoppingCartIcon sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Grow in timeout={600}>
                  <Card sx={{
                    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    color: 'white',
                    borderRadius: 3
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {yearFilter === 'all' ? 'Приход бумаги' : `Приход ${yearFilter}`}
                          </Typography>
                          <Typography variant="h3" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
                            {totalPaperBought}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            КГ куплено
                          </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                          <TrendingDownIcon sx={{ fontSize: 28 }} />
                        </Avatar>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            </Grid>

            {/* Charts Row 1 - Donut Charts */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Fade in timeout={700}>
                  <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Распределение клиентов
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        По типам упаковки
                      </Typography>
                      <Box sx={{ height: 280 }}>
                        <Doughnut data={packageChartData} options={chartOptions} />
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>

              <Grid item xs={12} md={4}>
                <Fade in timeout={800}>
                  <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        По продуктам
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Распределение клиентов
                      </Typography>
                      <Box sx={{ height: 280 }}>
                        <Doughnut data={productChartData} options={chartOptions} />
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>

              <Grid item xs={12} md={4}>
                <Fade in timeout={900}>
                  <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {yearFilter === 'all' ? 'Форма оплаты' : `Оплата ${yearFilter}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {formatNumber(paymentStats.total)} сум
                      </Typography>
                      <Box sx={{ height: 280 }}>
                        <Doughnut data={paymentChartData} options={chartOptions} />
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            </Grid>

            {/* Top Clients Bar Chart */}
            <Fade in timeout={1000}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#6366f1', width: 40, height: 40 }}>
                      <AttachMoneyIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {yearFilter === 'all' ? 'Топ 10 клиентов' : `Топ 10 клиентов ${yearFilter}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        По сумме накладных
                      </Typography>
                    </Box>
                  </Stack>
                  <Box sx={{ height: 450 }}>
                    <Bar data={topClientsChartData} options={topClientsChartOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Fade>

            {/* Paper Usage Chart */}
            <Fade in timeout={1100}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#8b5cf6', width: 40, height: 40 }}>
                      <TimelineIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {yearFilter === 'all' ? 'Расход бумаги' : `Расход бумаги ${yearFilter}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Все клиенты
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                    {['daily', 'weekly', 'monthly'].map((scale) => (
                      <Chip
                        key={scale}
                        label={scale === 'daily' ? 'День' : scale === 'weekly' ? 'Неделя' : 'Месяц'}
                        onClick={() => setChartScale(scale)}
                        variant={chartScale === scale ? 'filled' : 'outlined'}
                        sx={{
                          bgcolor: chartScale === scale ? '#6366f1' : 'transparent',
                          color: chartScale === scale ? 'white' : 'text.secondary',
                          borderColor: chartScale === scale ? '#6366f1' : 'divider',
                          fontWeight: 600,
                          '&:hover': {
                            bgcolor: chartScale === scale ? '#5558e3' : 'action.hover'
                          }
                        }}
                      />
                    ))}
                  </Stack>

                  <Box sx={{ height: 400 }}>
                    <Line data={dailyUsageChartData} options={dailyUsageChartOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Fade>

            {/* Top Paper Usage Clients */}
            <Fade in timeout={1200}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {yearFilter === 'all' ? 'Топ 15 по расходу' : `Топ 15 расхода ${yearFilter}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Клиенты с наибольшим расходом бумаги
                  </Typography>

                  <Grid container spacing={2}>
                    {topPaperUsageClients.map((client, index) => (
                      <Grid item xs={12} sm={6} md={4} lg={2.4} key={client.id}>
                        <Card sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: index < 3 ? '#6366f1' : 'divider',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.15)',
                            borderColor: '#6366f1'
                          }
                        }}>
                          <Stack spacing={1.5}>
                            <Chip
                              label={`#${index + 1}`}
                              size="small"
                              sx={{
                                bgcolor: index < 3 ? '#6366f1' : 'grey.100',
                                color: index < 3 ? 'white' : 'text.secondary',
                                fontWeight: 700,
                                width: 'fit-content'
                              }}
                            />
                            <Box>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {client.restaurant}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {client.orgName}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              <Chip label={client.packageType} size="small" sx={{ fontSize: '0.7rem' }} />
                              <Chip label={client.productName} size="small" color="secondary" sx={{ fontSize: '0.7rem' }} />
                            </Stack>
                            <Box sx={{
                              mt: 1,
                              pt: 1.5,
                              borderTop: '1px solid',
                              borderColor: 'divider',
                              textAlign: 'center'
                            }}>
                              <Typography variant="h6" fontWeight={700} color="primary">
                                {client.totalUsed} КГ
                              </Typography>
                            </Box>
                          </Stack>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Fade>

            {/* Sender Company Stats */}
            <Fade in timeout={1300}>
              <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 4 }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                    <Avatar sx={{ bgcolor: '#10b981', width: 40, height: 40 }}>
                      <BusinessIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        {yearFilter === 'all' ? 'По организациям' : `Организации ${yearFilter}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Накладные по компаниям
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={2}>
                    {senderCompanyStats.map((item, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'grey.50',
                            borderColor: '#6366f1'
                          }
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body1" fontWeight={600}>
                            {item.company}
                          </Typography>
                          <Typography variant="h6" fontWeight={700} color="primary">
                            {formatNumber(item.total)} сум
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
