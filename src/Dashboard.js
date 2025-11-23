// Dashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Button,
  Typography,
  Box,
  Paper,
  Stack,
} from '@mui/material';
import {
  Shield,
  Work,
  Assignment,
  Analytics as AnalyticsIcon,
  Description,
  Notifications,
  People,
  Settings,
  Task,
  Receipt
} from '@mui/icons-material';

const Dashboard = ({
  user,
  userRole,
  onLogout
}) => {
  const navigate = useNavigate();
  return (
    <Container maxWidth="md" sx={{ mt: 6 }}>
      <Paper elevation={4} sx={{ p: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5">Paper Control</Typography>
            <Typography variant="subtitle2" color="text.secondary">{user.email}</Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box display="flex" alignItems="center" gap={1} px={2} py={1} bgcolor="#f5f5f5" borderRadius={2}>
              {userRole === 'admin' ? <Shield color="primary" /> : <Work color="success" />}
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {userRole === 'admin' ? 'Администратор' : 'Сотрудник'}
                </Typography>
              </Box>
            </Box>
            <Button color="error" onClick={onLogout}>Выйти</Button>
          </Stack>
        </Box>
      </Paper>

      <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={3}>
        {/* Клиенты и Бумаги Card */}
        <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Клиенты и Бумаги</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ flexGrow: 1 }}>
            Управление клиентами и контроль расхода бумаги
          </Typography>
          <Button 
            variant="contained" 
            sx={{
              backgroundColor: '#0F9D8C',
              '&:hover': { backgroundColor: '#0c7a6e' }
            }}
            startIcon={<Assignment />}
            onClick={() => navigate('/welcome')}
          >
            Открыть
          </Button>
        </Paper>

        {/* Analytics Card - Only for admins */}
        {userRole === 'admin' && (
          <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Аналитика</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ flexGrow: 1 }}>
              Просмотр аналитики и отчетов по клиентам и бумаге
            </Typography>
            <Button 
              variant="contained" 
              sx={{
                backgroundColor: '#4285F4',
                '&:hover': { backgroundColor: '#3367d6' }
              }}
              startIcon={<AnalyticsIcon />}
              onClick={() => navigate('/analytics')}
            >
              Открыть
            </Button>
          </Paper>
        )}

        {/* Мои документы Card - Modified */}
        <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Мои документы</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ flexGrow: 1 }}>
            Генератор накладных и управление документами
          </Typography>
          <Stack spacing={1}>
            <Button 
              variant="contained" 
              startIcon={<Receipt />}
              sx={{
                backgroundColor: '#0F9D8C',
                '&:hover': { backgroundColor: '#0c7a6e' }
              }}
              onClick={() => navigate('/invoices')}
            >
              Накладные
            </Button>
          
          </Stack>
        </Paper>

        {/* Уведомления Card */}
        <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Уведомления</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ flexGrow: 1 }}>
            Проверьте последние обновления
          </Typography>
          <Button 
            variant="contained" 
            color="success"
            startIcon={<Notifications />}
          >
            Просмотреть
          </Button>
        </Paper>

        {userRole === 'admin' && (
          <>
            {/* Управление пользователями Card */}
            <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>Управление пользователями</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ flexGrow: 1 }}>
                Добавляйте и управляйте пользователями системы
              </Typography>
              <Button 
                variant="contained" 
                color="secondary"
                startIcon={<People />}
              >
                Настроить
              </Button>
            </Paper>

            {/* Системные настройки Card */}
            <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>Системные настройки</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ flexGrow: 1 }}>
                Конфигурация системы и параметры
              </Typography>
              <Button 
                variant="contained" 
                color="info"
                startIcon={<Settings />}
              >
                Настроить
              </Button>
            </Paper>

            {/* Отчеты Card */}
            <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>Отчеты</Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ flexGrow: 1 }}>
                Просмотр статистики и генерация отчетов
              </Typography>
              <Button 
                variant="contained" 
                color="warning"
                startIcon={<AnalyticsIcon />}
              >
                Отчеты
              </Button>
            </Paper>
          </>
        )}

        {userRole === 'worker' && (
          <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Мои задачи</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ flexGrow: 1 }}>
              Просмотрите назначенные вам задачи
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<Task />}
            >
              Задачи
            </Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;