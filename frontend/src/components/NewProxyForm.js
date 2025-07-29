import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, RadioGroup, Radio,
    Checkbox, FormControlLabel, FormGroup, Grid, Typography, Divider
} from '@mui/material';

const NewProxyForm = ({ editingService, onFinished, apiUrl }) => {
    const blankService = {
        service_type: 'http',
        listen_port: '',
        domain_name: '',
        pool_id: '', // <-- Now uses pool_id
        enabled: true,
        forward_scheme: 'http',
        websockets_support: true,
        waf_enabled: false,
        certificate_name: 'dummy',
        force_ssl: true,
        http2_support: true,
        hsts_enabled: false,
        hsts_subdomains: false,
        access_list_ips: [],
        access_list_type: 'allow',
        basic_auth_user: '',
        basic_auth_pass: '',
        advanced_config: '',
    };

    const [formData, setFormData] = useState(blankService);
    const [certs, setCerts] = useState([]);
    const [pools, setPools] = useState([]); // <-- NEW STATE FOR POOLS
    const isEditing = !!(formData && formData.id);

    useEffect(() => {
        if (editingService && editingService.id) {
            setFormData({ ...editingService, basic_auth_pass: '' });
        } else if (editingService) {
            setFormData(blankService);
        }
    }, [editingService]);
    
    useEffect(() => {
        axios.get(`${apiUrl}/certificates`).then(res => setCerts(res.data));
        axios.get(`${apiUrl}/pools`).then(res => setPools(res.data)); // <-- FETCH POOLS
    }, [apiUrl]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Saving...');

        const payload = {
            ...formData,
            pool_id: parseInt(formData.pool_id, 10),
            listen_port: formData.listen_port ? parseInt(formData.listen_port, 10) : null,
            access_list_ips: Array.isArray(formData.access_list_ips) ? formData.access_list_ips.filter(ip => ip.trim() !== '') : [],
        };

        try {
            if (isEditing) {
                await axios.put(`${apiUrl}/services/${formData.id}`, payload);
            } else {
                await axios.post(`${apiUrl}/services`, payload);
            }
            toast.success('Proxy Host saved successfully!', { id: toastId });
            setTimeout(onFinished, 1000);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };
    
    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
             <Typography variant="h5" gutterBottom>{isEditing ? `Editing Proxy Host` : 'Add New Proxy Host'}</Typography>
            
            <FormControl component="fieldset" fullWidth margin="normal">
                <Typography variant="subtitle1" component="legend" gutterBottom>Service Type</Typography>
                <RadioGroup row name="service_type" value={formData.service_type} onChange={handleChange}>
                    <FormControlLabel value="http" control={<Radio />} label="HTTP Proxy" />
                    <FormControlLabel value="tcp" control={<Radio />} label="TCP Stream" />
                    <FormControlLabel value="udp" control={<Radio />} label="UDP Stream" />
                </RadioGroup>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            {formData.service_type === 'http' ? (
                <Grid container spacing={3}>
                    {/* Details Section */}
                    <Grid item xs={12}><Typography variant="h6">Details</Typography></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Domain Name" name="domain_name" value={formData.domain_name || ''} onChange={handleChange} required /></Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Assign to Pool</InputLabel>
                            <Select name="pool_id" value={formData.pool_id || ''} onChange={handleChange} label="Assign to Pool" required>
                                {pools.map(pool => <MenuItem key={pool.id} value={pool.id}>{pool.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}><FormGroup row><FormControlLabel control={<Checkbox checked={formData.websockets_support} onChange={handleChange} name="websockets_support" />} label="Websockets Support" /><FormControlLabel control={<Checkbox checked={formData.waf_enabled} onChange={handleChange} name="waf_enabled" />} label="Block Common Exploits (WAF)" /></FormGroup></Grid>

                    {/* SSL Section */}
                    <Grid item xs={12}><Divider sx={{ my: 2 }} /><Typography variant="h6">SSL</Typography></Grid>
                    <Grid item xs={12}><FormControl fullWidth><InputLabel>SSL Certificate</InputLabel><Select name="certificate_name" value={formData.certificate_name} onChange={handleChange} label="SSL Certificate"><MenuItem value="dummy">None (Dummy Self-Signed)</MenuItem>{certs.map(cert => <MenuItem key={cert} value={cert}>{cert}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid item xs={12}><FormGroup row><FormControlLabel control={<Checkbox checked={formData.force_ssl} onChange={handleChange} name="force_ssl" />} label="Force SSL" /><FormControlLabel control={<Checkbox checked={formData.http2_support} onChange={handleChange} name="http2_support" />} label="HTTP/2 Support" /><FormControlLabel control={<Checkbox checked={formData.hsts_enabled} onChange={handleChange} name="hsts_enabled" />} label="HSTS Enabled" /><FormControlLabel control={<Checkbox checked={formData.hsts_subdomains} onChange={handleChange} name="hsts_subdomains" disabled={!formData.hsts_enabled} />} label="HSTS Subdomains" /></FormGroup></Grid>
                
                    {/* Access Section */}
                    <Grid item xs={12}><Divider sx={{ my: 2 }} /><Typography variant="h6">Access</Typography></Grid>
                     <Grid item xs={12} md={6}><TextField fullWidth label="Basic Auth Username" name="basic_auth_user" value={formData.basic_auth_user || ''} onChange={handleChange} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth type="password" label="Basic Auth Password" name="basic_auth_pass" value={formData.basic_auth_pass || ''} onChange={handleChange} helperText="Enter to set or change" /></Grid>
                </Grid>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={12}><Typography variant="h6">Stream Details</Typography></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Listen Port" name="listen_port" type="number" value={formData.listen_port || ''} onChange={handleChange} required helperText="e.g., 10000-10100" /></Grid>
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Assign to Pool</InputLabel>
                            <Select name="pool_id" value={formData.pool_id || ''} onChange={handleChange} label="Assign to Pool" required>
                                {pools.map(pool => <MenuItem key={pool.id} value={pool.id}>{pool.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button type="submit" variant="contained">Save</Button>
                <Button onClick={onFinished} variant="outlined">Cancel</Button>
            </Box>
        </Box>
    );
};

export default NewProxyForm;