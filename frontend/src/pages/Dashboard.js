import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../App.css'; // Ensure styles are imported

const API_URL = 'http://localhost:8000/api';

const StatCard = ({ title, value, status }) => {
  const getStatusColor = () => {
    if (!status) return '#34495e'; // Default text color
    status = status.toLowerCase();
    if (status === 'running') return '#2ecc71'; // Green
    if (status === 'error' || status === 'not found') return '#e74c3c'; // Red
    return '#f39c12'; // Orange for other statuses
  };

  return (
    <div className="stat-card">
      <h3 className="stat-card-title">{title}</h3>
      <p className="stat-card-value" style={{ color: getStatusColor() }}>
        {value}
      </p>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    service_count: 0,
    nginx_status: 'Loading...',
    api_status: 'Loading...'
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
      setStats(prev => ({ ...prev, api_status: 'Error' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Optional: Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div>
      <h1 className="page-header">Dashboard</h1>
      <p>Welcome to your interactive load balancer control panel.</p>
      
      <div className="stat-card-container">
        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            <StatCard 
              title="Active Services" 
              value={stats.service_count} 
            />
            <StatCard 
              title="NGINX Proxy Status" 
              value={stats.nginx_status}
              status={stats.nginx_status}
            />
            <StatCard 
              title="Backend API Status" 
              value={stats.api_status}
              status={stats.api_status}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;