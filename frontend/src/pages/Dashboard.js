import React from 'react';

const Dashboard = () => {
  return (
    <div>
      <h1 className="page-header">Dashboard</h1>
      <p>Welcome to your interactive load balancer control panel.</p>
      <div className="card">
        <h3>System Status</h3>
        <p>API Status: <span style={{color: 'green'}}>●</span> Connected</p>
        <p>NGINX Proxy Status: <span style={{color: 'green'}}>●</span> Running</p>
      </div>
    </div>
  );
};

export default Dashboard;