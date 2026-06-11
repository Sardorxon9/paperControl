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
import InvoiceInsightsSection from '../components/analytics/InvoiceInsightsSection';
import Shield from '@mui/icons-material/Shield';
import Work from '@mui/icons-material/Work';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper as MuiPaper, Tooltip as MuiTooltip, ToggleButtonGroup, ToggleButton, Popover, Divider
} from "@mui/material";
import { ViewModule, ViewList, CalendarMonth, Close as CloseIcon } from "@mui/icons-material";
import { subDays, subMonths, format, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfWeek } from "date-fns";
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

// Compact date-range control shown in the top-right corner of the log / invoice
// widgets. Lets the user pick a single day or a date range; applies only to its
// own widget. `value` shape: { mode: 'all'|'single'|'range', single, start, end }.
function PeriodFilter({ value, onChange }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const label = (() => {
    if (!value || value.mode === 'all') return 'Период';
    if (value.mode === 'single') {
      return value.single ? format(value.single, 'dd.MM.yyyy') : 'Период';
    }
    const s = value.start ? format(value.start, 'dd.MM.yyyy') : '…';
    const e = value.end ? format(value.end, 'dd.MM.yyyy') : '…';
    return `${s} – ${e}`;
  })();

  const active = value && value.mode !== 'all';

  return (
    <>
      <Button
        size="small"
        variant={active ? 'contained' : 'outlined'}
        startIcon={<CalendarMonth sx={{ fontSize: 18 }} />}
        endIcon={active ? (
          <Box
            component="span"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ mode: 'all', single: null, start: null, end: null });
            }}
            sx={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </Box>
        ) : null}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          bgcolor: active ? '#0F9D8C' : 'transparent',
          color: active ? '#fff' : '#0F9D8C',
          borderColor: '#0F9D8C',
          '&:hover': {
            bgcolor: active ? '#0c7a6e' : 'rgba(15, 157, 140, 0.04)',
            borderColor: '#0c7a6e'
          }
        }}
      >
        {label}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { p: 2, borderRadius: 2, minWidth: 280 } } }}
      >
        <ToggleButtonGroup
          value={value?.mode === 'range' ? 'range' : 'single'}
          exclusive
          size="small"
          fullWidth
          onChange={(_, m) => {
            if (!m) return;
            onChange({ ...value, mode: m });
          }}
          sx={{
            mb: 1.5,
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 600,
              color: '#666',
              borderColor: '#0F9D8C',
              '&.Mui-selected': {
                bgcolor: '#0F9D8C',
                color: '#fff',
                '&:hover': { bgcolor: '#0c7a6e' }
              }
            }
          }}
        >
          <ToggleButton value="single">Один день</ToggleButton>
          <ToggleButton value="range">Период</ToggleButton>
        </ToggleButtonGroup>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
          {value?.mode === 'range' ? (
            <Stack spacing={1.5}>
              <DatePicker
                label="С"
                value={value.start}
                onChange={(d) => onChange({ ...value, mode: 'range', start: d })}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="До"
                value={value.end}
                onChange={(d) => onChange({ ...value, mode: 'range', end: d })}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Stack>
          ) : (
            <DatePicker
              label="Дата"
              value={value?.single || null}
              onChange={(d) => onChange({ ...value, mode: 'single', single: d })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          )}
        </LocalizationProvider>

        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" justifyContent="space-between">
          <Button
            size="small"
            onClick={() => onChange({ mode: 'all', single: null, start: null, end: null })}
            sx={{ textTransform: 'none', color: '#666' }}
          >
            Сбросить
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => setAnchorEl(null)}
            sx={{ textTransform: 'none', bgcolor: '#0F9D8C', '&:hover': { bgcolor: '#0c7a6e' } }}
          >
            Готово
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

