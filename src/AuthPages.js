import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Paper,
  CircularProgress,
  IconButton,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  ArrowForward,
  Person,
  Shield,
  Work
} from '@mui/icons-material';

// MOCK FUNCTIONS (replace with Firebase)
const mockSignInWithEmailAndPassword = async (email, password) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if (email === 'admin@test.com' && password === 'password') return { user: { email, uid: '123' } };
  if (email === 'worker@test.com' && password === 'password') return { user: { email, uid: '456' } };
  throw new Error('Неверные учетные данные');
};

const mockGetUserRole = async (uid) => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (uid === '123') return 'admin';
  if (uid === '456') return 'worker';
  return null;
};

const AuthPages = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Пожалуйста, заполните все поля');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Пожалуйста, введите корректный email адрес');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const result = await mockSignInWithEmailAndPassword(formData.email, formData.password);
      const role = await mockGetUserRole(result.user.uid);
      setUser(result.user);
      setUserRole(role);
      setSuccess(`Добро пожаловать! Вы вошли как ${role === 'admin' ? 'Администратор' : 'Сотрудник'}`);
      setFormData({ email: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole(null);
    setFormData({ email: '', password: '' });
    setSuccess('');
    setError('');
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '' });
    setError('');
    setSuccess('');
  };

  // DASHBOARD
  if (user && userRole) {
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
                <Typography variant="body2">{userRole === 'admin' ? 'Администратор' : 'Сотрудник'}</Typography>
              </Box>
              <Button color="error" onClick={handleLogout}>Выйти</Button>
            </Stack>
          </Box>
        </Paper>

        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }} gap={3}>
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
  }

  // LOGIN FORM
  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={4} sx={{ p: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>Paper Control</Typography>
        <Typography variant="subtitle2" align="center" color="text.secondary">
          Добро пожаловать! Войдите в систему для продолжения
        </Typography>

        <Divider sx={{ my: 3 }} />

        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              name="email"
              label="Email"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={handleInputChange}
              InputProps={{ startAdornment: <Email sx={{ mr: 1 }} /> }}
            />
            <TextField
              name="password"
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={formData.password}
              onChange={handleInputChange}
              InputProps={{
                startAdornment: <Lock sx={{ mr: 1 }} />,
                endAdornment: (
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
              endIcon={!loading && <ArrowForward />}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
          </Stack>
        </form>
        

        <Typography align="center" variant="body2" sx={{ mt: 3 }}>
          {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <Button onClick={switchMode} size="small">
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
};

export default AuthPages;
