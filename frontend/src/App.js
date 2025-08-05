import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Pools from './pages/Pools';
import Certs from './pages/Certs';
import WAFRules from './pages/WAFRules';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import Licenses from './pages/Licenses';
import LoginPage from './pages/LoginPage'; // <-- NEW
import RegisterPage from './pages/RegisterPage'; // <-- NEW

const theme = createTheme({
  palette: {
    primary: {
      main: '#3498db',
    },
    background: {
      default: '#ecf0f1',
    }
  },
});

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('access_token');
    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute><Layout><Services /></Layout></ProtectedRoute>} />
          <Route path="/pools" element={<ProtectedRoute><Layout><Pools /></Layout></ProtectedRoute>} />
          <Route path="/certs" element={<ProtectedRoute><Layout><Certs /></Layout></ProtectedRoute>} />
          <Route path="/waf" element={<ProtectedRoute><Layout><WAFRules /></Layout></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute><Layout><Logs /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          <Route path="/licenses" element={<ProtectedRoute><Layout><Licenses /></Layout></ProtectedRoute>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;