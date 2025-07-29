import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Button, IconButton, Switch, Tooltip, CircularProgress, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import NewProxyForm from '../components/NewProxyForm';
import Modal from '../components/Modal';

const API_URL = 'http://localhost:8000/api';

const HealthStatusIndicator = ({ service, pool, healthStatus }) => {
    if (!service.enabled) {
        return <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: '#7f8c8d' }}><span style={{ color: '#7f8c8d', marginRight: '8px' }}>●</span> Disabled</Typography>;
    }
    if (!pool || !pool.backend_servers || pool.backend_servers.length === 0) {
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

const Services = () => {
  const [services, setServices] = useState([]);
  const [pools, setPools] = useState([]);
  const [healthStatus, setHealthStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingService, setEditingService] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [servicesRes, poolsRes] = await Promise.all([
          axios.get(`${API_URL}/services`),
          axios.get(`${API_URL}/pools`),
      ]);
      setServices(servicesRes.data);
      setPools(poolsRes.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch services or pools.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchHealth = async () => {
        try {
            const response = await axios.get(`${API_URL}/health`);
            setHealthStatus(response.data);
        } catch (err) {
            console.error("Failed to fetch health status");
        }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleCloseForm = () => {
    setEditingService(null);
    fetchData();
  };

  const handleDelete = async (serviceId, serviceIdentifier) => {
    if (window.confirm(`Are you sure you want to delete the service for ${serviceIdentifier}?`)) {
        try {
            await axios.delete(`${API_URL}/services/${serviceId}`);
            fetchData();
        } catch (err) {
            setError(`Failed to delete ${serviceIdentifier}: ${err.response?.data?.detail || err.message}`);
        }
    }
  };

  const handleToggleEnabled = async (service) => {
    const updatedService = { ...service, enabled: !service.enabled };
    try {
        await axios.put(`${API_URL}/services/${service.id}`, updatedService);
        fetchData();
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
        />
      </Modal>
      
      <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={() => setEditingService({})}>Add Proxy Host</Button>
        </Box>
        
        {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{width: '1%'}}>Enabled</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Assigned Pool</TableCell>
                <TableCell>SSL</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center"><CircularProgress /></TableCell></TableRow>
              ) : services.length > 0 ? (
                services.map((service) => {
                  const pool = getPoolById(service.pool_id);
                  const serviceIdentifier = service.domain_name || `${service.service_type.toUpperCase()} Stream #${service.id}`;
                  return (
                    <TableRow key={service.id} hover>
                        <TableCell>
                            <Tooltip title={service.enabled ? "Disable" : "Enable"}>
                                <Switch checked={service.enabled} onChange={() => handleToggleEnabled(service)} color="primary" />
                            </Tooltip>
                        </TableCell>
                        <TableCell>
                            {service.service_type === 'http' 
                             ? <Typography variant="body2" sx={{ fontWeight: '500' }}>{service.domain_name}</Typography>
                             : <Typography variant="body2" color="textSecondary">{`${service.service_type.toUpperCase()} on Port ${service.listen_port}`}</Typography>
                            }
                        </TableCell>
                        <TableCell>
                            {pool ? pool.name : 'Not Assigned'}
                        </TableCell>
                        <TableCell>
                            {service.service_type === 'http' 
                             ? (service.certificate_name === 'dummy' ? 'Self-Signed' : 'Let\'s Encrypt')
                             : 'N/A'
                            }
                        </TableCell>
                        <TableCell>
                            <HealthStatusIndicator service={service} pool={pool} healthStatus={healthStatus} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton onClick={() => setEditingService(service)}><EditIcon /></IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton onClick={() => handleDelete(service.id, serviceIdentifier)}><DeleteIcon color="error" /></IconButton>
                          </Tooltip>
                        </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow><TableCell colSpan={6} align="center">No hosts configured yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Services;