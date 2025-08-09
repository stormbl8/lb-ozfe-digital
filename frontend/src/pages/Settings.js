import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Box, Paper, Typography, Button, TextField, Checkbox, FormControlLabel, Alert, Grid } from '@mui/material';
import toast from 'react-hot-toast';

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
      toast.error('Failed to load settings.');
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
    const toastId = toast.loading('Saving settings...');
    try {
      const token = localStorage.getItem('access_token');
      const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
      await axios.post(`${API_URL}/settings`, editableSettings, authHeaders);
      toast.success('Settings saved successfully!', { id: toastId });
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message;
      toast.error(`Error saving settings: ${errorMessage}`, { id: toastId });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Manage global configurations for your load balancer.
      </Typography>
      
      <Box component="form" onSubmit={handleSave}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Environment Settings (Read-Only)</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            These values are set in your <code>.env</code> file on the server.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Cloudflare Email"
            value={readOnlySettings.cloudflare_email}
            disabled
          />
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Global Rate Limiting</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Set a default rate limit for services. This can be overridden per-service later.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editableSettings.rate_limiting.enabled}
                    onChange={handleInputChange}
                    name="rate_limiting.enabled"
                  />
                }
                label="Enable Global Rate Limiting"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Requests per Second"
                name="rate_limiting.requests_per_second"
                value={editableSettings.rate_limiting.requests_per_second}
                onChange={handleInputChange}
                disabled={!editableSettings.rate_limiting.enabled}
                type="number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Burst (Number of requests allowed to exceed the rate)"
                name="rate_limiting.burst"
                value={editableSettings.rate_limiting.burst}
                onChange={handleInputChange}
                disabled={!editableSettings.rate_limiting.enabled}
                type="number"
              />
            </Grid>
          </Grid>
        </Paper>
        
        <Box sx={{ mt: 3 }}>
          <Button type="submit" variant="contained">Save Settings</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;