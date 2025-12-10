// ClientUsageHistoryModal.js
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  Divider
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ClientUsageHistoryModal({ open, onClose, client }) {
  const [loading, setLoading] = useState(false);
  const [usageData, setUsageData] = useState([]);

  const fetchClientUsageHistory = async () => {
    setLoading(true);
    try {
      const logsRef = collection(db, "clients", client.id, "logs");
      const logsQuery = query(logsRef, orderBy('date', 'asc'));
      const logsSnapshot = await getDocs(logsQuery);

      const usageByDate = {};

      logsSnapshot.docs.forEach((doc) => {
        const log = doc.data();
        if (log.actionType === 'paperOut') {
          const logDate = log.date?.toDate ? log.date.toDate() : new Date(log.date);
          const dateKey = format(logDate, 'yyyy-MM-dd');

          if (!usageByDate[dateKey]) {
            usageByDate[dateKey] = 0;
          }
          usageByDate[dateKey] += log.amount || 0;
        }
      });

      // Convert to array and sort by date
      const dataArray = Object.entries(usageByDate).map(([date, amount]) => ({
        date,
        amount: parseFloat(amount.toFixed(2))
      })).sort((a, b) => a.date.localeCompare(b.date));

      setUsageData(dataArray);
    } catch (error) {
      console.error("Error fetching client usage history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && client) {
      fetchClientUsageHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client]);

  const chartData = {
    labels: usageData.map(item => format(parseISO(item.date), 'dd.MM.yyyy')),
    datasets: [
      {
        label: 'Расход бумаги (кг)',
        data: usageData.map(item => item.amount),
        borderColor: '#0F9D8C',
        backgroundColor: 'rgba(15, 157, 140, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#0F9D8C',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
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
          minRotation: 45
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

  if (!client) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              История расхода бумаги
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {client.restaurant}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Client Info */}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
              <Chip
                label={client.orgName || "—"}
                size="small"
                sx={{
                  bgcolor: '#E2F0EE',
                  color: '#065345',
                  fontWeight: 500
                }}
              />
              <Chip
                label={client.packageType || "—"}
                size="small"
                variant="outlined"
                sx={{ borderColor: '#0F9D8C', color: '#0F9D8C' }}
              />
              <Chip
                label={client.productName || "—"}
                size="small"
                variant="outlined"
                sx={{ borderColor: '#0F9D8C', color: '#0F9D8C' }}
              />
            </Stack>

            {/* Summary Stats */}
            <Box
              sx={{
                bgcolor: '#f9f9f9',
                borderRadius: 2,
                p: 2,
                mb: 3,
                display: 'flex',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Box textAlign="center">
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {client.totalUsed.toFixed(2)} кг
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Всего использовано
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight="bold" color="#4285F4">
                  {usageData.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Дней с расходом
                </Typography>
              </Box>
              {usageData.length > 0 && (
                <Box textAlign="center">
                  <Typography variant="h5" fontWeight="bold" color="#34A853">
                    {((client.totalUsed / usageData.length) * 30).toFixed(2)} кг
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Средний расход в месяц
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Line Chart */}
            {usageData.length > 0 ? (
              <Box sx={{ height: 350, position: 'relative' }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="300px"
                bgcolor="#f5f5f5"
                borderRadius={2}
              >
                <Typography variant="body1" color="text.secondary">
                  Нет данных о расходе бумаги для этого клиента
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
