// Analytics.js
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { db } from "./firebase";
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
  Divider
} from "@mui/material";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement, CategoryScale, LinearScale, 
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import Shield from '@mui/icons-material/Shield';
import Work from '@mui/icons-material/Work';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper as MuiPaper
} from "@mui/material";
import { ArrowDownward, ArrowUpward } from "@mui/icons-material";
import { subDays } from "date-fns";



ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function Analytics({ user, userRole, onBackToDashboard, onLogout }) {
    
  const [clientData, setClientData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productStats, setProductStats] = useState({});
  const [topClients, setTopClients] = useState([]);

  const [packageStats, setPackageStats] = useState({
    stick: 0,
    sachet: 0,
    total: 0
  });

  // Helper function to format numbers with spaces
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Fetch client data
  const fetchClientData = async () => {
    try {
      // --- Fetch Clients ---
      const clientSnapshot = await getDocs(collection(db, "clients"));
      const clientList = [];
      const logsList = [];
      const oneWeekAgo = subDays(new Date(), 7);

      // --- Iterate through Clients ---
      await Promise.all(clientSnapshot.docs.map(async (clientDoc) => {
        const client = { id: clientDoc.id, ...clientDoc.data() };
        clientList.push(client);

        const logsRef = collection(db, "clients", clientDoc.id, "logs");
        const logSnapshot = await getDocs(logsRef);

        logSnapshot.docs.forEach((logDoc) => {
          const log = logDoc.data();
          const logDate = log.date?.toDate ? log.date.toDate() : new Date(log.date);

          if (logDate >= oneWeekAgo) {
            logsList.push({
              date: logDate,
              restaurantName: client.name || "—",
              actionType: log.actionType,
              amount: log.amount,
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

      // --- Fetch Top Clients by Invoice Total ---
      const invoicesSnapshot = await getDocs(collection(db, "all-invoices"));
      const clientTotals = {};

      invoicesSnapshot.docs.forEach((doc) => {
        const invoice = doc.data();
        const clientId = invoice.clientId;
        const totalAmount = invoice.totalInvoiceAmount || 0;

        if (clientId) {
          clientTotals[clientId] = (clientTotals[clientId] || 0) + totalAmount;
        }
      });

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

      // --- Sort logs (latest first) ---
      logsList.sort((a, b) => b.date - a.date);

      // --- Set State ---
      setClientData(clientList);
      setPackageStats(stats);
      setProductStats(productStats);
      setRecentLogs(logsList);
      setTopClients(topClientsData);
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
  devicePixelRatio: 3,  // Changed from 2 to 3
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 20,
        font: { 
          size: 16,  // Changed from 14 to 16
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
  devicePixelRatio: 3,  // Changed from 2 to 3
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 20,
        font: { 
          size: 14,  // Changed from 12 to 14
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

 const topClientsChartOptions = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  devicePixelRatio: 3,  // Changed from 2 to 3
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
        font: { size: 13 },  // Added font size
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
        font: { size: 14 }  // Added font size for client names
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
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';  // Increased from 24px to 32px
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(packageStats.total.toString(), centerX, centerY - 15);

      ctx.font = '16px system-ui, -apple-system, sans-serif';  // Increased from 14px to 16px
      ctx.fillStyle = '#666';
      ctx.fillText('Всего клиентов', centerX, centerY + 20);  // Adjusted positioning
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
      <Container maxWidth={false} sx={{ maxWidth: "1600px" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box
            sx={{
              cursor: 'pointer',
              "&:hover": { opacity: 0.8 }
            }}
            onClick={onBackToDashboard}
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
              onClick={onBackToDashboard}
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

    <Container maxWidth={false} sx={{ maxWidth: "1600px", py: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
        Аналитика
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Stack spacing={3}>
          {/* 1st Container - 3 Stats Cards */}
          <Card elevation={2} sx={{ borderRadius: 3, p: 3 }}>
            <Grid container spacing={3}>
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

          {/* 2nd Container - Two Donut Charts */}
          <Card elevation={2} sx={{ borderRadius: 3, p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Распределение клиентов по типам упаковки
                  </Typography>
                  <Box sx={{ position: 'relative', height: 350, mt: 2 }}>
                    <Doughnut data={chartData} options={chartOptions} plugins={[centerTextPlugin]} />
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    Распределение клиентов по продуктам
                  </Typography>
                  <Box sx={{ position: 'relative', height: 350, mt: 2 }}>
                    <Doughnut data={productChartData} options={productChartOptions} />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* 3rd Container - Top Clients Bar Chart (Full Width) */}
          <Card elevation={2} sx={{ borderRadius: 3, p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Топ 10 клиентов по сумме накладных
            </Typography>
            <Box sx={{ position: 'relative', height: 500, mt: 2 }}>
              <Bar data={topClientsChartData} options={topClientsChartOptions} />
            </Box>
          </Card>

          {/* 4th Container - Recent Logs (Full Width) */}
          <Card elevation={2} sx={{ borderRadius: 3, p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Недавние лог-записи (последние 7 дней)
            </Typography>
            <TableContainer component={MuiPaper} sx={{ mt: 2 }}>
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
                    recentLogs.map((log, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{log.date.toLocaleString()}</TableCell>
                        <TableCell>{log.restaurantName}</TableCell>
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
                        <TableCell>{log.amount} кг</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" py={3}>
                          Нет записей за последние 7 дней
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      )}
    </Container>
  </>
);
}