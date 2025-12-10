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
} from '@mui/icons-material';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthPages = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      // Sign in with Firebase Auth - App.js will handle the rest
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      setSuccess('Вход выполнен успешно!');
      setFormData({ email: '', password: '' });
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
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Неверные учетные данные';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: '', password: '' });
    setError('');
    setSuccess('');
  };

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