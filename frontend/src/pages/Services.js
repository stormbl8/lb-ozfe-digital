import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Button, IconButton, Switch, Tooltip, CircularProgress, Alert, Link,
    Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import NewProxyForm from '../components/NewProxyForm';
import Modal from '../components/Modal';

const API_URL = 'http://localhost:8000/api';

const HealthStatusIndicator = ({ service, pool, healthStatus }) => {
    if (!service.enabled) {
        return <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: '#7f8c8d' }}><span style={{ color: '#7f8c8d', marginRight: '8px' }}>●</span> Disabled</Typography>;
    }
    if (!pool || pool.backend_servers.length === 0) {
        return <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: '#f39c12' }}><span style={{ color: '#f39c12', marginRight: '8px' }}>●</span> No Backends</Typography>;
    }

    const first_backend = `${pool.backend_servers[0].host}:${pool.backend_servers[0].port}`;
    const status = healthStatus[first_backend];

    if (status === 'Online') {
        return <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: '#2ecc71' }}><span style={{ color: '#2ecc71', marginRight: '8px' }}>●</span> Online</Typography>;
    }
    if (status === 'Offline') {
        return <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: '#e74c3c' }}><span style={{ color: '#e74c3c', marginRight: '8px' }}>●</span> Offline</Typography>;
    }
    return <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: '#bdc3c7' }}><span style={{ color: '#bdc3c7', marginRight: '8px' }}>●</span> Unknown</Typography>;
};

