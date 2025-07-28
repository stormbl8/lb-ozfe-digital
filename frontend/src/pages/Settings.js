import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const Settings = () => {
  const [readOnlySettings, setReadOnlySettings] = useState({ cloudflare_email: 'Loading...' });
  const [editableSettings, setEditableSettings] = useState({
    rate_limiting: { enabled: false, requests_per_second: 10, burst: 20 }
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      setReadOnlySettings(response.data.read_only);
      setEditableSettings(response.data.editable);
    } catch (error) {
      setMessage('Failed to load settings.');
      setIsError(true);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const [section, key] = name.split('.');
    
    setEditableSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: type === 'checkbox' ? checked : value
      }
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('Saving...');
    setIsError(false);
    try {
      await axios.post(`${API_URL}/settings`, editableSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    } catch (error) {
      setMessage(`Error saving settings: ${error.response?.data?.detail || error.message}`);
      setIsError(true);
    }
  };

  return (
    <div>
      <h1 className="page-header">Settings</h1>
      <p>Manage global configurations for your load balancer.</p>
      
      <form onSubmit={handleSave}>
        <div className="card">
          <h3>Environment Settings (Read-Only)</h3>
          <p>These values are set in your <code>.env</code> file on the server.</p>
          <div className="form-group">
            <label>Cloudflare Email</label>
            <input type="text" value={readOnlySettings.cloudflare_email} disabled />
          </div>
        </div>

        <div className="card">
          <h3>Global Rate Limiting</h3>
          <p>Set a default rate limit for services. This can be overridden per-service later.</p>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                name="rate_limiting.enabled"
                checked={editableSettings.rate_limiting.enabled}
                onChange={handleInputChange}
                style={{ width: 'auto', marginRight: '10px' }}
              />
              Enable Global Rate Limiting
            </label>
          </div>
          <div className="form-group">
            <label>Requests per Second</label>
            <input
              type="number"
              name="rate_limiting.requests_per_second"
              value={editableSettings.rate_limiting.requests_per_second}
              onChange={handleInputChange}
              disabled={!editableSettings.rate_limiting.enabled}
            />
          </div>
          <div className="form-group">
            <label>Burst (Number of requests allowed to exceed the rate)</label>
            <input
              type="number"
              name="rate_limiting.burst"
              value={editableSettings.rate_limiting.burst}
              onChange={handleInputChange}
              disabled={!editableSettings.rate_limiting.enabled}
            />
          </div>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <button type="submit">Save Settings</button>
          {message && <span style={{ marginLeft: '15px', color: isError ? 'red' : 'green' }}>{message}</span>}
        </div>
      </form>
    </div>
  );
};

export default Settings;