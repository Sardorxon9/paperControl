// App.js

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import AuthPages from './AuthPages';
import Dashboard from './Dashboard'; // We'll create this component
import Welcome from './Welcome';
import { CircularProgress, Box } from '@mui/material';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'welcome'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const q = query(
            collection(db, 'users'),
            where('uID', '==', firebaseUser.uid)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            const firestoreDoc = snap.docs[0].data();
            const enrichedUser = {
              ...firebaseUser,
              id: snap.docs[0].id,
              uID: firestoreDoc.uID,
              name: firestoreDoc.name,
              chatId: firestoreDoc.chatId,
              role: firestoreDoc.role,
              email: firestoreDoc.email || firebaseUser.email,
            };
            setUser(enrichedUser);
            setUserRole(enrichedUser.role);
          } else {
            setUser(firebaseUser);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error fetching enriched user:', error);
          setUser(firebaseUser);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setCurrentView('dashboard');
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleNavigateToWelcome = () => {
    setCurrentView('welcome');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}
      >
        <CircularProgress size={60} sx={{ color: '#0F9D8C' }} />
      </Box>
    );
  }

  // If user is not authenticated, show login form
  if (!user) {
    return <AuthPages />;
  }

  // If user is authenticated, show appropriate view
  if (currentView === 'welcome') {
    return (
      <Welcome 
        user={user} 
        userRole={userRole} 
        onBackToDashboard={handleBackToDashboard}
        onLogout={handleLogout}
      />
    );
  }

  // Default dashboard view
  return (
    <Dashboard 
      user={user}
      userRole={userRole}
      onNavigateToWelcome={handleNavigateToWelcome}
      onLogout={handleLogout}
    />
  );
}

export default App;