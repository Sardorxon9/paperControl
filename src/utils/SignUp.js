import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, LogIn, UserPlus, Shield, Briefcase } from 'lucide-react';

// Mock Firebase auth functions - replace with your actual Firebase imports
const mockSignInWithEmailAndPassword = async (email, password) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (email === 'admin@test.com' && password === 'password') {
    return { user: { email, uid: '123' } };
  }
  if (email === 'worker@test.com' && password === 'password') {
    return { user: { email, uid: '456' } };
  }
  throw new Error('Неверные учетные данные');
};

// Mock Firestore function to get user role - replace with your actual Firestore import
const mockGetUserRole = async (uid) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  if (uid === '123') return 'admin';
  if (uid === '456') return 'worker';
  return null;
};

const AuthPages = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
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
    setError('');
    
    try {
      // Replace with: await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const result = await mockSignInWithEmailAndPassword(formData.email, formData.password);
      
      // Get user role from Firestore
      setLoadingRole(true);
      // Replace with: const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      // const role = userDoc.exists() ? userDoc.data().role : null;
      const role = await mockGetUserRole(result.user.uid);
      
      setUser(result.user);
      setUserRole(role);
      setSuccess(`Добро пожаловать! Вы вошли как ${role === 'admin' ? 'Администратор' : 'Сотрудник'}`);
      
      // Reset form
      setFormData({ email: '', password: '' });
      
    } catch (err) {
      setError(err.message || 'Ошибка аутентификации');
    } finally {
      setLoading(false);
      setLoadingRole(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserRole(null);
    setSuccess('');
    setError('');
    setFormData({ email: '', password: '' });
  };

  // If user is logged in, show dashboard
  if (user && userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <span className="text-white font-bold">PC</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Paper Control</h1>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  {userRole === 'admin' ? (
                    <>
                      <Shield className="text-blue-600" size={18} />
                      <span className="text-sm font-medium text-gray-700">Администратор</span>
                    </>
                  ) : (
                    <>
                      <Briefcase className="text-green-600" size={18} />
                      <span className="text-sm font-medium text-gray-700">Сотрудник</span>
                    </>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Always visible cards */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Мои документы</h3>
              <p className="text-gray-600 mb-4">Просмотрите и управляйте своими документами</p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all">
                Открыть
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Уведомления</h3>
              <p className="text-gray-600 mb-4">Проверьте последние обновления</p>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all">
                Просмотреть
              </button>
            </div>

            {/* Admin only cards */}
            {userRole === 'admin' && (
              <>
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 border-l-4 border-l-blue-500">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Управление пользователями</h3>
                  <p className="text-gray-600 mb-4">Добавляйте и управляйте пользователями системы</p>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all">
                    Управлять
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 border-l-4 border-l-blue-500">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Системные настройки</h3>
                  <p className="text-gray-600 mb-4">Конфигурация системы и параметры</p>
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all">
                    Настроить
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 border-l-4 border-l-blue-500">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Отчеты и аналитика</h3>
                  <p className="text-gray-600 mb-4">Просмотр статистики и генерация отчетов</p>
                  <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-all">
                    Отчеты
                  </button>
                </div>
              </>
            )}

            {/* Worker specific cards */}
            {userRole === 'worker' && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Мои задачи</h3>
                <p className="text-gray-600 mb-4">Просмотрите назначенные вам задачи</p>
                <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-all">
                  Задачи
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-xl">PC</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Paper Control</h1>
          <p className="text-gray-600">
            Добро пожаловать! Войдите в систему для продолжения
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Вход в систему</h2>
            <p className="text-gray-600">Введите ваши учетные данные</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">
            {/* Name Field (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Sign Up Only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            {/* Forgot Password Link (Login Only) */}
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>

          {/* Demo Credentials (for testing) */}
          {isLogin && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-800 font-medium mb-1">Demo Credentials:</p>
              <p className="text-xs text-blue-700">Email: test@test.com</p>
              <p className="text-xs text-blue-700">Password: password</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={switchMode}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPages;