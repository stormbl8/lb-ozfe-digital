import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import NewProxyForm from '../components/NewProxyForm';
import Modal from '../components/Modal';

const API_URL = 'http://localhost:8000/api';

const HealthStatusIndicator = ({ service, healthStatus }) => {
    if (!service.enabled) {
        return <><span style={{ color: '#7f8c8d' }}>●</span> Disabled</>;
    }
    if (!service.backend_servers || service.backend_servers.length === 0) {
        return <><span style={{ color: '#f39c12' }}>●</span> No Backends</>;
    }

    // Check status of the first backend server
    const first_backend = `${service.backend_servers[0].host}:${service.backend_servers[0].port}`;
    const status = healthStatus[first_backend];

    if (status === 'Online') {
        return <><span style={{ color: '#2ecc71' }}>●</span> Online</>;
    }
    if (status === 'Offline') {
        return <><span style={{ color: '#e74c3c' }}>●</span> Offline</>;
    }
    return <><span style={{ color: '#bdc3c7' }}>●</span> Unknown</>;
};

const Services = () => {
  const [services, setServices] = useState([]);
  const [healthStatus, setHealthStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingService, setEditingService] = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/services`);
      setServices(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch services.');
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
    fetchServices();
  }, [fetchServices]);
  
  const handleCloseForm = () => {
    setEditingService(null);
    fetchServices();
  };

  const handleDelete = async (serviceId, serviceIdentifier) => {
    if (window.confirm(`Are you sure you want to delete the service for ${serviceIdentifier}?`)) {
        try {
            await axios.delete(`${API_URL}/services/${serviceId}`);
            fetchServices();
        } catch (err) {
            setError(`Failed to delete ${serviceIdentifier}: ${err.response?.data?.detail || err.message}`);
        }
    }
  };

  const handleToggleEnabled = async (service) => {
    const updatedService = { ...service, enabled: !service.enabled };
    try {
        await axios.put(`${API_URL}/services/${service.id}`, updatedService);
        fetchServices();
    } catch (err) {
        const serviceIdentifier = service.domain_name || `Stream on port ${service.listen_port}`;
        setError(`Failed to update ${serviceIdentifier}: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div>
      <h1 className="page-header">Proxy Hosts</h1>
      
      <Modal isOpen={!!editingService} onClose={handleCloseForm}>
        <NewProxyForm
          key={editingService ? editingService.id : 'new'}
          editingService={editingService}
          onFinished={handleCloseForm}
          apiUrl={API_URL}
        />
      </Modal>
      
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3>Existing Hosts</h3>
            <button onClick={() => setEditingService({})} style={{marginBottom: '10px'}}>Add Proxy Host</button>
        </div>
        
        {loading && <p>Loading services...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Enabled</th>
                <th style={{ padding: '8px' }}>Source</th>
                <th style={{ padding: '8px' }}>Destination</th>
                <th style={{ padding: '8px' }}>SSL</th>
                <th style={{ padding: '8px' }}>Status</th>
                <th style={{ padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.length > 0 ? (
                services.map((service) => {
                  const serviceIdentifier = service.domain_name || `${service.service_type.toUpperCase()} Stream #${service.id}`;
                  return (
                    <tr key={service.id} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '8px' }}>
                            <label className="switch">
                                <input type="checkbox" checked={service.enabled} onChange={() => handleToggleEnabled(service)} />
                                <span className="slider round"></span>
                            </label>
                        </td>
                        <td style={{ padding: '8px' }}>
                            {service.service_type === 'http' 
                             ? service.domain_name 
                             : `${service.service_type.toUpperCase()} on Port ${service.listen_port}`
                            }
                        </td>
                        <td style={{ padding: '8px' }}>
                            {service.backend_servers && service.backend_servers.length > 0
                             ? `${service.service_type === 'http' ? service.forward_scheme + '://' : ''}${service.backend_servers[0].host}:${service.backend_servers[0].port}${service.backend_servers.length > 1 ? ` (+${service.backend_servers.length - 1} more)` : ''}`
                             : 'No destination set'
                            }
                        </td>
                        <td style={{ padding: '8px' }}>
                            {service.service_type === 'http' 
                             ? (service.certificate_name === 'dummy' ? 'Self-Signed' : 'Let\'s Encrypt')
                             : 'N/A'
                            }
                        </td>
                        <td style={{ padding: '8px' }}>
                            <HealthStatusIndicator service={service} healthStatus={healthStatus} />
                        </td>
                        <td style={{ padding: '8px' }}>
                          <button onClick={() => setEditingService(service)} style={{marginRight: '5px'}}>Edit</button>
                          <button onClick={() => handleDelete(service.id, serviceIdentifier)} style={{ backgroundColor: '#e74c3c' }}>Delete</button>
                        </td>
                    </tr>
                  )
                })
              ) : (
                <tr><td colSpan="6" style={{ padding: '8px', textAlign: 'center' }}>No hosts configured yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Services;