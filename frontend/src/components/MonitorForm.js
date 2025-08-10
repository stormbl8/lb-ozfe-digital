import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Box, TextField, Button, Select, MenuItem, FormControl, InputLabel,
    Grid, Typography, RadioGroup, Radio, FormControlLabel
} from '@mui/material';

const MonitorForm = ({ editingMonitor, onFinished, apiUrl }) => {
    const blankMonitor = {
        name: '',
        type: 'http',
        interval: 15,
        timeout: 5,
        http_method: 'GET',
        path: '/',
        expected_status: 200,
        expected_body: '',
    };

    const [formData, setFormData] = useState(blankMonitor);
    const isEditing = !!(formData && formData.id);

    useEffect(() => {
        if (editingMonitor && editingMonitor.id) {
            setFormData(editingMonitor);
        } else if (editingMonitor) {
            setFormData(blankMonitor);
        }
    }, [editingMonitor]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Saving monitor...');
        const payload = {
            ...formData,
            interval: parseInt(formData.interval, 10),
            timeout: parseInt(formData.timeout, 10),
            expected_status: parseInt(formData.expected_status, 10),
        };
        
        const token = localStorage.getItem('access_token');
        const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };

        try {
            if (isEditing) {
                await axios.put(`${apiUrl}/monitors/${formData.id}`, payload, authHeaders);
            } else {
                await axios.post(`${apiUrl}/monitors`, payload, authHeaders);
            }
            toast.success('Monitor saved successfully!', { id: toastId });
            setTimeout(onFinished, 1000);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Typography variant="h5" gutterBottom>{isEditing ? `Editing Monitor "${formData.name}"` : 'Add New Monitor'}</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                    <TextField fullWidth label="Monitor Name" name="name" value={formData.name} onChange={handleChange} required />
                </Grid>
                
                <Grid item xs={12}>
                    <FormControl component="fieldset">
                        <Typography variant="subtitle2" component="legend">Type</Typography>
                        <RadioGroup row name="type" value={formData.type} onChange={handleChange}>
                            <FormControlLabel value="http" control={<Radio />} label="HTTP" />
                            <FormControlLabel value="tcp" control={<Radio />} label="TCP" />
                        </RadioGroup>
                    </FormControl>
                </Grid>

                <Grid item xs={6}>
                    <TextField fullWidth label="Interval (seconds)" name="interval" type="number" value={formData.interval} onChange={handleChange} required />
                </Grid>
                <Grid item xs={6}>
                    <TextField fullWidth label="Timeout (seconds)" name="timeout" type="number" value={formData.timeout} onChange={handleChange} required />
                </Grid>

                {formData.type === 'http' && (
                    <>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>HTTP Method</InputLabel>
                                <Select name="http_method" value={formData.http_method} onChange={handleChange} label="HTTP Method">
                                    <MenuItem value="GET">GET</MenuItem>
                                    <MenuItem value="POST">POST</MenuItem>
                                    <MenuItem value="HEAD">HEAD</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Path" name="path" value={formData.path} onChange={handleChange} required helperText="e.g., /healthz" />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Expected Status Code" name="expected_status" type="number" value={formData.expected_status} onChange={handleChange} required />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField fullWidth label="Expected Response Body (optional)" name="expected_body" value={formData.expected_body || ''} onChange={handleChange} helperText="e.g., OK" />
                        </Grid>
                    </>
                )}
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button type="submit" variant="contained">Save</Button>
                <Button onClick={onFinished} variant="outlined">Cancel</Button>
            </Box>
        </Box>
    );
};

export default MonitorForm;