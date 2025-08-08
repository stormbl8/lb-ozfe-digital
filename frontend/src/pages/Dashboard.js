import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Grid, Paper, Typography, Box, CircularProgress, Alert,
  Card, CardContent
} from '@mui/material';
import DnsIcon from '@mui/icons-material/Dns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SpeedIcon from '@mui/icons-material/Speed';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckIcon from '@mui/icons-material/Check';
import WarningIcon from '@mui/icons-material/Warning';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, ArcElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, ArcElement);

const API_URL = 'http://localhost:8000/api';

const StatCard = ({ title, value, status, icon }) => {
  const getStatusColor = () => {
    if (!status) return 'text.secondary';
    status = String(status).toLowerCase();
    if (status.includes('running') || status.includes('up') || status.includes('online')) return 'success.main';
    if (status === 'error' || status === 'not found' || status.includes('restarting') || status.includes('offline')) return 'error.main';
    return 'warning.main';
  };

  return (
    <Card elevation={3} sx={{ p: 2, display: 'flex', alignItems: 'center', height: '100%' }}>
      <Box sx={{ mr: 2, color: getStatusColor() }}>{icon}</Box>
      <Box>
        <Typography variant="h6" color="text.secondary">{title}</Typography>
        <Typography variant="h4" component="p" sx={{ color: getStatusColor(), fontWeight: 'bold' }}>
          {value}
        </Typography>
      </Box>
    </Card>
  );
};

const StatItem = ({ label, value, unit = '' }) => (
    <Grid item xs={12} sm={6} md={3}>
        <Card elevation={1}>
            <CardContent>
                <Typography color="text.secondary" gutterBottom>
                    {label}
                </Typography>
                <Typography variant="h5" component="div">
                    {value}
                    {unit && <span style={{fontSize: '0.8em', color: '#777', marginLeft: '4px'}}>{unit}</span>}
                </Typography>
            </CardContent>
        </Card>
    </Grid>
);


const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: { beginAtZero: true, ticks: { color: '#666' } },
    x: { ticks: { color: '#666' } }
  },
  plugins: { legend: { labels: { color: '#333' } } }
};

const MAX_DATA_POINTS = 30;

const Dashboard = () => {
  const [stats, setStats] = useState({
    service_count: 0,
    nginx_status: 'Loading...',
    api_status: 'Loading...',
    stats: {
        active_connections: 0,
        requests: 0,
        reading: 0,
        writing: 0,
        waiting: 0,
        http_2xx: 0,
        http_3xx: 0,
        http_4xx: 0,
        http_5xx: 0,
        latency_ms: 0,
        bandwidth_mbps: 0
    }
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

  const [statusCodeData, setStatusCodeData] = useState({
    labels: ['2xx', '3xx', '4xx', '5xx'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c'],
      hoverOffset: 4
    }]
  });

  const fetchData = useCallback(async () => {
    try {
        const response = await axios.get(`${API_URL}/dashboard`);
        const data = response.data;
        setStats(data);

        setChartData(prevData => {
            const now = new Date();
            const newLabels = [...prevData.labels, now.toLocaleTimeString()];
            
            const newConnectionsData = [...prevData.datasets[0].data, data.stats.active_connections];

            const lastTotalRequests = prevData.datasets[1].totalRequests || 0;
            const requestsInInterval = data.stats.requests - lastTotalRequests;
            const newRequestsData = [...prevData.datasets[1].data, requestsInInterval >= 0 ? requestsInInterval : 0];

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

        setStatusCodeData(prev => ({
            ...prev,
            datasets: [{
                ...prev.datasets[0],
                data: [
                    data.stats.http_2xx,
                    data.stats.http_3xx,
                    data.stats.http_4xx,
                    data.stats.http_5xx,
                ]
            }]
        }));

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
    const interval = setInterval(fetchData, 10000);
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
              icon={stats.nginx_status === 'Running' ? <CheckCircleIcon sx={{ fontSize: 40 }} /> : <ErrorIcon sx={{ fontSize: 40 }} />} 
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

          {/* New Detailed Stats */}
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Real-time Statistics</Typography>
              <Grid container spacing={2}>
                  <StatItem label="Active Connections" value={stats.stats.active_connections} />
                  <StatItem label="Reading" value={stats.stats.reading} />
                  <StatItem label="Writing" value={stats.stats.writing} />
                  <StatItem label="Waiting" value={stats.stats.waiting} />
                  <StatItem label="Latency" value={stats.stats.latency_ms.toFixed(2)} unit="ms" />
                  <StatItem label="Bandwidth" value={stats.stats.bandwidth_mbps.toFixed(2)} unit="Mbps" />
                  <StatItem label="Total Requests" value={stats.stats.requests} />
              </Grid>
            </Paper>
          </Grid>

          {/* Chart Section */}
          <Grid item xs={12} md={8}>
              <Paper elevation={3} sx={{ p: 2, height: '400px' }}>
                <Typography variant="h6" gutterBottom>Live Connections & Requests</Typography>
                <Box sx={{ height: '320px' }}>
                  <Line options={chartOptions} data={chartData} />
                </Box>
              </Paper>
          </Grid>
          
          {/* Status Code Chart */}
          <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 2, height: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography variant="h6" gutterBottom>HTTP Status Codes</Typography>
                <Box sx={{ maxWidth: '300px', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut data={statusCodeData} />
                </Box>
              </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;