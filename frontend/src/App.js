import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Pools from './pages/Pools';
import Monitors from './pages/Monitors';
import Certs from './pages/Certs';
import WAFRules from './pages/WAFRules';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import Licenses from './pages/Licenses';
import LoginPage from './pages/LoginPage';
import Admin from './pages/Admin';
import GSLB from './pages/GSLB';
import ProfilePage from './pages/ProfilePage';


const API_URL = 'http://localhost:8000/api';

// Redefine the theme for a more professional look
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2c3e50', // A dark, professional blue
    },
    secondary: {
      main: '#3498db', // A bright blue for accents
    },
    background: {
      default: '#f4f6f8', // A very light, clean background
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h4: {
      fontWeight: 600,
      color: '#2c3e50',
    },
    h6: {
      fontWeight: 500,
      color: '#2c3e50',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          borderRadius: 8,
        },
      },
    },
  },
});

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('access_token');
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (token) {
                    const response = await axios.get(`${API_URL}/auth/users/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setIsAdmin(response.data.role === 'admin');
                }
            } catch (error) {
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };
        checkAdminStatus();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return isAdmin ? children : <Navigate to="/" replace />;
};

const LicenseRoute = ({ children }) => {
    const [hasFullLicense, setHasFullLicense] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLicenseStatus = async () => {
            try {
                const token = localStorage.getItem('access_token');
                if (token) {
                    const response = await axios.get(`${API_URL}/license`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setHasFullLicense(response.data.license_type === 'full');
                }
            } catch (error) {
                setHasFullLicense(false);
            } finally {
                setLoading(false);
            }
        };
        checkLicenseStatus();
    }, []);

    if (loading) {
        return <div>Loading license info...</div>;
    }

    return hasFullLicense ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/licenses" element={<Layout><Licenses /></Layout>} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><Layout><Services /></Layout></ProtectedRoute>} />
          <Route path="/services/:serviceId" element={<ProtectedRoute><Layout><ServiceDetail /></Layout></ProtectedRoute>} />
          <Route path="/pools" element={<ProtectedRoute><Layout><Pools /></Layout></ProtectedRoute>} />
          <Route path="/monitors" element={<ProtectedRoute><Layout><Monitors /></Layout></ProtectedRoute>} />
          <Route path="/certs" element={<ProtectedRoute><Layout><Certs /></Layout></ProtectedRoute>} />
          <Route path="/waf" element={<ProtectedRoute><Layout><WAFRules /></Layout></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute><Layout><Logs /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />
          <Route path="/gslb" element={<ProtectedRoute><Layout><GSLB /></Layout></ProtectedRoute>} />
          
          <Route 
            path="/admin" 
            element={<ProtectedRoute><AdminRoute><Layout><Admin /></Layout></AdminRoute></ProtectedRoute>} 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;