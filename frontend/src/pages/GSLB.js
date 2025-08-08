import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Button, IconButton, TextField, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Alert, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import AddIcon from '@mui/icons-material/Add';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8000/api';

const GSLB = () => {
    const [datacenters, setDatacenters] = useState([]);
    const [gslbServices, setGslbServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newDatacenter, setNewDatacenter] = useState({ name: '', location: '', nginx_ip: '', api_url: '' });
    const [newGslbService, setNewGslbService] = useState({ domain_name: '', load_balancing_algorithm: 'round_robin', datacenters: [] });

    const fetchAllData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
            
            const [datacentersRes, gslbRes] = await Promise.all([
                axios.get(`${API_URL}/gslb/datacenters`, authHeaders),
                axios.get(`${API_URL}/gslb/services`, authHeaders),
            ]);
            
            setDatacenters(datacentersRes.data);
            setGslbServices(gslbRes.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch GSLB data. Ensure you have admin privileges.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleDatacenterInputChange = (e) => {
        const { name, value } = e.target;
        setNewDatacenter(prev => ({ ...prev, [name]: value }));
    };

    const handleGslbServiceInputChange = (e) => {
        const { name, value, type } = e.target;
        setNewGslbService(prev => ({ ...prev, [name]: type === 'checkbox' ? e.target.checked : value }));
    };

    const handleCreateDatacenter = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Creating datacenter...');
        try {
            const token = localStorage.getItem('access_token');
            await axios.post(`${API_URL}/gslb/datacenters`, newDatacenter, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Datacenter created successfully!', { id: toastId });
            setNewDatacenter({ name: '', location: '', nginx_ip: '', api_url: '' });
            fetchAllData();
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };

    const handleCreateGslbService = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Creating GSLB service...');
        try {
            const token = localStorage.getItem('access_token');
            await axios.post(`${API_URL}/gslb/services`, newGslbService, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('GSLB Service created successfully!', { id: toastId });
            setNewGslbService({ domain_name: '', load_balancing_algorithm: 'round_robin', datacenters: [] });
            fetchAllData();
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };

    const handleDeleteDatacenter = async (dcId, dcName) => {
        if (window.confirm(`Are you sure you want to delete the datacenter "${dcName}"?`)) {
            const toastId = toast.loading('Deleting datacenter...');
            try {
                const token = localStorage.getItem('access_token');
                await axios.delete(`${API_URL}/gslb/datacenters/${dcId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                toast.success('Datacenter deleted successfully!', { id: toastId });
                fetchAllData();
            } catch (err) {
                const errorMessage = err.response?.data?.detail || err.message;
                toast.error(`Error: ${errorMessage}`, { id: toastId });
            }
        }
    };

    const handleDeleteGslbService = async (gslbId, gslbDomain) => {
        if (window.confirm(`Are you sure you want to delete the GSLB service "${gslbDomain}"?`)) {
            const toastId = toast.loading('Deleting GSLB service...');
            try {
                const token = localStorage.getItem('access_token');
                await axios.delete(`${API_URL}/gslb/services/${gslbId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                toast.success('GSLB service deleted successfully!', { id: toastId });
                fetchAllData();
            } catch (err) {
                const errorMessage = err.response?.data?.detail || err.message;
                toast.error(`Error: ${errorMessage}`, { id: toastId });
            }
        }
    };

    const handleSyncAll = async () => {
        const toastId = toast.loading('Syncing all datacenters...');
        try {
            const token = localStorage.getItem('access_token');
            await axios.post(`${API_URL}/gslb/sync-all`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Sync command sent successfully!', { id: toastId });
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>GSLB Management</Typography>
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
            
            {/* Sync Button */}
            <Box sx={{ mb: 3 }}>
                <Tooltip title="Sync all datacenter configurations. This will regenerate all NGINX configs on every datacenter.">
                    <Button
                        variant="contained"
                        startIcon={<SyncIcon />}
                        onClick={handleSyncAll}
                    >
                        Sync All Datacenters
                    </Button>
                </Tooltip>
            </Box>

            {/* Datacenters Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Datacenters</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Location</TableCell>
                                <TableCell>NGINX IP</TableCell>
                                <TableCell>API URL</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : datacenters.length > 0 ? (
                                datacenters.map((dc) => (
                                    <TableRow key={dc.id}>
                                        <TableCell>{dc.name}</TableCell>
                                        <TableCell>{dc.location}</TableCell>
                                        <TableCell>{dc.nginx_ip}</TableCell>
                                        <TableCell>{dc.api_url}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Delete">
                                                <IconButton onClick={() => handleDeleteDatacenter(dc.id, dc.name)}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} align="center">No datacenters registered yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                <Box component="form" onSubmit={handleCreateDatacenter} sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField size="small" label="Name" name="name" value={newDatacenter.name} onChange={handleDatacenterInputChange} required />
                    <TextField size="small" label="Location" name="location" value={newDatacenter.location} onChange={handleDatacenterInputChange} />
                    <TextField size="small" label="NGINX IP" name="nginx_ip" value={newDatacenter.nginx_ip} onChange={handleDatacenterInputChange} required />
                    <TextField size="small" label="API URL" name="api_url" value={newDatacenter.api_url} onChange={handleDatacenterInputChange} required />
                    <Button type="submit" variant="contained" startIcon={<AddIcon />}>Add Datacenter</Button>
                </Box>
            </Paper>

            {/* GSLB Services Section */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>GSLB Services</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Domain Name</TableCell>
                                <TableCell>Algorithm</TableCell>
                                <TableCell>Datacenters</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : gslbServices.length > 0 ? (
                                gslbServices.map((gslb) => (
                                    <TableRow key={gslb.id}>
                                        <TableCell>{gslb.domain_name}</TableCell>
                                        <TableCell>{gslb.load_balancing_algorithm}</TableCell>
                                        <TableCell>
                                            {gslb.datacenters.map(id => datacenters.find(dc => dc.id === id)?.name || 'N/A').join(', ')}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Delete">
                                                <IconButton onClick={() => handleDeleteGslbService(gslb.id, gslb.domain_name)}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} align="center">No GSLB services configured.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                <Box component="form" onSubmit={handleCreateGslbService} sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField size="small" label="Domain Name" name="domain_name" value={newGslbService.domain_name} onChange={handleGslbServiceInputChange} required />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Algorithm</InputLabel>
                        <Select
                            name="load_balancing_algorithm"
                            value={newGslbService.load_balancing_algorithm}
                            onChange={handleGslbServiceInputChange}
                            label="Algorithm"
                        >
                            <MenuItem value="round_robin">Round Robin</MenuItem>
                            <MenuItem value="geo">Geo-based</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                        <InputLabel>Datacenters</InputLabel>
                        <Select
                            name="datacenters"
                            multiple
                            value={newGslbService.datacenters}
                            onChange={(e) => setNewGslbService(prev => ({ ...prev, datacenters: e.target.value }))}
                            label="Datacenters"
                        >
                            {datacenters.map(dc => (
                                <MenuItem key={dc.id} value={dc.id}>{dc.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button type="submit" variant="contained" startIcon={<AddIcon />}>Add GSLB Service</Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default GSLB;