const Services = ({ licenseType }) => {
  const [services, setServices] = useState([]);
  const [pools, setPools] = useState([]);
  const [datacenters, setDatacenters] = useState([]);
  const [selectedDatacenter, setSelectedDatacenter] = useState('');
  const [healthStatus, setHealthStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingService, setEditingService] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchServicesAndData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
      
      // Basic data needed for all license types
      const [poolsRes, userRes, healthRes] = await Promise.all([
          axios.get(`${API_URL}/pools`, authHeaders),
          axios.get(`${API_URL}/auth/users/me`, authHeaders),
          axios.get(`${API_URL}/health`, authHeaders)
      ]);
      
      setPools(poolsRes.data);
      setIsAdmin(userRes.data.role === 'admin');
      setHealthStatus(healthRes.data);

      let fetchedDatacenters = [];
      if (licenseType === 'full') {
        const datacentersRes = await axios.get(`${API_URL}/gslb/datacenters`, authHeaders);
        fetchedDatacenters = datacentersRes.data;
        setDatacenters(fetchedDatacenters);
      } else {
        // For trial/none licenses, we don't need GSLB datacenters
        setDatacenters([]);
      }
      
      const dcIdToFetch = selectedDatacenter || (fetchedDatacenters.length > 0 ? fetchedDatacenters[0].id : null);
      
      // If GSLB is not supported, we still need a datacenter concept for services.
      // We'll default to a placeholder if no datacenters are fetched.
      // This assumes services are not dependent on a GSLB datacenter in a trial.
      // A better long-term solution might be a default datacenter from another API endpoint.
      const servicesDcId = dcIdToFetch || 1; // Fallback to 1 if no GSLB dcs

      const servicesRes = await axios.get(`${API_URL}/services?datacenter_id=${servicesDcId}`, authHeaders);
      setServices(servicesRes.data);

      if (!selectedDatacenter && dcIdToFetch) {
        setSelectedDatacenter(dcIdToFetch);
      }

      setError('');
    } catch (err) {
        if (err.response && err.response.status === 403) {
            setError('Your license does not permit fetching GSLB datacenters. Some features may be disabled.');
        } else {
            setError('Failed to fetch required service data.');
        }
    } finally {
      setLoading(false);
    }
  }, [selectedDatacenter, licenseType]);

  useEffect(() => {
    if (licenseType) { // Wait until licenseType prop is available
        fetchServicesAndData();
    }
    const interval = setInterval(async () => {
      try {
        const healthRes = await axios.get(`${API_URL}/health`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });
        setHealthStatus(healthRes.data);
      } catch (err) {
        console.error("Failed to fetch health status", err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchServicesAndData, licenseType]);
  
  const handleCloseForm = () => {
    setEditingService(null);
    fetchServicesAndData();
  };

  const handleDelete = async (serviceId, serviceIdentifier) => {
    if (window.confirm(`Are you sure you want to delete the service for ${serviceIdentifier}?`)) {
        try {
            const token = localStorage.getItem('access_token');
            await axios.delete(`${API_URL}/services/${serviceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchServicesAndData();
        } catch (err) {
            setError(`Failed to delete ${serviceIdentifier}: ${err.response?.data?.detail || err.message}`);
        }
    }
  };

  const handleToggleEnabled = async (service) => {
    const updatedService = { ...service, enabled: !service.enabled };
    try {
        const token = localStorage.getItem('access_token');
        await axios.put(`${API_URL}/services/${service.id}`, updatedService, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchServicesAndData();
    } catch (err) {
        const serviceIdentifier = service.domain_name || `Stream on port ${service.listen_port}`;
        setError(`Failed to update ${serviceIdentifier}: ${err.response?.data?.detail || err.message}`);
    }
  };

  const getPoolById = (poolId) => pools.find(p => p.id === poolId);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Proxy Hosts</Typography>
      
      <Modal isOpen={!!editingService} onClose={handleCloseForm}>
        <NewProxyForm
          key={editingService ? editingService.id : 'new'}
          editingService={editingService}
          onFinished={handleCloseForm}
          apiUrl={API_URL}
          licenseType={licenseType}
        />
      </Modal>
      
      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {licenseType === 'full' && datacenters.length > 0 && (
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Datacenter</InputLabel>
                    <Select
                        value={selectedDatacenter}
                        label="Datacenter"
                        onChange={(e) => setSelectedDatacenter(e.target.value)}
                    >
                        {datacenters.map(dc => (
                            <MenuItem key={dc.id} value={dc.id}>{dc.name} ({dc.location})</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            )}
            {isAdmin && (
                <Tooltip title={licenseType === 'trial' && services.length >= 1 ? "Trial license only allows 1 proxy host" : ""}>
                    <span>
                        <Button 
                            variant="contained" 
                            onClick={() => setEditingService({})}
                            disabled={(licenseType === 'trial' && services.length >= 1) || !isAdmin}
                        >
                            Add Proxy Host
                        </Button>
                    </span>
                </Tooltip>
            )}
        </Box>
        
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{width: '1%'}}>Enabled</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Assigned Pool</TableCell>
                {licenseType === 'full' && <TableCell>Datacenter</TableCell>}
                <TableCell>Extras</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={licenseType === 'full' ? 7 : 6} align="center"><CircularProgress /></TableCell></TableRow>
              ) : services.length > 0 ? (
                services.map((service) => {
                  const pool = getPoolById(service.pool_id);
                  const serviceIdentifier = service.domain_name || `${service.service_type.toUpperCase()} Stream #${service.id}`;
                  return (
                    <TableRow key={service.id} hover>
                        <TableCell>
                            <Tooltip title={service.enabled ? "Disable" : "Enable"}>
                                <Switch 
                                    checked={service.enabled} 
                                    onChange={() => handleToggleEnabled(service)} 
                                    color="primary" 
                                    disabled={!isAdmin}
                                />
                            </Tooltip>
                        </TableCell>
                        <TableCell>
                            {service.service_type === 'http' 
                             ? <Link component={RouterLink} to={`/services/${service.id}`} sx={{ fontWeight: '500' }}>{service.domain_name}</Link>
                             : <Typography variant="body2" color="textSecondary">`${service.service_type.toUpperCase()} on Port ${service.listen_port}`</Typography>
                            }
                        </TableCell>
                        <TableCell>
                            {pool ? pool.name : 'Not Assigned'}
                        </TableCell>
                        {licenseType === 'full' && (
                            <TableCell>
                                {datacenters.find(dc => dc.id === service.datacenter_id)?.name || 'N/A'}
                            </TableCell>
                        )}
                        <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {service.session_persistence && (
                                    <Tooltip title="Session Persistence Enabled">
                                        <StickyNote2Icon fontSize="small" color="action" />
                                    </Tooltip>
                                )}
                                <Typography variant="body2">
                                    {service.service_type === 'http' 
                                     ? (service.certificate_name === 'dummy' ? 'Self-Signed' : 'Let\'s Encrypt')
                                     : 'N/A'
                                    }
                                </Typography>
                            </Box>
                        </TableCell>
                        <TableCell>
                            <HealthStatusIndicator service={service} pool={pool} healthStatus={healthStatus} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <span>
                                <IconButton onClick={() => setEditingService(service)} disabled={!isAdmin}>
                                    <EditIcon />
                                </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <span>
                                <IconButton onClick={() => handleDelete(service.id, serviceIdentifier)} disabled={!isAdmin}>
                                    <DeleteIcon color="error" />
                                </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow><TableCell colSpan={licenseType === 'full' ? 7 : 6} align="center">No hosts configured yet for this datacenter.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Services;