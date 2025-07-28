import React, { useState } from 'react';
import axios from 'axios';

const NewProxyForm = ({ onServiceAdded, apiUrl }) => {
    const [domainName, setDomainName] = useState('');
    const [backendHost, setBackendHost] = useState('');
    const [backendPort, setBackendPort] = useState(80);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Processing...');
        setIsError(false);

        try {
            const response = await axios.post(`${apiUrl}/services`, {
                domain_name: domainName,
                backend_host: backendHost,
                backend_port: parseInt(backendPort, 10),
            });
            setMessage(response.data.message);
            // Clear the form on success
            setDomainName('');
            setBackendHost('');
            setBackendPort(80);
            // Trigger the callback to refresh the parent component's list
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
                <div className="form-group">
                    <label htmlFor="domainName">Domain Name</label>
                    <input
                        type="text"
                        id="domainName"
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                        placeholder="e.g., myapp.yourdomain.com"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="backendHost">Backend Host (IP or Docker service name)</label>
                    <input
                        type="text"
                        id="backendHost"
                        value={backendHost}
                        onChange={(e) => setBackendHost(e.target.value)}
                        placeholder="e.g., 192.168.1.100 or 'my-api-container'"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="backendPort">Backend Port</label>
                    <input
                        type="number"
                        id="backendPort"
                        value={backendPort}
                        onChange={(e) => setBackendPort(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Add Service</button>
            </form>
            {message && <p style={{ marginTop: '15px', color: isError ? 'red' : 'green' }}>{message}</p>}
        </div>
    );
};

export default NewProxyForm;