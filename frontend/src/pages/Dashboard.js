import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Grid, Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale
} from 'chart.js';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale);

const API_URL = 'http://localhost:8000/api';

const StatCard = ({ title, value, status, icon }) => {
  const getStatusColor = () => {
    if (!status) return 'text.secondary';
    status = String(status).toLowerCase();
    if (status.includes('running') || status.includes('up')) return 'success.main';
    if (status === 'error' || status === 'not found' || status.includes('restarting')) return 'error.main';
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

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, ticks: { color: '#666' } },
    x: { ticks: { color: '#666' } }
  },
  plugins: { legend: { labels: { color: '#333' } } }
};

const MAX_DATA_POINTS = 30; // Show last 5 minutes of data (30 points * 10s interval)

const Dashboard = () => {
  const [stats, setStats] = useState({
    service_count: 0,
    nginx_status: 'Loading...',
    api_status: 'Loading...',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Active Connections',
        data: [],
        borderColor: 'rgb(52, 152, 219)',
        backgroundColor: 'rgba(52, 152, 219, 0.5)',
      },
      {
        label: 'Requests / 10s',
        data: [],
        borderColor: 'rgb(46, 204, 113)',
        backgroundColor: 'rgba(46, 204, 113, 0.5)',
      },
    ],
  });

  const fetchData = useCallback(async () => {
    try {
        const response = await axios.get(`${API_URL}/dashboard`);
        const data = response.data;
        setStats(data);

        // Update chart data
        setChartData(prevData => {
            const now = new Date();
            const newLabels = [...prevData.labels, now.toLocaleTimeString()];
            
            const newConnectionsData = [...prevData.datasets[0].data, data.stats.active_connections];

            const lastTotalRequests = prevData.datasets[1].totalRequests || 0;
            const requestsInInterval = data.stats.requests - lastTotalRequests;
            const newRequestsData = [...prevData.datasets[1].data, requestsInInterval >= 0 ? requestsInInterval : 0];

            // Limit data points
            if (newLabels.length > MAX_DATA_POINTS) {
              newLabels.shift();
              newConnectionsData.shift();
              newRequestsData.shift();
            }

            return {
              labels: newLabels,
              datasets: [
                { ...prevData.datasets[0], data: newConnectionsData },
                { ...prevData.datasets[1], data: newRequestsData, totalRequests: data.stats.requests }
              ]
            };
        });

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
      {loading && !stats.nginx_status ? (
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
              icon={<CheckCircleIcon sx={{ fontSize: 40 }} />} 
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

          {/* Chart Section */}
          <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 2, height: '400px' }}>
                <Typography variant="h6" gutterBottom>Live Statistics</Typography>
                <Box sx={{ height: '320px' }}>
                  <Line options={chartOptions} data={chartData} />
                </Box>
              </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;