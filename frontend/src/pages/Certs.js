import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const Certs = () => {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainToIssue, setDomainToIssue] = useState('');
  const [useStaging, setUseStaging] = useState(true); // <-- NEW STATE, default to true for safety
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const fetchCerts = async () => {
    try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/certificates`);
        setCerts(response.data);
    } catch (error) {
        console.error("Failed to fetch certificates", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const handleIssue = async (e) => {
    e.preventDefault();
    setMessage(`Starting issuance for ${domainToIssue}...`);
    setIsError(false);

    try {
        // --- UPDATED PAYLOAD ---
        const response = await axios.post(`${API_URL}/certificates/issue`, {
            domain: domainToIssue,
            use_staging: useStaging
        });
        setMessage(response.data.message);
        setDomainToIssue('');
        setTimeout(fetchCerts, 15000);
    } catch (error) {
        setMessage(`Error: ${error.response?.data?.detail || error.message}`);
        setIsError(true);
    }
  };

  return (
    <div>
      <h1 className="page-header">SSL/TLS Certificates</h1>
      <p>Manage Let's Encrypt certificates for your services.</p>
      
      <div className="card">
        <h3>Issue New Certificate</h3>
        <p>
            To issue a wildcard certificate, enter the domain as <code>*.yourdomain.com</code>.
        </p>
        <form onSubmit={handleIssue}>
            <div className="form-group">
                <label htmlFor="domainToIssue">Domain Name</label>
                <input
                    type="text"
                    id="domainToIssue"
                    value={domainToIssue}
                    onChange={(e) => setDomainToIssue(e.target.value)}
                    placeholder="e.g., myapp.com or *.myapp.com"
                    required
                />
            </div>

            {/* --- NEW CHECKBOX --- */}
            <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="checkbox"
                        id="useStaging"
                        checked={useStaging}
                        onChange={(e) => setUseStaging(e.target.checked)}
                        style={{ width: 'auto', marginRight: '10px' }}
                    />
                    Use Let's Encrypt Staging Environment (for testing to avoid rate limits)
                </label>
            </div>

            <button type="submit">Issue Certificate</button>
        </form>
        {message && <p style={{ marginTop: '15px', color: isError ? 'red' : 'green' }}>{message}</p>}
      </div>

      <div className="card">
        <h3>Discovered Certificates</h3>
        <button onClick={fetchCerts} style={{float: 'right'}}>Refresh List</button>
        {loading ? <p>Loading...</p> : (
            <ul>
                {certs.length > 0 ? certs.map(cert => <li key={cert}>{cert}</li>) : <li>No certificates found.</li>}
            </ul>
        )}
      </div>
    </div>
  );
};

export default Certs;