import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, RadioGroup, Radio,
    Checkbox, FormControlLabel, FormGroup, Grid, Typography, Divider, Alert
} from '@mui/material';

const NewProxyForm = ({ editingService, onFinished, apiUrl }) => {
    const blankService = {
        service_type: 'http',
        listen_port: '',
        domain_name: '',
        pool_id: '',
        gslb_service_id: '',
        datacenter_id: '',
        enabled: true,
        forward_scheme: 'http',
        websockets_support: true,
        waf_enabled: false,
        waf_ruleset_id: '',
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
    const [pools, setPools] = useState([]);
    const [datacenters, setDatacenters] = useState([]);
    const [gslbServices, setGslbServices] = useState([]);
    const [wafRulesets, setWafRulesets] = useState([]);
    const isEditing = !!(formData && formData.id);

    useEffect(() => {
        if (editingService && editingService.id) {
            setFormData({ ...editingService, basic_auth_pass: '' });
        } else if (editingService) {
            setFormData(blankService);
        }
    }, [editingService]);
    
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
        
        const fetchData = async () => {
            try {
                const [certsRes, poolsRes, datacentersRes, gslbServicesRes, wafRulesetsRes] = await Promise.all([
                    axios.get(`${apiUrl}/certificates`, authHeaders),
                    axios.get(`${apiUrl}/pools`, authHeaders),
                    axios.get(`${apiUrl}/gslb/datacenters`, authHeaders),
                    axios.get(`${apiUrl}/gslb/services`, authHeaders),
                    axios.get(`${apiUrl}/waf/rulesets`, authHeaders),
                ]);
                setCerts(certsRes.data);
                setPools(poolsRes.data);
                setDatacenters(datacentersRes.data);
                setGslbServices(gslbServicesRes.data);
                setWafRulesets(wafRulesetsRes.data);
            } catch (error) {
                toast.error('Failed to fetch required data.');
                console.error(error);
            }
        };
        fetchData();
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
            pool_id: formData.pool_id ? parseInt(formData.pool_id, 10) : null,
            gslb_service_id: formData.gslb_service_id ? parseInt(formData.gslb_service_id, 10) : null,
            waf_ruleset_id: formData.waf_ruleset_id ? parseInt(formData.waf_ruleset_id, 10) : null,
            datacenter_id: formData.datacenter_id ? parseInt(formData.datacenter_id, 10) : null,
            listen_port: formData.listen_port ? parseInt(formData.listen_port, 10) : null,
            access_list_ips: Array.isArray(formData.access_list_ips) ? formData.access_list_ips.filter(ip => ip.trim() !== '') : [],
        };
        
        const token = localStorage.getItem('access_token');
        const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };

        try {
            if (isEditing) {
                await axios.put(`${apiUrl}/services/${formData.id}`, payload, authHeaders);
            } else {
                await axios.post(`${apiUrl}/services`, payload, authHeaders);
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
                    <Grid item xs={12}><TextField fullWidth label="Domain Name" name="domain_name" value={formData.domain_name || ''} onChange={handleChange} required /></Grid>
                    
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Assign to Pool</InputLabel>
                            <Select name="pool_id" value={formData.pool_id || ''} onChange={handleChange} label="Assign to Pool" required>
                                {pools.map(pool => <MenuItem key={pool.id} value={pool.id}>{pool.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>GSLB Service</InputLabel>
                            <Select name="gslb_service_id" value={formData.gslb_service_id || ''} onChange={handleChange} label="GSLB Service" required>
                                <MenuItem value=""><em>None</em></MenuItem>
                                {gslbServices.map(service => <MenuItem key={service.id} value={service.id}>{service.domain_name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Datacenter</InputLabel>
                            <Select name="datacenter_id" value={formData.datacenter_id || ''} onChange={handleChange} label="Datacenter" required>
                                {datacenters.map(dc => <MenuItem key={dc.id} value={dc.id}>{dc.name} ({dc.location})</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Forward Scheme</InputLabel>
                            <Select name="forward_scheme" value={formData.forward_scheme} onChange={handleChange} label="Forward Scheme">
                                <MenuItem value="http">http</MenuItem>
                                <MenuItem value="https">https</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12}>
                        <FormGroup row>
                            <FormControlLabel control={<Checkbox checked={formData.websockets_support} onChange={handleChange} name="websockets_support" />} label="Websockets Support" />
                            <FormControlLabel control={<Checkbox checked={formData.waf_enabled} onChange={handleChange} name="waf_enabled" />} label="Enable WAF" />
                        </FormGroup>
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth disabled={!formData.waf_enabled}>
                            <InputLabel>WAF Ruleset</InputLabel>
                            <Select name="waf_ruleset_id" value={formData.waf_ruleset_id || ''} onChange={handleChange} label="WAF Ruleset">
                                <MenuItem value=""><em>Default Ruleset</em></MenuItem>
                                {wafRulesets.map(ruleset => <MenuItem key={ruleset.id} value={ruleset.id}>{ruleset.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    

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
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Datacenter</InputLabel>
                            <Select name="datacenter_id" value={formData.datacenter_id || ''} onChange={handleChange} label="Datacenter" required>
                                {datacenters.map(dc => <MenuItem key={dc.id} value={dc.id}>{dc.name} ({dc.location})</MenuItem>)}
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