import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Certs from './pages/Certs';
import WAFRules from './pages/WAFRules';
import Logs from './pages/Logs';
import Settings from './pages/Settings';

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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toaster position="top-right" toastOptions={{
          success: { duration: 3000 },
          error: { duration: 5000 },
      }}/>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/services" element={<Services />} />
            <Route path="/certs" element={<Certs />} />
            <Route path="/waf" element={<WAFRules />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;