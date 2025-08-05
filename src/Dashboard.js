import React from 'react';
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
  Assignment
} from '@mui/icons-material';

const Dashboard = ({ user, userRole, onNavigateToWelcome, onLogout }) => {
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
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6">Клиенты и Бумаги</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Управление клиентами и контроль расхода бумаги
          </Typography>
          <Button 
            variant="contained" 
            sx={{
              backgroundColor: '#0F9D8C',
              '&:hover': { backgroundColor: '#0c7a6e' }
            }}
            startIcon={<Assignment />}
            onClick={onNavigateToWelcome}
          >
            Открыть
          </Button>
        </Paper>

        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6">Мои документы</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Просмотрите и управляйте своими документами
          </Typography>
          <Button variant="contained">Открыть</Button>
        </Paper>

        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6">Уведомления</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Проверьте последние обновления
          </Typography>
          <Button variant="contained" color="success">Просмотреть</Button>
        </Paper>

        {userRole === 'admin' && (
          <>
            {['Управление пользователями', 'Системные настройки', 'Отчеты и аналитика'].map((title, i) => (
              <Paper key={i} elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6">{title}</Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {title === 'Управление пользователями'
                    ? 'Добавляйте и управляйте пользователями системы'
                    : title === 'Системные настройки'
                    ? 'Конфигурация системы и параметры'
                    : 'Просмотр статистики и генерация отчетов'}
                </Typography>
                <Button variant="contained" color={i === 0 ? 'secondary' : i === 1 ? 'info' : 'warning'}>
                  {title === 'Отчеты и аналитика' ? 'Отчеты' : 'Настроить'}
                </Button>
              </Paper>
            ))}
          </>
        )}

        {userRole === 'worker' && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6">Мои задачи</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Просмотрите назначенные вам задачи
            </Typography>
            <Button variant="contained" color="primary">Задачи</Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;