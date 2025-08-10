import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import {
    Box, Grid, Paper, Typography, CircularProgress, Alert, Breadcrumbs, Link, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const API_URL = 'http://localhost:8000/api';

const statusStyles = {
    Online: { color: '#2ecc71', icon: <CheckCircleIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> },
    Offline: { color: '#e74c3c', icon: <CancelIcon sx={{ fontSize: '1rem', mr: 0.5 }} /> },
    Unknown: { color: '#bdc3c7' }
};

const DetailItem = ({ title, children }) => (
    <Grid item xs={12} sm={6} md={4}>
        <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        <Typography variant="body1">{children || 'N/A'}</Typography>
    </Grid>
);

const ServiceDetail = () => {
    const { serviceId } = useParams();
    const [service, setService] = useState(null);
    const [pool, setPool] = useState(null);
    const [monitor, setMonitor] = useState(null);
    const [datacenter, setDatacenter] = useState(null); // NEW STATE
    const [gslbService, setGslbService] = useState(null); // NEW STATE
    const [health, setHealth] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
            
            const [serviceRes, poolsRes, healthRes, monitorsRes, datacentersRes, gslbServicesRes] = await Promise.all([
                axios.get(`${API_URL}/services/${serviceId}`, authHeaders),
                axios.get(`${API_URL}/pools`, authHeaders),
                axios.get(`${API_URL}/health`, authHeaders),
                axios.get(`${API_URL}/monitors`, authHeaders),
                axios.get(`${API_URL}/gslb/datacenters`, authHeaders), // NEW FETCH
                axios.get(`${API_URL}/gslb/services`, authHeaders)    // NEW FETCH
            ]);

            const currentService = serviceRes.data;
            setService(currentService);
            setHealth(healthRes.data);

            if (currentService.pool_id) {
                const associatedPool = poolsRes.data.find(p => p.id === currentService.pool_id);
                setPool(associatedPool);
                if (associatedPool && associatedPool.monitor_id) {
                    const associatedMonitor = monitorsRes.data.find(m => m.id === associatedPool.monitor_id);
                    setMonitor(associatedMonitor);
                }
            }

            // NEW LOGIC TO FIND DATACENTER AND GSLB SERVICE
            if (currentService.datacenter_id) {
                const associatedDatacenter = datacentersRes.data.find(dc => dc.id === currentService.datacenter_id);
                setDatacenter(associatedDatacenter);
            }
            if (currentService.gslb_service_id) {
                const associatedGslbService = gslbServicesRes.data.find(gslb => gslb.id === currentService.gslb_service_id);
                setGslbService(associatedGslbService);
            }
            
            setError('');
        } catch (err) {
            setError('Failed to fetch service details.');
        } finally {
            setLoading(false);
        }
    }, [serviceId]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
             axios.get(`${API_URL}/health`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } })
                .then(res => setHealth(res.data));
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);

    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!service) return <Alert severity="info">Service not found.</Alert>;

    const serviceIdentifier = service.domain_name || `Stream on Port ${service.listen_port}`;

    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <Link component={RouterLink} underline="hover" color="inherit" to="/services">
                    Proxy Hosts
                </Link>
                <Typography color="text.primary">{serviceIdentifier}</Typography>
            </Breadcrumbs>
            <Typography variant="h4" gutterBottom>Virtual Server: {serviceIdentifier}</Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Configuration Details</Typography>
                <Grid container spacing={2}>
                    <DetailItem title="Status">{service.enabled ? <Chip label="Enabled" color="success" size="small" /> : <Chip label="Disabled" size="small" />}</DetailItem>
                    <DetailItem title="Service Type">{service.service_type.toUpperCase()}</DetailItem>
                    <DetailItem title="Forward Scheme">{service.forward_scheme}</DetailItem>
                    <DetailItem title="SSL Certificate">{service.certificate_name}</DetailItem>
                    <DetailItem title="Force SSL">{service.force_ssl ? 'Yes' : 'No'}</DetailItem>
                    <DetailItem title="WAF Enabled">{service.waf_enabled ? 'Yes' : 'No'}</DetailItem>
                    <DetailItem title="Session Persistence">{service.session_persistence ? 'Yes' : 'No'}</DetailItem>
                    <DetailItem title="Websockets Support">{service.websockets_support ? 'Yes' : 'No'}</DetailItem>
                    <DetailItem title="HTTP/2 Support">{service.http2_support ? 'Yes' : 'No'}</DetailItem>
                    
                    {/* NEW DETAIL ITEMS */}
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">Datacenter</Typography>
                        <Typography variant="body1">{datacenter?.name || 'N/A'} ({datacenter?.location || 'N/A'})</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle2" color="text.secondary">GSLB Service</Typography>
                        <Typography variant="body1">{gslbService?.domain_name || 'N/A'}</Typography>
                    </Grid>
                </Grid>
            </Paper>

            {pool ? (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>Assigned Pool: {pool.name}</Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <DetailItem title="Load Balancing Algorithm">{pool.load_balancing_algorithm}</DetailItem>
                        <DetailItem title="Health Monitor">{monitor ? monitor.name : 'Default'}</DetailItem>
                    </Grid>
                    <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Pool Members</Typography>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Backend Server</TableCell>
                                    <TableCell>Port</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pool.backend_servers.map((server, index) => {
                                    const serverKey = `${server.host}:${server.port}`;
                                    const status = health[serverKey] || 'Unknown';
                                    const style = statusStyles[status] || {};
                                    return (
                                        <TableRow key={index}>
                                            <TableCell>{server.host}</TableCell>
                                            <TableCell>{server.port}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', color: style.color, fontWeight: 'bold' }}>
                                                    {style.icon}
                                                    {status}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            ) : (
                <Alert severity="warning">No server pool is assigned to this service.</Alert>
            )}
        </Box>
    );
};

export default ServiceDetail;