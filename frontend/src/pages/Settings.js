import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Button, TextField, Checkbox, FormControlLabel, Alert, Grid, Divider, Tooltip, IconButton, CircularProgress } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import toast from 'react-hot-toast';
import api from '../api'; // Import the api instance

const Settings = ({ aiEnabled }) => {
  const [editableSettings, setEditableSettings] = useState({
    cloudflare_email: '',
    cloudflare_api_key: '',
    rate_limiting: { enabled: false, requests_per_second: 10, burst: 20 }
  });
  const [aiSettings, setAiSettings] = useState({
    alert_enabled: false,
    alert_channels: [],
    slack_webhook_url: '',
    email_recipients: '',
    alert_threshold_zscore: 2.0,
    alert_cooldown_minutes: 5,
    action_enabled: false,
    action_rules: '[]',
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [aiLoading, setAiLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const [settingsRes, userRes] = await Promise.all([
          api.get('/settings'),
          api.get('/auth/users/me')
      ]);
      setEditableSettings(settingsRes.data.editable);
      setIsAdmin(userRes.data.role === 'admin');
    } catch (error) {
      toast.error('Failed to load settings.');
    }
  }, []);

  const fetchAiSettings = useCallback(async () => {
    try {
      setAiLoading(true);
      const response = await api.get('/ai_config');
      const data = response.data;
      setAiSettings({
          ...data,
          email_recipients: data.email_recipients ? data.email_recipients.join(', ') : '',
          action_rules: JSON.stringify(data.action_rules, null, 2),
      });
      setAiLoading(false);
    } catch (error) {
      toast.error('Failed to fetch AI settings.');
      console.error('Error fetching AI settings:', error);
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchAiSettings();
  }, [fetchSettings, fetchAiSettings]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const [section, key] = name.split('.');
    
    if (section === 'rate_limiting') {
        setEditableSettings(prev => ({
            ...prev,
            rate_limiting: {
                ...prev.rate_limiting,
                [key]: type === 'checkbox' ? checked : value
            }
        }));
    } else {
        setEditableSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    }
  };

  const handleAiChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAiSettings(prevSettings => ({
        ...prevSettings,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAiChannelChange = (e) => {
    const { value, checked } = e.target;
    setAiSettings(prevSettings => {
        const currentChannels = new Set(prevSettings.alert_channels);
        if (checked) {
            currentChannels.add(value);
        } else {
            currentChannels.delete(value);
        }
        return { ...prevSettings, alert_channels: Array.from(currentChannels) };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Saving all settings...');
    try {
      // Save general settings
      await api.post('/settings', editableSettings);

      // Save AI settings
      const aiPayload = {
          ...aiSettings,
          email_recipients: aiSettings.email_recipients.split(',').map(s => s.trim()).filter(s => s),
          action_rules: JSON.parse(aiSettings.action_rules),
      };
      await api.put('/ai_config', aiPayload);

      toast.success('All settings saved successfully!', { id: toastId });
      fetchSettings(); // Re-fetch to ensure consistency
      fetchAiSettings(); // Re-fetch to ensure consistency
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message;
      toast.error(`Error saving settings: ${errorMessage}`, { id: toastId });
      console.error('Error saving settings:', error);
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
          <Typography variant="h6" gutterBottom>Cloudflare Credentials</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            These credentials are required for automated Let's Encrypt DNS-01 challenges.
          </Typography>
          <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                  <TextField
                      fullWidth
                      size="small"
                      label="Cloudflare Email"
                      name="cloudflare_email"
                      value={editableSettings.cloudflare_email}
                      onChange={handleInputChange}
                      disabled={!isAdmin}
                  />
              </Grid>
              <Grid item xs={12} md={6}>
                  <TextField
                      fullWidth
                      size="small"
                      label="Cloudflare API Key"
                      name="cloudflare_api_key"
                      value={editableSettings.cloudflare_api_key}
                      onChange={handleInputChange}
                      disabled={!isAdmin}
                  />
              </Grid>
          </Grid>
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
                    disabled={!isAdmin}
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
                disabled={!editableSettings.rate_limiting.enabled || !isAdmin}
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
                disabled={!editableSettings.rate_limiting.enabled || !isAdmin}
                type="number"
              />
            </Grid>
          </Grid>
        </Paper>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>AI Anomaly Detection Settings</Typography>
          {aiLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={aiSettings.alert_enabled}
                      onChange={handleAiChange}
                      name="alert_enabled"
                    />
                  }
                  label="Enable Alerting"
                />
                <Tooltip title="Enables or disables AI-driven anomaly alerting.">
                  <IconButton size="small">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>

              {aiSettings.alert_enabled && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1">Alert Channels</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        value="slack"
                        checked={aiSettings.alert_channels.includes('slack')}
                        onChange={handleAiChannelChange}
                      />
                    }
                    label="Slack"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        value="email"
                        checked={aiSettings.alert_channels.includes('email')}
                        onChange={handleAiChannelChange}
                      />
                    }
                    label="Email"
                  />
                  <Tooltip title="Select the channels through which anomaly alerts will be sent.">
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}

              {aiSettings.alert_enabled && aiSettings.alert_channels.includes('slack') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Slack Webhook URL"
                    name="slack_webhook_url"
                    value={aiSettings.slack_webhook_url}
                    onChange={handleAiChange}
                    placeholder="Enter Slack Webhook URL"
                  />
                  <Tooltip title="The Slack webhook URL to send anomaly alerts to.">
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}

              {aiSettings.alert_enabled && aiSettings.alert_channels.includes('email') && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email Recipients (comma-separated)"
                    name="email_recipients"
                    value={aiSettings.email_recipients}
                    onChange={handleAiChange}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <Tooltip title="Comma-separated list of email addresses to send anomaly alerts to.">
                    <IconButton size="small">
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Alert Threshold (Z-score)"
                  name="alert_threshold_zscore"
                  value={aiSettings.alert_threshold_zscore}
                  onChange={handleAiChange}
                  type="number"
                />
                <Tooltip title="The Z-score threshold for anomaly detection. Higher values mean fewer, but more significant, alerts.">
                  <IconButton size="small">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Alert Cooldown (Minutes)"
                  name="alert_cooldown_minutes"
                  value={aiSettings.alert_cooldown_minutes}
                  onChange={handleAiChange}
                  type="number"
                />
                <Tooltip title="The minimum time in minutes between consecutive alerts for the same anomaly.">
                  <IconButton size="small">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={aiSettings.action_enabled}
                      onChange={handleAiChange}
                      name="action_enabled"
                    />
                  }
                  label="Enable Automated Actions"
                />
                <Tooltip title="Enables or disables automated actions based on detected anomalies.">
                  <IconButton size="small">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={5}
                  label="Action Rules (JSON Array)"
                  name="action_rules"
                  value={aiSettings.action_rules}
                  onChange={handleAiChange}
                  helperText={`Example: [{"anomaly_method": "isolation_forest", "metric": "sum(rate(nginx_http_requests_total[5m]))", "action": "restart_nginx"}]`}
                />
                <Tooltip title="Define rules for automated actions in JSON format. Each rule specifies an anomaly method, a metric, and an action to take.">
                  <IconButton size="small">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          )}
        </Paper>
        
        <Box sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={!isAdmin}>Save Settings</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Settings;