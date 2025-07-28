import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import NewProxyForm from '../components/NewProxyForm';

// The API base URL is now defined in one place
const API_URL = 'http://localhost:8000/api';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Use useCallback to memoize the fetch function
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/services`);
      setServices(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch services. Is the backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // useEffect hook to fetch services when the component mounts
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async (domainName) => {
    // Confirmation prompt before deleting
    if (window.confirm(`Are you sure you want to delete the service for ${domainName}?`)) {
      try {
        await axios.delete(`${API_URL}/services/${domainName}`);
        // Refresh the list after successful deletion
        fetchServices(); 
      } catch (err) {
        setError(`Failed to delete ${domainName}: ${err.response?.data?.detail || err.message}`);
      }
    }
  };

  return (
    <div>
      <h1 className="page-header">Services / Reverse Proxies</h1>
      <p>Define how incoming traffic is routed to your backend services.</p>
      
      {/* Pass the fetchServices function so the form can trigger a refresh */}
      <NewProxyForm onServiceAdded={fetchServices} apiUrl={API_URL} />
      
      <div className="card">
        <h3>Existing Services</h3>
        {loading && <p>Loading services...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Domain</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Backend Target</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.length > 0 ? (
                services.map((service) => (
                  <tr key={service.domain_name} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{service.domain_name}</td>
                    <td style={{ padding: '8px' }}>{`${service.backend_host}:${service.backend_port}`}</td>
                    <td style={{ padding: '8px' }}>
                      <button 
                        onClick={() => handleDelete(service.domain_name)}
                        style={{ backgroundColor: '#e74c3c' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: '8px', textAlign: 'center' }}>
                    No services configured yet. Add one above to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Services;