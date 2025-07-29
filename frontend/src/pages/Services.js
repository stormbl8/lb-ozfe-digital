import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import NewProxyForm from '../components/NewProxyForm';
import Modal from '../components/Modal'; // <-- IMPORT THE MODAL

const API_URL = 'http://localhost:8000/api';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingService, setEditingService] = useState(null); // This now controls the modal

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
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async (serviceId, domainName) => {
    if (window.confirm(`Are you sure you want to delete the service for ${domainName}?`)) {
      try {
        await axios.delete(`${API_URL}/services/${serviceId}`);
        fetchServices();
      } catch (err) {
        setError(`Failed to delete ${domainName}: ${err.response?.data?.detail || err.message}`);
      }
    }
  };

  const handleToggleEnabled = async (service) => {
    const updatedService = { ...service, enabled: !service.enabled };
    try {
        await axios.put(`${API_URL}/services/${service.id}`, updatedService);
        fetchServices();
    } catch (err) {
        setError(`Failed to update ${service.domain_name}: ${err.response?.data?.detail || err.message}`);
    }
  };
  
  const handleCloseForm = () => {
    setEditingService(null);
    fetchServices();
  };

  return (
    <div>
      <h1 className="page-header">Proxy Hosts</h1>
      
      {/* --- WRAP THE FORM IN THE MODAL --- */}
      <Modal isOpen={!!editingService} onClose={handleCloseForm}>
        <NewProxyForm
          // Use a key to force re-mount when we edit a different service
          key={editingService ? editingService.id : 'new'}
          editingService={editingService}
          onFinished={handleCloseForm}
          apiUrl={API_URL}
        />
      </Modal>
      
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3>Existing Hosts</h3>
            {/* This button now just opens the modal */}
            <button onClick={() => setEditingService({})} style={{marginBottom: '10px'}}>Add Proxy Host</button>
        </div>
        
        {loading && <p>Loading services...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Enabled</th>
                <th style={{ padding: '8px' }}>Source (Domain)</th>
                <th style={{ padding: '8px' }}>Destination</th>
                <th style={{ padding: '8px' }}>SSL</th>
                <th style={{ padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.length > 0 ? (
                services.map((service) => (
                  <tr key={service.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>
                      <label className="switch">
                        <input type="checkbox" checked={service.enabled} onChange={() => handleToggleEnabled(service)} />
                        <span className="slider round"></span>
                      </label>
                    </td>
                    <td style={{ padding: '8px' }}>{service.domain_name}</td>
                    <td style={{ padding: '8px' }}>{`${service.forward_scheme}://${service.backend_host}:${service.backend_port}`}</td>
                    <td style={{ padding: '8px' }}>{service.certificate_name === 'dummy' ? 'Self-Signed' : 'Let\'s Encrypt'}</td>
                    <td style={{ padding: '8px' }}>
                      <button onClick={() => setEditingService(service)} style={{marginRight: '5px'}}>Edit</button>
                      <button onClick={() => handleDelete(service.id, service.domain_name)} style={{ backgroundColor: '#e74c3c' }}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" style={{ padding: '8px', textAlign: 'center' }}>No proxy hosts configured yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Services;