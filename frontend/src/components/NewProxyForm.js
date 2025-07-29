import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, RadioGroup, Radio,
    Checkbox, FormControlLabel, FormGroup, Grid, Typography, Divider, IconButton, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const NewProxyForm = ({ editingService, onFinished, apiUrl }) => {
    const blankService = {
        service_type: 'http',
        listen_port: '',
        domain_name: '',
        backend_servers: [{ host: '', port: 80, max_fails: 3, fail_timeout: '10s' }],
        load_balancing_algorithm: 'round_robin',
        enabled: true,
        forward_scheme: 'http',
        cache_assets: false,
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
    const isEditing = !!(formData && formData.id);

    useEffect(() => {
        if (editingService && editingService.id) {
            const servers = editingService.backend_servers && editingService.backend_servers.length > 0
                ? editingService.backend_servers
                : [{ host: '', port: 80, max_fails: 3, fail_timeout: '10s' }];
            setFormData({ ...editingService, backend_servers: servers, basic_auth_pass: '' });
        } else if (editingService) {
            setFormData(blankService);
        }
    }, [editingService]);
    
    useEffect(() => {
        axios.get(`${apiUrl}/certificates`).then(res => setCerts(res.data));
    }, [apiUrl]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
        const toastId = toast.loading('Saving...');

        const payload = {
            ...formData,
            listen_port: formData.listen_port ? parseInt(formData.listen_port, 10) : null,
            access_list_ips: Array.isArray(formData.access_list_ips) ? formData.access_list_ips.filter(ip => ip.trim() !== '') : [],
            backend_servers: formData.backend_servers.filter(s => s.host && s.port),
        };

        try {
            if (isEditing) {
                await axios.put(`${apiUrl}/services/${formData.id}`, payload);
            } else {
                await axios.post(`${apiUrl}/services`, payload);
            }
            toast.success(isEditing ? 'Service updated successfully!' : 'Service added successfully!', { id: toastId });
            setTimeout(onFinished, 1000);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };
    
    return (
        <Box component="form" onSubmit={handleSubmit} noValidate> 
            <Typography variant="h5" gutterBottom>{isEditing ? `Editing Service #${formData.id}` : 'Add New Service'}</Typography>
            
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
                    <Grid item xs={12}><TextField fullWidth label="Domain Name" name="domain_name" value={formData.domain_name || ''} onChange={handleChange} required /></Grid>
                    <Grid item xs={12}><Typography variant="subtitle2">Backend Server Pool</Typography></Grid>
                    {formData.backend_servers.map((server, index) => (
                        <Grid item xs={12} container spacing={1} key={index} alignItems="center">
                            <Grid item><FormControl size="small"><Select name="forward_scheme" value={formData.forward_scheme} onChange={handleChange}><MenuItem value="http">http</MenuItem><MenuItem value="https">https</MenuItem></Select></FormControl></Grid>
                            <Grid item xs><TextField fullWidth size="small" value={server.host} onChange={(e) => handleServerChange(index, 'host', e.target.value)} placeholder="Hostname / IP" required /></Grid>
                            <Grid item><TextField size="small" type="number" value={server.port} onChange={(e) => handleServerChange(index, 'port', e.target.value)} placeholder="Port" required sx={{width: 80}} /></Grid>
                            <Grid item><TextField size="small" type="number" label="Fails" value={server.max_fails} onChange={(e) => handleServerChange(index, 'max_fails', e.target.value)} sx={{width: 80}} /></Grid>
                            <Grid item><TextField size="small" label="Timeout" value={server.fail_timeout} onChange={(e) => handleServerChange(index, 'fail_timeout', e.target.value)} sx={{width: 80}} /></Grid>
                            <Grid item><Tooltip title="Remove Server"><IconButton onClick={() => removeServer(index)} disabled={formData.backend_servers.length <= 1}><DeleteIcon /></IconButton></Tooltip></Grid>
                        </Grid>
                    ))}
                    <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={addServer}>Add Backend Server</Button></Grid>
                    <Grid item xs={12} md={6}><FormControl fullWidth><InputLabel>Load Balancing Algorithm</InputLabel><Select name="load_balancing_algorithm" value={formData.load_balancing_algorithm} onChange={handleChange} label="Load Balancing Algorithm"><MenuItem value="round_robin">Round Robin</MenuItem><MenuItem value="least_conn">Least Connections</MenuItem><MenuItem value="ip_hash">IP Hash</MenuItem></Select></FormControl></Grid>
                    <Grid item xs={12}><FormGroup row><FormControlLabel control={<Checkbox checked={formData.websockets_support} onChange={handleChange} name="websockets_support" />} label="Websockets Support" /><FormControlLabel control={<Checkbox checked={formData.waf_enabled} onChange={handleChange} name="waf_enabled" />} label="Block Common Exploits (WAF)" /></FormGroup></Grid>

                    {/* SSL Section */}
                    <Grid item xs={12}><Divider sx={{ my: 2 }} /><Typography variant="h6">SSL</Typography></Grid>
                    <Grid item xs={12}><FormControl fullWidth><InputLabel>SSL Certificate</InputLabel><Select name="certificate_name" value={formData.certificate_name} onChange={handleChange} label="SSL Certificate"><MenuItem value="dummy">None (Dummy Self-Signed)</MenuItem>{certs.map(cert => <MenuItem key={cert} value={cert}>{cert}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid item xs={12}><FormGroup row><FormControlLabel control={<Checkbox checked={formData.force_ssl} onChange={handleChange} name="force_ssl" />} label="Force SSL" /><FormControlLabel control={<Checkbox checked={formData.http2_support} onChange={handleChange} name="http2_support" />} label="HTTP/2 Support" /><FormControlLabel control={<Checkbox checked={formData.hsts_enabled} onChange={handleChange} name="hsts_enabled" />} label="HSTS Enabled" /><FormControlLabel control={<Checkbox checked={formData.hsts_subdomains} onChange={handleChange} name="hsts_subdomains" disabled={!formData.hsts_enabled} />} label="HSTS Subdomains" /></FormGroup></Grid>
                
                    {/* Access Section */}
                    <Grid item xs={12}><Divider sx={{ my: 2 }} /><Typography variant="h6">Access</Typography></Grid>
                    <Grid item xs={12}><FormControl fullWidth><InputLabel>Access List Type</InputLabel><Select name="access_list_type" value={formData.access_list_type} onChange={handleChange} label="Access List Type"><MenuItem value="allow">Allow these IPs</MenuItem><MenuItem value="deny">Deny these IPs</MenuItem></Select></FormControl></Grid>
                    <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Access List IPs" name="access_list_ips" value={Array.isArray(formData.access_list_ips) ? formData.access_list_ips.join('\n') : ''} onChange={(e) => setFormData(prev => ({...prev, access_list_ips: e.target.value.split('\n')}))} placeholder="Enter one IP or CIDR per line, e.g., 192.168.1.100 or 10.0.0.0/24" /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth label="Basic Auth Username" name="basic_auth_user" value={formData.basic_auth_user || ''} onChange={handleChange} /></Grid>
                    <Grid item xs={12} md={6}><TextField fullWidth type="password" label="Basic Auth Password" name="basic_auth_pass" value={formData.basic_auth_pass || ''} onChange={handleChange} helperText="Enter to set or change" /></Grid>
                </Grid>
            ) : (
                <Grid container spacing={2}>
                    <Grid item xs={12}><Typography variant="h6">Stream Details</Typography></Grid>
                    <Grid item xs={12}><TextField fullWidth label="Listen Port" name="listen_port" type="number" value={formData.listen_port || ''} onChange={handleChange} required helperText="The port the proxy will listen on. Must be within the exposed range (e.g., 10000-10100)." /></Grid>
                    <Grid item xs={12}><Typography variant="subtitle2">Backend Server Pool</Typography></Grid>
                     {formData.backend_servers.map((server, index) => (
                        <Grid item xs={12} container spacing={1} key={index} alignItems="center">
                            <Grid item xs><TextField fullWidth size="small" value={server.host} onChange={(e) => handleServerChange(index, 'host', e.target.value)} placeholder="Hostname / IP" required /></Grid>
                            <Grid item><TextField size="small" type="number" value={server.port} onChange={(e) => handleServerChange(index, 'port', e.target.value)} placeholder="Port" required sx={{width: 100}} /></Grid>
                            <Grid item><Tooltip title="Remove Server"><IconButton onClick={() => removeServer(index)} disabled={formData.backend_servers.length <= 1}><DeleteIcon /></IconButton></Tooltip></Grid>
                        </Grid>
                    ))}
                    <Grid item xs={12}><Button startIcon={<AddIcon />} onClick={addServer}>Add Backend Server</Button></Grid>
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