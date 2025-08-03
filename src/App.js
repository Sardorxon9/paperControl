import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; // your existing firebase config
import Welcome from './Welcome'; // your existing main component
import AuthPages from './AuthPages'; // the new login component
import { CircularProgress, Box, Button, AppBar, Toolbar, Typography } from '@mui/material';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, get their role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const role = userDoc.exists() ? userDoc.data().role : null;
          setUser(user);
          setUserRole(role);
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUser(user);
          setUserRole(null);
        }
      } else {
        // User is signed out
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Firebase will automatically trigger onAuthStateChanged and set user to null
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Show loading spinner while checking authentication
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

  // If user is not logged in, show login page
  if (!user) {
    return <AuthPages />;
  }

  // If user is logged in, show your main Paper Control app with logout button
  return (
    <div>
      {/* Top Navigation Bar with Logout Button */}
      <AppBar position="static" sx={{ backgroundColor: '#0F9D8C' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Paper Control System
          </Typography>
          <Typography variant="body2" sx={{ marginRight: 2 }}>
            Welcome, {user.email}
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              border: '1px solid white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Main Content */}
      <Welcome user={user} userRole={userRole} />
    </div>
  );
}

export default App;