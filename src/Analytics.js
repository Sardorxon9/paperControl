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
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import Shield from '@mui/icons-material/Shield';
import Work from '@mui/icons-material/Work';
import LogoutIcon from '@mui/icons-material/Logout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function Analytics({ user, userRole, onBackToDashboard, onLogout }) {
  const [clientData, setClientData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [packageStats, setPackageStats] = useState({
    stick: 0,
    sachet: 0,
    total: 0
  });

  // Fetch client data
  const fetchClientData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "clients"));
      const validDocs = querySnapshot.docs.filter(docSnap => 
        docSnap && docSnap.id && docSnap.exists()
      );

      const clientsArray = validDocs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      setClientData(clientsArray);
      
      // Calculate package statistics
      let stickCount = 0;
      let sachetCount = 0;
      
      clientsArray.forEach(client => {
        if (client.packageID === 'sKHbhJ8Ik7QpVUCEgbpP') {
          stickCount++;
        } else if (client.packageID === 'fhLBOV7ai4N7MZDPkSCL') {
          sachetCount++;
        }
      });
      
      setPackageStats({
        stick: stickCount,
        sachet: sachetCount,
        total: clientsArray.length
      });
      
    } catch (error) {
      console.error("Error fetching client data:", error);
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
        backgroundColor: [
          '#0F9D8C',
          '#4285F4'
        ],
        borderColor: [
          '#0c7a6e',
          '#3367d6'
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 14
          }
        }
      },
      tooltip: {
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

  // Custom center text plugin
 const centerTextPlugin = {
  id: 'centerText',
  beforeDraw: (chart) => {
    if (chart.config.type === 'doughnut') {
      const { ctx, chartArea: { left, right, top, bottom } } = chart;
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;

      ctx.save();
      ctx.font = 'bold 24px sans-serif';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(packageStats.total.toString(), centerX, centerY - 15);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText('Всего клиентов', centerX, centerY + 15);
      ctx.restore();
    }
  }
};


return (
  <>
    {/* Header - same as Welcome.js */}
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
      <Container maxWidth={false} sx={{ maxWidth: "1400px" }}>
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

    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
        Аналитика
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Donut Chart Card */}
          <Grid item xs={12} md={6}>
            <Card 
              elevation={2}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <CardContent sx={{ p: 3, flexGrow: 1 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Распределение клиентов по типам упаковки
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Процентное соотношение клиентов, использующих упаковку типа Стик и Сашет
                </Typography>
                
                <Box sx={{ position: 'relative', height: 300 }}>
                  <Doughnut data={chartData} options={chartOptions} plugins={[centerTextPlugin]} />
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {packageStats.stick}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Стик
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {packageStats.total > 0 ? Math.round((packageStats.stick / packageStats.total) * 100) : 0}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {packageStats.sachet}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Сашет
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {packageStats.total > 0 ? Math.round((packageStats.sachet / packageStats.total) * 100) : 0}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 3 Stats Cards in one row */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={3} alignItems="stretch">
              {/* Total Clients */}
              <Grid item xs={12} md={4}>
                <Card 
                  elevation={2}
                  sx={{
                    background: 'linear-gradient(135deg, #0F9D8C 0%, #0c7a6e 100%)',
                    color: 'white',
                    borderRadius: 3,
                    p: 3,
                    height: '100%',
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
                </Card>
              </Grid>

              {/* Stick */}
              <Grid item xs={12} md={4}>
                <Card 
                  elevation={2}
                  sx={{
                    backgroundColor: '#E2F0EE',
                    borderRadius: 3,
                    p: 2.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body1" fontWeight="bold" gutterBottom color="#065345">
                    Стик упаковка
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="#065345">
                    {packageStats.stick}
                  </Typography>
                  <Typography variant="body2" color="#527975">
                    {packageStats.total > 0 ? Math.round((packageStats.stick / packageStats.total) * 100) : 0}% от всех
                  </Typography>
                </Card>
              </Grid>

              {/* Sachet */}
              <Grid item xs={12} md={4}>
                <Card 
                  elevation={2}
                  sx={{
                    backgroundColor: '#E8F0FE',
                    borderRadius: 3,
                    p: 2.5,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body1" fontWeight="bold" gutterBottom color="#174EA6">
                    Сашет упаковка
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="#174EA6">
                    {packageStats.sachet}
                  </Typography>
                  <Typography variant="body2" color="#5F7A9B">
                    {packageStats.total > 0 ? Math.round((packageStats.sachet / packageStats.total) * 100) : 0}% от всех
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Container>
  </>
);

}