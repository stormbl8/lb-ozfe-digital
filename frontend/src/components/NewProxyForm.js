import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NewProxyForm = ({ onServiceAdded, apiUrl }) => {
    const [domainName, setDomainName] = useState('');
    const [backendHost, setBackendHost] = useState('');
    const [backendPort, setBackendPort] = useState(80);
    const [advancedConfig, setAdvancedConfig] = useState('');
    const [certs, setCerts] = useState([]);
    const [selectedCert, setSelectedCert] = useState('dummy');
    const [wafEnabled, setWafEnabled] = useState(false); // <-- ADD WAF STATE
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const fetchCerts = async () => {
            try {
                const response = await axios.get(`${apiUrl}/certificates`);
                setCerts(response.data);
            } catch (error) {
                console.error("Failed to fetch certificates", error);
            }
        };
        fetchCerts();
    }, [apiUrl]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Processing...');
        setIsError(false);

        try {
            const payload = {
                domain_name: domainName,
                backend_host: backendHost,
                backend_port: parseInt(backendPort, 10),
                certificate_name: selectedCert,
                advanced_config: advancedConfig,
                waf_enabled: wafEnabled, // <-- ADD TO PAYLOAD
            };
            await axios.post(`${apiUrl}/services`, payload);
            setMessage(`Service for ${domainName} added successfully!`);
            
            // Clear form
            setDomainName('');
            setBackendHost('');
            setBackendPort(80);
            setAdvancedConfig('');
            setSelectedCert('dummy');
            setWafEnabled(false); // <-- CLEAR WAF STATE
            
            onServiceAdded();
        } catch (error) {
            setMessage(`Error: ${error.response?.data?.detail || error.message}`);
            setIsError(true);
        }
    };

    return (
        <div className="card">
            <h3>Add New Reverse Proxy</h3>
            <form onSubmit={handleSubmit}>
                {/* Domain, Host, Port fields are unchanged */}
                <div className="form-group">
                    <label htmlFor="domainName">Domain Name</label>
                    <input type="text" id="domainName" value={domainName} onChange={(e) => setDomainName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="backendHost">Backend Host</label>
                    <input type="text" id="backendHost" value={backendHost} onChange={(e) => setBackendHost(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="backendPort">Backend Port</label>
                    <input type="number" id="backendPort" value={backendPort} onChange={(e) => setBackendPort(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label htmlFor="sslCert">SSL Certificate</label>
                    <select id="sslCert" value={selectedCert} onChange={(e) => setSelectedCert(e.target.value)} style={{width: '100%', padding: '8px'}}>
                        <option value="dummy">None (Use Dummy Self-Signed Cert)</option>
                        {certs.map(cert => (
                            <option key={cert} value={cert}>{cert}</option>
                        ))}
                    </select>
                </div>

                {/* --- NEW WAF CHECKBOX --- */}
                 <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            id="wafEnabled"
                            checked={wafEnabled}
                            onChange={(e) => setWafEnabled(e.target.checked)}
                            style={{ width: 'auto', marginRight: '10px' }}
                        />
                        Enable Web Application Firewall (OWASP Core Rule Set)
                    </label>
                </div>

                <div className="form-group">
                    <label htmlFor="advancedConfig">Advanced NGINX Configuration</label>
                    <textarea id="advancedConfig" value={advancedConfig} onChange={(e) => setAdvancedConfig(e.target.value)} rows="4" style={{ fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}/>
                </div>
                <button type="submit">Add Service</button>
            </form>
            {message && <p style={{ marginTop: '15px', color: isError ? 'red' : 'green' }}>{message}</p>}
        </div>
    );
};

export default NewProxyForm;