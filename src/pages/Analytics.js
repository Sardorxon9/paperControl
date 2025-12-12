// Analytics.js
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
  Card
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
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import ClientUsageHistoryModal from '../components/modals/ClientUsageHistoryModal';
import Shield from '@mui/icons-material/Shield';
import Work from '@mui/icons-material/Work';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper as MuiPaper, Tooltip as MuiTooltip, IconButton, ToggleButtonGroup, ToggleButton
} from "@mui/material";
import { ArrowDownward, ArrowUpward, ViewModule, ViewList } from "@mui/icons-material";
import { subDays, subMonths, format, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { ru } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';



ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics({ user, userRole, onLogout }) {
  const navigate = useNavigate();
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productStats, setProductStats] = useState({});
  const [topClients, setTopClients] = useState([]);
  const [paymentStats, setPaymentStats] = useState({
    cash: 0,
    transfer: 0,
    total: 0
  });
  const [senderCompanyStats, setSenderCompanyStats] = useState([]);

  const [packageStats, setPackageStats] = useState({
    stick: 0,
    sachet: 0,
    total: 0
  });
  const [topPaperUsageClients, setTopPaperUsageClients] = useState([]);
  const [paperUsageModalOpen, setPaperUsageModalOpen] = useState(false);
  const [selectedClientForUsage, setSelectedClientForUsage] = useState(null);
  const [earliestLogDate, setEarliestLogDate] = useState(null);
  const [dailyUsageData, setDailyUsageData] = useState([]);
  const [dateRangeStart, setDateRangeStart] = useState(subMonths(new Date(), 3));
  const [dateRangeEnd, setDateRangeEnd] = useState(new Date());
  const [logsPage, setLogsPage] = useState(0);
  const [logsPerPage] = useState(20);
  const [chartScale, setChartScale] = useState('daily'); // daily, weekly, monthly
  const [paperUsageView, setPaperUsageView] = useState('cards'); // 'cards' or 'table'

  // Helper function to format numbers with spaces
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Handle opening client usage history modal
  const handleOpenUsageModal = (client) => {
    setSelectedClientForUsage(client);
    setPaperUsageModalOpen(true);
  };

  const handleCloseUsageModal = () => {
    setPaperUsageModalOpen(false);
    setSelectedClientForUsage(null);
  };

  // Fetch client data
  const fetchClientData = async () => {
    try {
      // --- Fetch Clients ---
      const clientSnapshot = await getDocs(collection(db, "clients"));
      const clientList = [];
      const logsList = [];
      const thirtyDaysAgo = subDays(new Date(), 30);
      let earliestDate = null;
      const dailyUsageMap = {};

      // --- Iterate through Clients ---
      const clientPaperUsage = await Promise.all(clientSnapshot.docs.map(async (clientDoc) => {
        const client = { id: clientDoc.id, ...clientDoc.data() };
        clientList.push(client);

        const logsRef = collection(db, "clients", clientDoc.id, "logs");
        const logSnapshot = await getDocs(logsRef);

        let totalPaperUsed = 0;

        logSnapshot.docs.forEach((logDoc) => {
          const log = logDoc.data();
          const logDate = log.date?.toDate ? log.date.toDate() : new Date(log.date);

          // Track earliest log date
          if (!earliestDate || logDate < earliestDate) {
            earliestDate = logDate;
          }

          // Calculate paper usage (only paperOut actions)
          if (log.actionType === 'paperOut') {
            totalPaperUsed += log.amount || 0;

            // Track daily usage for the chart
            const dateKey = format(logDate, 'yyyy-MM-dd');
            if (!dailyUsageMap[dateKey]) {
              dailyUsageMap[dateKey] = 0;
            }
            dailyUsageMap[dateKey] += log.amount || 0;
          }

          // Collect logs from last 30 days
          if (logDate >= thirtyDaysAgo) {
            logsList.push({
              date: logDate,
              restaurantName: client.name || "—",
              actionType: log.actionType,
              amount: log.amount,
            });
          }
        });

        return {
          ...client,
          totalUsed: totalPaperUsed
        };
      }));

      // --- Fetch ProductTypes and their logs (standard papers) ---
      const productTypesSnapshot = await getDocs(collection(db, "productTypes"));
      const productTypesList = [];

      await Promise.all(productTypesSnapshot.docs.map(async (productTypeDoc) => {
        const productType = { id: productTypeDoc.id, ...productTypeDoc.data() };
        productTypesList.push(productType);

        const logsRef = collection(db, "productTypes", productTypeDoc.id, "logs");
        const logSnapshot = await getDocs(logsRef);

        logSnapshot.docs.forEach((logDoc) => {
          const log = logDoc.data();
          const logDate = log.date?.toDate ? log.date.toDate() : new Date(log.date);

          // Track earliest log date
          if (!earliestDate || logDate < earliestDate) {
            earliestDate = logDate;
          }

          // Calculate paper usage (only paperOut actions)
          if (log.actionType === 'paperOut') {
            // Track daily usage for the chart
            const dateKey = format(logDate, 'yyyy-MM-dd');
            if (!dailyUsageMap[dateKey]) {
              dailyUsageMap[dateKey] = 0;
            }
            dailyUsageMap[dateKey] += log.amount || 0;
          }

          // Collect logs from last 30 days
          if (logDate >= thirtyDaysAgo) {
            logsList.push({
              date: logDate,
              restaurantName: productType.name || "Стандартная бумага",
              actionType: log.actionType,
              amount: log.amount,
              isProductType: true
            });
          }
        });
      }));

      // --- Fetch Products ---
      const productSnapshot = await getDocs(collection(db, "products"));
      const productMap = {};
      productSnapshot.docs.forEach((doc) => {
        productMap[doc.id] = doc.data().productName;
      });

      // --- Fetch Package Types ---
      const packageSnapshot = await getDocs(collection(db, "packageTypes"));
      const packageMap = {};
      packageSnapshot.docs.forEach((doc) => {
        packageMap[doc.id] = doc.data().type;
      });

      // --- Package Stats ---
      const stats = { stick: 0, sachet: 0, total: clientList.length };
      clientList.forEach((client) => {
        if (client.packageID === "sKHbhJ8Ik7QpVUCEgbpP") stats.stick++;
        else if (client.packageID === "fhLBOV7ai4N7MZDPkSCL") stats.sachet++;
      });

      // --- Product Stats ---
      const productStats = {};
      clientList.forEach((client) => {
        const productName = productMap[client.productID_2] || "Неизвестный продукт";
        productStats[productName] = (productStats[productName] || 0) + 1;
      });

      // --- Fetch Invoices for Payment Stats and Sender Company Stats ---
      const invoicesSnapshot = await getDocs(collection(db, "all-invoices"));
      const clientTotals = {};
      const paymentTotals = { cash: 0, transfer: 0 };
      const senderCompanyTotals = {};

      invoicesSnapshot.docs.forEach((doc) => {
        const invoice = doc.data();
        const clientId = invoice.clientId;
        const totalAmount = invoice.totalInvoiceAmount || 0;
        const paymentType = invoice.paymentType;
        const senderCompany = invoice.senderCompany || "Неизвестная организация";

        // Client totals
        if (clientId) {
          clientTotals[clientId] = (clientTotals[clientId] || 0) + totalAmount;
        }

        // Payment type totals
        if (paymentType === "cash") {
          paymentTotals.cash += totalAmount;
        } else if (paymentType === "transfer") {
          paymentTotals.transfer += totalAmount;
        }

        // Sender company totals
        senderCompanyTotals[senderCompany] = (senderCompanyTotals[senderCompany] || 0) + totalAmount;
      });

      const totalPayments = paymentTotals.cash + paymentTotals.transfer;

      // Create array of clients with totals and sort
      const clientsWithTotals = Object.entries(clientTotals).map(([clientId, total]) => {
        const client = clientList.find(c => c.id === clientId);
        return {
          id: clientId,
          name: client?.name || "Неизвестный клиент",
          total: total
        };
      });

      // Sort by total (highest first) and get top 10
      const topClientsData = clientsWithTotals
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Create array of sender companies with totals
      const senderCompanyData = Object.entries(senderCompanyTotals).map(([company, total]) => ({
        company,
        total
      })).sort((a, b) => b.total - a.total);

      // --- Sort logs (latest first) ---
      logsList.sort((a, b) => b.date - a.date);

      // --- Calculate Top 15 Paper Usage Clients ---
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

      // --- Prepare Daily Usage Data for Chart ---
      const dailyUsageArray = Object.entries(dailyUsageMap)
        .map(([date, amount]) => ({
          date,
          amount: parseFloat(amount.toFixed(2))
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // --- Set State ---
      setPackageStats(stats);
      setProductStats(productStats);
      setRecentLogs(logsList);
      setTopClients(topClientsData);
      setPaymentStats({
        cash: paymentTotals.cash,
        transfer: paymentTotals.transfer,
        total: totalPayments
      });
      setSenderCompanyStats(senderCompanyData);
      setTopPaperUsageClients(topPaperUsage);
      setEarliestLogDate(earliestDate);
      setDailyUsageData(dailyUsageArray);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, []);

  // Prepare data for the donut chart
  const chartData = {
    labels: ['Стик', 'Сашет'],
    datasets: [
      {
        data: [packageStats.stick, packageStats.sachet],
        backgroundColor: ['#0F9D8C', '#4285F4'],
        borderColor: ['#0c7a6e', '#3367d6'],
        borderWidth: 2,
      },
    ],
  };

 const chartOptions = {
  cutout: '70%',
  devicePixelRatio: 3,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 20,
        font: { 
          size: 16,
          family: 'system-ui, -apple-system, sans-serif'
        }
      }
    },
    tooltip: {
      bodyFont: { size: 14 },
      titleFont: { size: 15 },
      callbacks: {
        label: function(context) {
          const label = context.label || '';
          const value = context.raw || 0;
          const percentage = Math.round((value / packageStats.total) * 100);
          return `${label}: ${value} (${percentage}%)`;
        }
      }
    }
  },
  maintainAspectRatio: false
};

  const productChartData = {
    labels: Object.keys(productStats),
    datasets: [
      {
        data: Object.values(productStats),
        backgroundColor: ['#0F9D8C', '#4285F4', '#F4B400', '#DB4437', '#0F9D58'],
        borderColor: ['#0c7a6e', '#3367d6', '#c69c04', '#c1351a', '#0c7a40'],
        borderWidth: 2,
      },
    ],
  };

 const productChartOptions = {
  devicePixelRatio: 3,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 20,
        font: { 
          size: 14,
          family: 'system-ui, -apple-system, sans-serif'
        }
      }
    },
    tooltip: {
      bodyFont: { size: 14 },
      titleFont: { size: 15 },
      callbacks: {
        label: function(context) {
          const label = context.label || '';
          const value = context.raw || 0;
          const percentage = Math.round((value / packageStats.total) * 100);
          return `${label}: ${value} (${percentage}%)`;
        }
      }
    }
  },
  maintainAspectRatio: false
};

  // Payment Stats Chart Data
  const paymentChartData = {
    labels: ['Наличные', 'Перечисление'],
    datasets: [
      {
        data: [paymentStats.cash, paymentStats.transfer],
        backgroundColor: ['#34A853', '#FBBC04'],
        borderColor: ['#2d8e47', '#d99e00'],
        borderWidth: 2,
      },
    ],
  };

  const paymentChartOptions = {
    cutout: '70%',
    devicePixelRatio: 3,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: { 
            size: 16,
            family: 'system-ui, -apple-system, sans-serif'
          }
        }
      },
      tooltip: {
        bodyFont: { size: 14 },
        titleFont: { size: 15 },
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const percentage = paymentStats.total > 0 
              ? Math.round((value / paymentStats.total) * 100) 
              : 0;
            return `${label}: ${formatNumber(value)} сум (${percentage}%)`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };

  // Top Clients Bar Chart Data
  const topClientsChartData = {
    labels: topClients.map(c => c.name),
    datasets: [
      {
        label: 'Сумма счетов',
        data: topClients.map(c => c.total),
        backgroundColor: '#0c7a6e',
        borderColor: '#0c7a6e',
        borderWidth: 1,
      },
    ],
  };

 // Aggregate data by scale (daily, weekly, monthly)
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

      if (!aggregated[key]) {
        aggregated[key] = 0;
      }
      aggregated[key] += item.amount;
    });

    return Object.entries(aggregated)
      .map(([date, amount]) => ({ date, amount: parseFloat(amount.toFixed(2)) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Format labels based on scale
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

 // Filter daily usage data by date range
  const filteredDailyUsage = dailyUsageData.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= startOfDay(dateRangeStart) && itemDate <= endOfDay(dateRangeEnd);
  });

  // Aggregate by selected scale
  const aggregatedUsageData = aggregateDataByScale(filteredDailyUsage, chartScale);

  // Daily Usage Line Chart Data
  const dailyUsageChartData = {
    labels: aggregatedUsageData.map(item => formatChartLabel(item.date, chartScale)),
    datasets: [
      {
        label: 'Расход бумаги (кг)',
        data: aggregatedUsageData.map(item => item.amount),
        borderColor: '#0F9D8C',
        backgroundColor: 'rgba(15, 157, 140, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#0F9D8C',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const dailyUsageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 3,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        bodyFont: { size: 14 },
        titleFont: { size: 15, weight: 'bold' },
        callbacks: {
          label: function(context) {
            return `Расход: ${context.raw} кг`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45,
          maxTicksLimit: 15
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 12 },
          callback: function(value) {
            return value + ' кг';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };

 const topClientsChartOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  devicePixelRatio: 3,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      bodyFont: { size: 14 },
      titleFont: { size: 15 },
      callbacks: {
        label: function(context) {
          return `${formatNumber(context.raw)} сум`;
        }
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        font: { size: 13 },
        callback: function(value) {
          return formatNumber(value);
        }
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    y: {
      ticks: {
        font: { size: 14 }
      },
      grid: {
        display: false
      }
    }
  }
};

  // Custom center text plugin
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: (chart) => {
    if (chart.config.type === 'doughnut') {
      const { ctx, chartArea: { left, right, top, bottom } } = chart;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;

      ctx.save();
      
      // Check if this is the payment chart by looking at the data
      const isPaymentChart = chart.data.labels && 
        (chart.data.labels.includes('Наличные') || chart.data.labels.includes('Перечисление'));
      
      if (isPaymentChart) {
        // Payment chart - show total with "сум"
        ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatNumber(paymentStats.total), centerX, centerY - 15);

        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('Всего накладных', centerX, centerY + 15);
        
        ctx.font = '13px system-ui, -apple-system, sans-serif';
        ctx.fillText('сум', centerX, centerY + 35);
      } else {
        // Package chart - show total clients
        ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(packageStats.total.toString(), centerX, centerY - 15);

        ctx.font = '16px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('Всего клиентов', centerX, centerY + 20);
      }
      
      ctx.restore();
    }
  }
};

  return (
  <>
    {/* Header */}
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        bgcolor: '#fff',
        boxShadow: '0 2px 8px -2px rgba(0,0,0,.12)',
        px: { xs: 2, sm: 4, md: 6 },
        py: 1.5,
        mb: 3,
      }}
    >
      <Container maxWidth={false} sx={{ maxWidth: "2000px" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box
            sx={{
              cursor: 'pointer',
              "&:hover": { opacity: 0.8 }
            }}
            onClick={() => navigate('/')}
          >
            <img
              src="https://whiteray.uz/images/whiteray_1200px_logo_green.png"
              alt="WhiteRay"
              style={{ height: 34, objectFit: 'contain' }}
            />
          </Box>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              sx={{
                color: '#0F9D8C',
                borderColor: '#0F9D8C',
                '&:hover': {
                  borderColor: '#0c7a6e',
                  backgroundColor: 'rgba(15, 157, 140, 0.04)'
                }
              }}
            >
              Назад
            </Button>

            <Box
              display="flex"
              alignItems="center"
              gap={1}
              px={2}
              py={0.8}
              bgcolor="#f5f5f5"
              borderRadius={2}
            >
              {userRole === 'admin' ? <Shield color="primary" /> : <Work color="success" />}
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
              sx={{
                fontSize: '0.8rem',
                px: 2,
                py: 0.6,
                textTransform: 'none',
                borderRadius: 2
              }}
            >
              Выйти
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>

    <Container maxWidth={false} sx={{ maxWidth: "2000px", py: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 5 }}>
        Аналитика
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Stack spacing={5}>
          {/* 1st Container - 3 Stats Cards */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #0F9D8C 0%, #0c7a6e 100%)',
                    color: 'white',
                    borderRadius: 3,
                    p: 3,
                    height: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Всего клиентов
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {packageStats.total}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                    Общее количество клиентов
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    backgroundColor: '#E2F0EE',
                    borderRadius: 3,
                    p: 3,
                    height: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" gutterBottom color="#065345">
                    Стик упаковка
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="#065345">
                    {packageStats.stick}
                  </Typography>
                  <Typography variant="body2" color="#527975" sx={{ mt: 1 }}>
                    {packageStats.total > 0 ? Math.round((packageStats.stick / packageStats.total) * 100) : 0}% от всех
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    backgroundColor: '#E8F0FE',
                    borderRadius: 3,
                    p: 3,
                    height: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" gutterBottom color="#174EA6">
                    Сашет упаковка
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="#174EA6">
                    {packageStats.sachet}
                  </Typography>
                  <Typography variant="body2" color="#5F7A9B" sx={{ mt: 1 }}>
                    {packageStats.total > 0 ? Math.round((packageStats.sachet / packageStats.total) * 100) : 0}% от всех
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* 2nd Container - Three Donut Charts */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Распределение клиентов по типам упаковки
                  </Typography>
                  <Box sx={{ position: 'relative', height: 350, mt: 2 }}>
                    <Doughnut data={chartData} options={chartOptions} plugins={[centerTextPlugin]} />
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Распределение клиентов по продуктам
                  </Typography>
                  <Box sx={{ position: 'relative', height: 350, mt: 2 }}>
                    <Doughnut data={productChartData} options={productChartOptions} />
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Форма оплаты
                  </Typography>
                  <Box sx={{ position: 'relative', height: 350, mt: 2 }}>
                    <Doughnut data={paymentChartData} options={paymentChartOptions} plugins={[centerTextPlugin]} />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Top 10 Clients by Invoice Amount - Full Width */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Топ 10 клиентов по сумме накладных
            </Typography>
            <Box sx={{ position: 'relative', height: 500, mt: 3 }}>
              <Bar data={topClientsChartData} options={topClientsChartOptions} />
            </Box>
          </Card>

          {/* Top 15 Paper Usage Clients - Full Width */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Топ 15 клиентов по расходу бумаги
                </Typography>
                {earliestLogDate && (
                  <Typography variant="caption" color="text.secondary">
                    С {format(earliestLogDate, 'dd.MM.yyyy', { locale: ru })} ({format(earliestLogDate, 'LLLL', { locale: ru })})
                  </Typography>
                )}
              </Box>

              {/* View Toggle */}
              <ToggleButtonGroup
                value={paperUsageView}
                exclusive
                onChange={(e, newView) => {
                  if (newView !== null) setPaperUsageView(newView);
                }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.75,
                    minWidth: '40px',
                    color: '#666',
                    borderColor: '#ddd',
                    '&.Mui-selected': {
                      bgcolor: '#424242',
                      color: '#fff',
                      borderColor: '#424242',
                      '&:hover': {
                        bgcolor: '#333'
                      }
                    },
                    '&:hover': {
                      bgcolor: '#f5f5f5'
                    }
                  }
                }}
              >
                <ToggleButton value="cards">
                  <ViewModule sx={{ fontSize: 20 }} />
                </ToggleButton>
                <ToggleButton value="table">
                  <ViewList sx={{ fontSize: 20 }} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {topPaperUsageClients.length > 0 ? (
              <>
                {/* Cards View */}
                {paperUsageView === 'cards' && (
                  <Grid container spacing={2}>
                    {topPaperUsageClients.map((client, index) => (
                      <Grid item xs={12} sm={6} md={4} lg={2.4} key={client.id}>
                        <MuiTooltip
                          title={`Нажмите для просмотра истории расхода`}
                          arrow
                          placement="top"
                        >
                          <Box
                            onClick={() => handleOpenUsageModal(client)}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: '#f9f9f9',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              border: '1px solid #e0e0e0',
                              height: '70%',
                              minHeight: '200px',
                              display: 'flex',
                              flexDirection: 'column',
                              '&:hover': {
                                bgcolor: '#E2F0EE',
                                borderColor: '#0F9D8C',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(15, 157, 140, 0.15)'
                              }
                            }}
                          >
                            {/* Rank Badge */}
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: index < 3 ? '#0F9D8C' : '#e0e0e0',
                                color: index < 3 ? '#fff' : '#666',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.875rem',
                                mb: 1.5
                              }}
                            >
                              {index + 1}
                            </Box>

                            {/* Client Name */}
                            <MuiTooltip title={client.restaurant} arrow placement="top">
                              <Typography
                                variant="body2"
                                fontWeight="600"
                                sx={{
                                  mb: 0.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {client.restaurant}
                              </Typography>
                            </MuiTooltip>

                            {/* Organization Name */}
                            <MuiTooltip title={client.orgName} arrow placement="top">
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{
                                  mb: 1.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  minHeight: '16px'
                                }}
                              >
                                {client.orgName}
                              </Typography>
                            </MuiTooltip>

                            {/* Tags */}
                            <Stack direction="row" spacing={0.5} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                              <MuiTooltip title={`Упаковка: ${client.packageType}`} arrow>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    bgcolor: '#E8F0FE',
                                    color: '#174EA6',
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 1,
                                    fontWeight: 500,
                                    fontSize: '0.7rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                    display: 'inline-block'
                                  }}
                                >
                                  {client.packageType}
                                </Typography>
                              </MuiTooltip>
                              <MuiTooltip title={`Продукт: ${client.productName}`} arrow>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    bgcolor: '#FFF4E5',
                                    color: '#E65100',
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 1,
                                    fontWeight: 500,
                                    fontSize: '0.7rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%',
                                    display: 'inline-block'
                                  }}
                                >
                                  {client.productName}
                                </Typography>
                              </MuiTooltip>
                            </Stack>

                            {/* Total Usage */}
                            <Box
                              sx={{
                                mt: 'auto',
                                pt: 1.5,
                                borderTop: '1px solid #e0e0e0',
                                textAlign: 'center'
                              }}
                            >
                              <Typography variant="h6" fontWeight="bold" color="#0F9D8C">
                                {client.totalUsed.toFixed(2)} КГ
                              </Typography>
                            </Box>
                          </Box>
                        </MuiTooltip>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {/* Table View */}
                {paperUsageView === 'table' && (
                  <TableContainer component={MuiPaper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                          <TableCell sx={{ fontWeight: 'bold', width: '60px' }}>№</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: '200px' }}>Название ресторана</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: '200px' }}>Организация</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: '120px' }}>Упаковка</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: '150px' }}>Продукт</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: '120px' }}>Расход (кг)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topPaperUsageClients.map((client, index) => (
                          <TableRow
                            key={client.id}
                            hover
                            onClick={() => handleOpenUsageModal(client)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: '#E2F0EE'
                              }
                            }}
                          >
                            <TableCell>
                              <Box
                                sx={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  bgcolor: index < 3 ? '#0F9D8C' : '#e0e0e0',
                                  color: index < 3 ? '#fff' : '#666',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '0.875rem'
                                }}
                              >
                                {index + 1}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <MuiTooltip title={client.restaurant} arrow placement="top">
                                <Typography
                                  variant="body2"
                                  fontWeight="600"
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '250px'
                                  }}
                                >
                                  {client.restaurant}
                                </Typography>
                              </MuiTooltip>
                            </TableCell>
                            <TableCell>
                              <MuiTooltip title={client.orgName} arrow placement="top">
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '250px'
                                  }}
                                >
                                  {client.orgName}
                                </Typography>
                              </MuiTooltip>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  bgcolor: '#E8F0FE',
                                  color: '#174EA6',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontWeight: 500,
                                  fontSize: '0.75rem',
                                  display: 'inline-block',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {client.packageType}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  bgcolor: '#FFF4E5',
                                  color: '#E65100',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontWeight: 500,
                                  fontSize: '0.75rem',
                                  display: 'inline-block',
                                  maxWidth: '100%',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {client.productName}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body1" fontWeight="bold" color="#0F9D8C">
                                {client.totalUsed.toFixed(2)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="200px"
                bgcolor="#f5f5f5"
                borderRadius={2}
              >
                <Typography variant="body1" color="text.secondary">
                  Нет данных о расходе бумаги
                </Typography>
              </Box>
            )}
          </Card>

          {/* Daily Usage Chart - Full Width */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Расход бумаги (все клиенты)
              </Typography>

              {/* Scale Selector */}
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Button
                  size="small"
                  variant={chartScale === 'daily' ? 'contained' : 'outlined'}
                  onClick={() => setChartScale('daily')}
                  sx={{
                    minWidth: 80,
                    bgcolor: chartScale === 'daily' ? '#0F9D8C' : 'transparent',
                    color: chartScale === 'daily' ? '#fff' : '#0F9D8C',
                    borderColor: '#0F9D8C',
                    '&:hover': {
                      bgcolor: chartScale === 'daily' ? '#0c7a6e' : 'rgba(15, 157, 140, 0.04)',
                      borderColor: '#0c7a6e'
                    }
                  }}
                >
                  День
                </Button>
                <Button
                  size="small"
                  variant={chartScale === 'weekly' ? 'contained' : 'outlined'}
                  onClick={() => setChartScale('weekly')}
                  sx={{
                    minWidth: 80,
                    bgcolor: chartScale === 'weekly' ? '#0F9D8C' : 'transparent',
                    color: chartScale === 'weekly' ? '#fff' : '#0F9D8C',
                    borderColor: '#0F9D8C',
                    '&:hover': {
                      bgcolor: chartScale === 'weekly' ? '#0c7a6e' : 'rgba(15, 157, 140, 0.04)',
                      borderColor: '#0c7a6e'
                    }
                  }}
                >
                  Неделя
                </Button>
                <Button
                  size="small"
                  variant={chartScale === 'monthly' ? 'contained' : 'outlined'}
                  onClick={() => setChartScale('monthly')}
                  sx={{
                    minWidth: 80,
                    bgcolor: chartScale === 'monthly' ? '#0F9D8C' : 'transparent',
                    color: chartScale === 'monthly' ? '#fff' : '#0F9D8C',
                    borderColor: '#0F9D8C',
                    '&:hover': {
                      bgcolor: chartScale === 'monthly' ? '#0c7a6e' : 'rgba(15, 157, 140, 0.04)',
                      borderColor: '#0c7a6e'
                    }
                  }}
                >
                  Месяц
                </Button>
              </Stack>

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <DatePicker
                    label="С"
                    value={dateRangeStart}
                    onChange={(newValue) => setDateRangeStart(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 130 }
                      }
                    }}
                  />
                  <DatePicker
                    label="До"
                    value={dateRangeEnd}
                    onChange={(newValue) => setDateRangeEnd(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 130 }
                      }
                    }}
                  />
                </Stack>
              </LocalizationProvider>
            </Box>

            {aggregatedUsageData.length > 0 ? (
              <Box sx={{ height: 500 }}>
                <Line data={dailyUsageChartData} options={dailyUsageChartOptions} />
              </Box>
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height={500}
                bgcolor="#f5f5f5"
                borderRadius={2}
              >
                <Typography variant="body1" color="text.secondary">
                  Нет данных за выбранный период
                </Typography>
              </Box>
            )}
          </Card>

          {/* 4th Container - Sender Company Mini Table */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Накладные по организациям
            </Typography>
            <TableContainer component={MuiPaper} sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Организация</strong></TableCell>
                    <TableCell align="right"><strong>Сумма накладных</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {senderCompanyStats.length > 0 ? (
                    senderCompanyStats.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {item.company}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatNumber(item.total)} сум</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        <Typography variant="body2" color="text.secondary" py={2}>
                          Нет данных
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* 5th Container - Recent Logs (Full Width) */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Недавние лог-записи (последние 30 дней)
            </Typography>
            <TableContainer component={MuiPaper} sx={{ mt: 2, borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Дата</strong></TableCell>
                    <TableCell><strong>Ресторан</strong></TableCell>
                    <TableCell><strong>Действие</strong></TableCell>
                    <TableCell><strong>Кол-во (кг)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentLogs.length > 0 ? (
                    recentLogs
                      .slice(logsPage * logsPerPage, logsPage * logsPerPage + logsPerPage)
                      .map((log, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{log.date.toLocaleString('ru-RU')}</TableCell>
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                              {log.restaurantName}
                              {log.isProductType && (
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                  (Стандарт)
                                </Typography>
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {log.actionType === "paperIn" ? (
                              <Box display="flex" alignItems="center" gap={1}>
                                <ArrowDownward sx={{ color: "green", fontSize: 20 }} />
                                <Typography variant="body2" color="green">Приход</Typography>
                              </Box>
                            ) : (
                              <Box display="flex" alignItems="center" gap={1}>
                                <ArrowUpward sx={{ color: "red", fontSize: 20 }} />
                                <Typography variant="body2" color="red">Расход</Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>{typeof log.amount === 'number' ? log.amount.toFixed(2) : log.amount} кг</TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" py={3}>
                          Нет записей за последние 30 дней
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Controls */}
            {recentLogs.length > logsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2, gap: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={logsPage === 0}
                  onClick={() => setLogsPage(logsPage - 1)}
                  sx={{
                    color: '#0F9D8C',
                    borderColor: '#0F9D8C',
                    '&:hover': {
                      borderColor: '#0c7a6e',
                      backgroundColor: 'rgba(15, 157, 140, 0.04)'
                    }
                  }}
                >
                  Назад
                </Button>
                <Typography variant="body2" color="text.secondary">
                  Страница {logsPage + 1} из {Math.ceil(recentLogs.length / logsPerPage)}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={logsPage >= Math.ceil(recentLogs.length / logsPerPage) - 1}
                  onClick={() => setLogsPage(logsPage + 1)}
                  sx={{
                    color: '#0F9D8C',
                    borderColor: '#0F9D8C',
                    '&:hover': {
                      borderColor: '#0c7a6e',
                      backgroundColor: 'rgba(15, 157, 140, 0.04)'
                    }
                  }}
                >
                  Вперёд
                </Button>
              </Box>
            )}
          </Card>
        </Stack>
      )}
    </Container>

    {/* Client Usage History Modal */}
    <ClientUsageHistoryModal
      open={paperUsageModalOpen}
      onClose={handleCloseUsageModal}
      client={selectedClientForUsage}
    />
  </>
);
}