export default function Analytics({ user, userRole, onLogout }) {
  const navigate = useNavigate();
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentInvoices, setRecentInvoices] = useState([]);
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
  const [chartScale, setChartScale] = useState('daily'); // daily, weekly, monthly
  const [paperUsageView, setPaperUsageView] = useState('cards'); // 'cards' or 'table'
  const [yearFilter, setYearFilter] = useState('2026'); // 'all', '2026', '2025'
  const [totalPaperBought, setTotalPaperBought] = useState(0);

  // Per-widget date filters for the two bottom tables (logs & invoice history).
  // mode: 'all' (no filter) | 'single' (one day) | 'range' (start..end)
  const [logsPeriod, setLogsPeriod] = useState({ mode: 'all', single: null, start: null, end: null });
  const [invoicesPeriod, setInvoicesPeriod] = useState({ mode: 'all', single: null, start: null, end: null });

  // Helper function to format numbers with spaces
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Helper function to check if date matches year filter
  const matchesYearFilter = (date) => {
    if (yearFilter === 'all') return true;
    const year = date.getFullYear();
    return year.toString() === yearFilter;
  };

  // Check whether a date falls inside a per-widget Period filter.
  const matchesPeriod = (date, period) => {
    if (!period || period.mode === 'all') return true;
    if (period.mode === 'single') {
      if (!period.single) return true;
      return date >= startOfDay(period.single) && date <= endOfDay(period.single);
    }
    // range
    const lo = period.start ? startOfDay(period.start) : null;
    const hi = period.end ? endOfDay(period.end) : null;
    if (lo && date < lo) return false;
    if (hi && date > hi) return false;
    return true;
  };

  // Pieces -> boxes. Box size depends on product weight: 4гр => 1250 шт/коробка, иначе 1000.
  const boxSizeForGramm = (gramm) => (Number(gramm) === 4 ? 1250 : 1000);
  const formatBoxes = (quantity, gramm) => {
    const size = boxSizeForGramm(gramm);
    const boxes = (quantity || 0) / size;
    // Show up to 1 decimal, drop trailing .0
    const rounded = Math.round(boxes * 10) / 10;
    const boxStr = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
    return `${boxStr} ${declOfBox(rounded)}`;
  };
  // Russian plural for "коробка"
  const declOfBox = (n) => {
    const abs = Math.abs(n);
    if (!Number.isInteger(abs)) return 'коробки';
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) return 'коробка';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'коробки';
    return 'коробок';
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

          // Track earliest log date
          if (!earliestDate || logDate < earliestDate) {
            earliestDate = logDate;
          }

          // Calculate paper usage (only paperOut actions) - filter by year
          if (log.actionType === 'paperOut') {
            if (matchesYearFilter(logDate)) {
              totalPaperUsed += log.amount || 0;

              // Track daily usage for the chart
              const dateKey = format(logDate, 'yyyy-MM-dd');
              if (!dailyUsageMap[dateKey]) {
                dailyUsageMap[dateKey] = 0;
              }
              dailyUsageMap[dateKey] += log.amount || 0;
            }
          }

          // Calculate total paper bought (paperIn actions) - filter by year
          if (log.actionType === 'paperIn' && matchesYearFilter(logDate)) {
            totalPaperBoughtAmount += log.amount || 0;
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

      // --- Fetch Catalogue ---
      const catalogueSnapshot = await getDocs(collection(db, "catalogue"));
      const catalogueMap = {};
      catalogueSnapshot.docs.forEach((doc) => {
        catalogueMap[doc.id] = doc.data();
      });

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

          // Calculate paper usage (only paperOut actions) - filter by year
          if (log.actionType === 'paperOut') {
            if (matchesYearFilter(logDate)) {
              // Track daily usage for the chart
              const dateKey = format(logDate, 'yyyy-MM-dd');
              if (!dailyUsageMap[dateKey]) {
                dailyUsageMap[dateKey] = 0;
              }
              dailyUsageMap[dateKey] += log.amount || 0;
            }
          }

          // Calculate total paper bought (paperIn actions) - filter by year
          if (log.actionType === 'paperIn' && matchesYearFilter(logDate)) {
            totalPaperBoughtAmount += log.amount || 0;
          }

          // Collect logs from last 30 days
          if (logDate >= thirtyDaysAgo) {
            // Get product details from catalogue if catalogueItemID exists
            let productName = productType.name || productType.productName || "Стандартная бумага";
            let productCode = productType.productCode || '';
            let comment = productType.comment || '';

            if (productType.catalogueItemID && catalogueMap[productType.catalogueItemID]) {
              const catalogueItem = catalogueMap[productType.catalogueItemID];
              productName = catalogueItem.productName || productName;
              productCode = catalogueItem.productCode || productCode;
              comment = catalogueItem.comment || comment;
            }

            logsList.push({
              date: logDate,
              restaurantName: productName,
              productCode: productCode,
              comment: comment,
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
      const recentInvoicesList = [];

      invoicesSnapshot.docs.forEach((doc) => {
        const invoice = doc.data();
        const invoiceDate = invoice.dateCreated?.toDate ? invoice.dateCreated.toDate() : new Date(invoice.dateCreated);

        // Skip if doesn't match year filter
        if (!matchesYearFilter(invoiceDate)) return;

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

        // --- Build display record for the "История накладных" widget ---
        // Resolve product name / gramm / quantity following the same rules as InvoiceHistory.
        let productName = "—";
        let gramm = invoice.gramm || "";
        let quantity = invoice.quantity || 0;
        let mixed = false;

        const products = Array.isArray(invoice.products) ? invoice.products : null;
        if (products && products.length > 1) {
          mixed = true;
          productName = `${products.length} продуктов`;
          quantity = products.reduce((s, p) => s + (p.quantity || 0), 0);
        } else if (products && products.length === 1) {
          const p = products[0];
          quantity = p.quantity || 0;
          gramm = p.gramm || gramm;
          if (invoice.type === "standard" && p.catalogueItemID && catalogueMap[p.catalogueItemID]) {
            productName = catalogueMap[p.catalogueItemID].productName || "—";
          } else {
            productName = productMap[p.productID_2] || "—";
          }
        } else {
          productName = productMap[invoice.productID_2] || "—";
        }

        recentInvoicesList.push({
          id: doc.id,
          date: invoiceDate,
          restaurantName: invoice.customRestaurantName || invoice.clientRestaurant || "—",
          orgName: invoice.orgName || invoice.clientOrgName || "",
          productName,
          gramm,
          quantity,
          mixed,
          total: totalAmount,
        });
      });

      // Latest invoices first
      recentInvoicesList.sort((a, b) => b.date - a.date);

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
      setRecentInvoices(recentInvoicesList);
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

  // Per-widget filtered lists for the two bottom tables.
  const filteredLogs = recentLogs.filter((log) => matchesPeriod(log.date, logsPeriod));
  const filteredInvoices = recentInvoices.filter((inv) => matchesPeriod(inv.date, invoicesPeriod));

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
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          Аналитика
        </Typography>

        {/* Year Filter Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" fontWeight="600">
            Период:
          </Typography>
          <ToggleButtonGroup
            value={yearFilter}
            exclusive
            onChange={(_, newValue) => {
              if (newValue !== null) setYearFilter(newValue);
            }}
            size="medium"
            sx={{
              '& .MuiToggleButton-root': {
                px: 3,
                py: 1,
                minWidth: '100px',
                color: '#666',
                borderColor: '#0F9D8C',
                fontWeight: 500,
                '&.Mui-selected': {
                  bgcolor: '#0F9D8C',
                  color: '#fff',
                  borderColor: '#0F9D8C',
                  '&:hover': {
                    bgcolor: '#0c7a6e'
                  }
                },
                '&:hover': {
                  bgcolor: 'rgba(15, 157, 140, 0.08)'
                }
              }
            }}
          >
            <ToggleButton value="all">Все время</ToggleButton>
            <ToggleButton value="2026">2026</ToggleButton>
            <ToggleButton value="2025">2025</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* New: invoice trend, client tiers, paper leaders, silent clients */}
      <InvoiceInsightsSection />

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Stack spacing={5}>
          {/* 1st Container - 4 Stats Cards */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={3}>
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

              <Grid item xs={12} md={3}>
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

              <Grid item xs={12} md={3}>
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

              <Grid item xs={12} md={3}>
                <Box
                  sx={{
                    backgroundColor: '#FFF4E5',
                    borderRadius: 3,
                    p: 3,
                    height: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" gutterBottom color="#E65100">
                    {yearFilter === 'all' ? 'Приход бумаги' : `Приход бумаги за ${yearFilter} год`}
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color="#E65100">
                    {totalPaperBought}
                  </Typography>
                  <Typography variant="body2" color="#B74D00" sx={{ mt: 1 }}>
                    КГ куплено
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
                    {yearFilter === 'all' ? 'Форма оплаты' : `Форма оплаты за ${yearFilter} год`}
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
              {yearFilter === 'all' ? 'Топ 10 клиентов по сумме накладных' : `Топ 10 клиентов по сумме накладных за ${yearFilter} год`}
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
                  {yearFilter === 'all' ? 'Топ 15 клиентов по расходу бумаги' : `Топ 15 клиентов по расходу бумаги за ${yearFilter} год`}
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
                onChange={(_, newView) => {
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
                {yearFilter === 'all' ? 'Расход бумаги (все клиенты)' : `Расход бумаги (все клиенты) за ${yearFilter} год`}
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
              {yearFilter === 'all' ? 'Накладные по организациям' : `Накладные по организациям за ${yearFilter} год`}
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

          {/* 5th Container - Logs + Invoice history side by side */}
          <Card elevation={3} sx={{ borderRadius: 4, p: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <Grid container spacing={4}>
              {/* ---------- LEFT: Recent log entries ---------- */}
              <Grid item xs={12} lg={6}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5, gap: 1, flexWrap: 'wrap' }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Недавние лог-записи
                  </Typography>
                  <PeriodFilter value={logsPeriod} onChange={setLogsPeriod} />
                </Stack>

                <TableContainer
                  component={MuiPaper}
                  variant="outlined"
                  sx={{ borderRadius: 2, maxHeight: 450, overflow: 'auto' }}
                >
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', whiteSpace: 'nowrap' }}>Дата</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Ресторан</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', whiteSpace: 'nowrap' }}>Кол-во</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log, index) => {
                          const amt = typeof log.amount === 'number' ? log.amount : Number(log.amount) || 0;
                          const isIn = log.actionType === 'paperIn';
                          const sign = isIn ? '+' : '-';
                          return (
                            <TableRow key={index} hover>
                              <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                {format(log.date, 'dd.MM.yyyy HH:mm')}
                              </TableCell>
                              <TableCell>
                                {log.isProductType && log.productCode ? (
                                  <Box>
                                    <Typography variant="body2" fontWeight="600" noWrap sx={{ maxWidth: 220 }}>
                                      {log.restaurantName} ({log.productCode})
                                    </Typography>
                                    {log.comment && log.comment !== 'n/a' && (
                                      <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 220 }}>
                                        {log.comment}
                                      </Typography>
                                    )}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                                    {log.restaurantName}
                                    {log.isProductType && (
                                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                        (Стандарт)
                                      </Typography>
                                    )}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                <Typography
                                  variant="body2"
                                  fontWeight="700"
                                  sx={{ color: isIn ? '#1a8917' : '#d32f2f' }}
                                >
                                  {sign} {amt.toFixed(2)} KG
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            <Typography variant="body2" color="text.secondary" py={3}>
                              {recentLogs.length === 0 ? 'Нет записей за последние 30 дней' : 'Нет записей за выбранный период'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Показано записей: {filteredLogs.length}
                </Typography>
              </Grid>

              {/* ---------- RIGHT: Invoice history ---------- */}
              <Grid item xs={12} lg={6}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5, gap: 1, flexWrap: 'wrap' }}
                >
                  <Typography variant="h6" fontWeight="bold">
                    История накладных
                  </Typography>
                  <PeriodFilter value={invoicesPeriod} onChange={setInvoicesPeriod} />
                </Stack>

                <TableContainer
                  component={MuiPaper}
                  variant="outlined"
                  sx={{ borderRadius: 2, maxHeight: 560, overflow: 'auto' }}
                >
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', whiteSpace: 'nowrap' }}>Дата и время</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Клиент</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Продукт</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', whiteSpace: 'nowrap' }}>Итого</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredInvoices.length > 0 ? (
                        filteredInvoices.map((inv) => (
                          <TableRow key={inv.id} hover>
                            <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                              {format(inv.date, 'dd.MM.yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="600" noWrap sx={{ maxWidth: 180 }}>
                                {inv.restaurantName}
                              </Typography>
                              {inv.orgName && (
                                <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 180 }}>
                                  {inv.orgName}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                                {inv.productName}
                                {inv.gramm ? (
                                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                    {inv.gramm} гр
                                  </Typography>
                                ) : null}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                              <Typography variant="body2" fontWeight="700">
                                {formatNumber(inv.total)} UZS
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {inv.mixed ? 'Смешанная' : formatBoxes(inv.quantity, inv.gramm)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="body2" color="text.secondary" py={3}>
                              {recentInvoices.length === 0 ? 'Нет накладных' : 'Нет накладных за выбранный период'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Показано накладных: {filteredInvoices.length}
                </Typography>
              </Grid>
            </Grid>
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