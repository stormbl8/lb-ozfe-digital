import React from 'react';

const Settings = () => {
  return (
    <div>
      <h1 className="page-header">Settings</h1>
      <p>Manage global configurations for your load balancer.</p>
      
      <div className="card">
        <h3>API & Environment</h3>
        <p>These settings are loaded from your <strong>.env</strong> file and are not editable from the UI for security.</p>
        <div className="form-group">
          <label>Cloudflare Email</label>
          <input type="text" value="your-email@example.com" disabled />
        </div>
        <div className="form-group">
          <label>Cloudflare API Key</label>
          <input type="password" value="********************" disabled />
        </div>
      </div>

      <div className="card">
        <h3>Global Defaults</h3>
        <p>Set default values for new services, like rate limits or timeouts. (Functionality coming soon).</p>
      </div>
    </div>
  );
};

export default Settings;