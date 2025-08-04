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
  Work,
  Assignment
} from '@mui/icons-material';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import Welcome from './Welcome'; // Import Welcome component

const AuthPages = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'welcome'

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

  const getUserDataByUID = async (uid) => {
    try {
      // Query the users collection to find user by uID field
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uID", "==", uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Get the first matching document
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        return {
          id: userDoc.id,
          uID: userData.uID,
          name: userData.name,
          chatId: userData.chatId,
          role: userData.role,
          email: userData.email || formData.email // fallback to login email if not stored
        };
      } else {
        throw new Error('Пользователь не найден в базе данных');
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw new Error('Ошибка при получении данных пользователя: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;
      
      // Get user data from Firestore users collection
      const userData = await getUserDataByUID(firebaseUser.uid);
      
      setUser(userData);
      setUserRole(userData.role);
      setCurrentView('dashboard'); 
      setSuccess(`Добро пожаловать, ${userData.name}! Вы вошли как ${userData.role === 'admin' ? 'Администратор' : 'Сотрудник'}`);
      setFormData({ email: '', password: '' });
      
      console.log("User logged in successfully:", userData);
    } catch (err) {
      console.error("Login error:", err);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Ошибка входа';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Пользователь не найден';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Неверный пароль';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Неверный формат email';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'Аккаунт заблокирован';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Слишком много попыток входа. Попробуйте позже';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserRole(null);
      setFormData({ email: '', password: '' });
      setSuccess('');
      setError('');
      setCurrentView('dashboard');
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      setError('Ошибка при выходе из системы');
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '' });
    setError('');
    setSuccess('');
  };

  // Navigate to Welcome page
  const handleNavigateToWelcome = () => {
    setCurrentView('welcome');
  };

  // Navigate back to dashboard
  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  // WELCOME PAGE VIEW
  if (user && userRole && currentView === 'welcome') {
    return (
      <Welcome 
        user={user} 
        userRole={userRole} 
        onBackToDashboard={handleBackToDashboard}
        onLogout={handleLogout}
      />
    );
  }

  // DASHBOARD
  if (user && userRole && currentView === 'dashboard') {
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
              <Button color="error" onClick={handleLogout}>Выйти</Button>
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
              onClick={handleNavigateToWelcome}
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