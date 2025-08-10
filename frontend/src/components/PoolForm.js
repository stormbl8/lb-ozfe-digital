import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Box, TextField, Button, Select, MenuItem, FormControl, InputLabel,
    Grid, Typography, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const PoolForm = ({ editingPool, onFinished, apiUrl }) => {
    const blankPool = {
        name: '',
        backend_servers: [{ host: '', port: 80, max_fails: 3, fail_timeout: '10s' }],
        load_balancing_algorithm: 'round_robin',
        monitor_id: '', // <-- Add default value
    };

    const [formData, setFormData] = useState(blankPool);
    const [monitors, setMonitors] = useState([]); // <-- Add state for monitors
    const isEditing = !!(formData && formData.id);

    useEffect(() => {
        if (editingPool && editingPool.id) {
            setFormData(editingPool);
        } else if (editingPool) {
            setFormData(blankPool);
        }
    }, [editingPool]);

    // --- NEW useEffect to fetch monitors ---
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
        axios.get(`${apiUrl}/monitors`, authHeaders)
            .then(res => setMonitors(res.data))
            .catch(err => console.error("Failed to fetch monitors", err));
    }, [apiUrl]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleServerChange = (index, field, value) => {
        const newServers = [...formData.backend_servers];
        if (field === 'port' || field === 'max_fails') {
            newServers[index][field] = parseInt(value, 10) || 0;
        } else {
            newServers[index][field] = value;
        }
        setFormData(prev => ({ ...prev, backend_servers: newServers }));
    };

    const addServer = () => {
        setFormData(prev => ({ ...prev, backend_servers: [...prev.backend_servers, { host: '', port: 80, max_fails: 3, fail_timeout: '10s' }]}));
    };

    const removeServer = (index) => {
        setFormData(prev => ({ ...prev, backend_servers: prev.backend_servers.filter((_, i) => i !== index)}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Saving pool...');
        const payload = {
            ...formData,
            monitor_id: formData.monitor_id ? parseInt(formData.monitor_id, 10) : null,
            backend_servers: formData.backend_servers.filter(s => s.host && s.port),
        };
        
        const token = localStorage.getItem('access_token');
        const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };

        try {
            if (isEditing) {
                await axios.put(`${apiUrl}/pools/${formData.id}`, payload, authHeaders);
            } else {
                await axios.post(`${apiUrl}/pools`, payload, authHeaders);
            }
            toast.success('Pool saved successfully!', { id: toastId });
            setTimeout(onFinished, 1000);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="h5" gutterBottom>{isEditing ? `Editing Pool "${formData.name}"` : 'Add New Server Pool'}</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                    <TextField fullWidth label="Pool Name" name="name" value={formData.name} onChange={handleChange} required />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Load Balancing Algorithm</InputLabel>
                        <Select name="load_balancing_algorithm" value={formData.load_balancing_algorithm} onChange={handleChange} label="Load Balancing Algorithm">
                            <MenuItem value="round_robin">Round Robin</MenuItem>
                            <MenuItem value="least_conn">Least Connections</MenuItem>
                            <MenuItem value="ip_hash">IP Hash</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                {/* --- ADD THIS DROPDOWN --- */}
                <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Health Monitor</InputLabel>
                        <Select name="monitor_id" value={formData.monitor_id || ''} onChange={handleChange} label="Health Monitor">
                            <MenuItem value=""><em>None (Basic Check)</em></MenuItem>
                            {monitors.map(monitor => (
                                <MenuItem key={monitor.id} value={monitor.id}>{monitor.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle2">Backend Servers</Typography>
                </Grid>
                {formData.backend_servers.map((server, index) => (
                    <Grid item xs={12} container spacing={1} key={index} alignItems="center">
                        <Grid item xs><TextField fullWidth size="small" value={server.host} onChange={(e) => handleServerChange(index, 'host', e.target.value)} placeholder="Hostname / IP" required /></Grid>
                        <Grid item><TextField size="small" type="number" value={server.port} onChange={(e) => handleServerChange(index, 'port', e.target.value)} placeholder="Port" required sx={{width: 80}} /></Grid>
                        <Grid item><TextField size="small" type="number" label="Fails" value={server.max_fails} onChange={(e) => handleServerChange(index, 'max_fails', e.target.value)} sx={{width: 80}} /></Grid>
                        <Grid item><TextField size="small" label="Timeout" value={server.fail_timeout} onChange={(e) => handleServerChange(index, 'fail_timeout', e.target.value)} sx={{width: 80}} /></Grid>
                        <Grid item><Tooltip title="Remove Server"><IconButton onClick={() => removeServer(index)} disabled={formData.backend_servers.length <= 1}><DeleteIcon /></IconButton></Tooltip></Grid>
                    </Grid>
                ))}
                <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={addServer}>Add Backend Server</Button></Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button type="submit" variant="contained">Save</Button>
                <Button onClick={onFinished} variant="outlined">Cancel</Button>
            </Box>
        </Box>
    );
};

export default PoolForm;