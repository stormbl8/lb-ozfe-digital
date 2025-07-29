import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Grid, Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const API_URL = 'http://localhost:8000/api';

const StatCard = ({ title, value, status, icon }) => {
  const getStatusColor = () => {
    if (!status) return 'text.secondary';
    status = String(status).toLowerCase();
    if (status === 'running' || status === 'up') return 'success.main';
    if (status === 'error' || status === 'not found' || status === 'restarting') return 'error.main';
    return 'warning.main';
  };

  return (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
      <Box sx={{ mr: 2, color: getStatusColor() }}>{icon}</Box>
      <Box>
        <Typography variant="h6" color="text.secondary">{title}</Typography>
        <Typography variant="h4" component="p" sx={{ color: getStatusColor(), fontWeight: 'bold' }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    service_count: 0,
    nginx_status: 'Loading...',
    api_status: 'Loading...'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
        const response = await axios.get(`${API_URL}/dashboard`);
        setStats(response.data);
        if(error) setError('');
    } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError('Could not connect to the backend API.');
        setStats(prev => ({ ...prev, api_status: 'Error', nginx_status: 'Unknown' }));
    } finally {
        setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StatCard title="Proxy Hosts" value={stats.service_count} icon={<DnsIcon sx={{ fontSize: 40 }} />} />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="NGINX Proxy Status" 
              value={stats.nginx_status} 
              status={stats.nginx_status} 
              icon={String(stats.nginx_status).toLowerCase().includes('up') ? <CheckCircleIcon sx={{ fontSize: 40 }} /> : <ErrorIcon sx={{ fontSize: 40 }} />} 
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard 
              title="Backend API Status" 
              value={stats.api_status} 
              status={stats.api_status} 
              icon={stats.api_status === 'Running' ? <CheckCircleIcon sx={{ fontSize: 40 }} /> : <ErrorIcon sx={{ fontSize: 40 }} />} 
            />
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;