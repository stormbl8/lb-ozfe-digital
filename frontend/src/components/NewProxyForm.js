import React, { useState, useEffect } from 'react';
import axios from 'axios';

// The form component is now simpler
const NewProxyForm = ({ editingService, onFinished, apiUrl }) => {
    const blankService = {
        domain_name: '',
        forward_scheme: 'http',
        backend_host: '',
        backend_port: 80,
        enabled: true,
        cache_assets: false,
        websockets_support: true,
        waf_enabled: false,
        certificate_name: 'dummy',
        force_ssl: false,
        http2_support: false,
        hsts_enabled: false,
        hsts_subdomains: false,
        advanced_config: '',
    };

    const [formData, setFormData] = useState(blankService);
    const [certs, setCerts] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (editingService && editingService.id) {
            setFormData(editingService);
            setIsEditing(true);
        } else {
            setFormData(blankService);
            setIsEditing(false);
        }
    }, [editingService]);
    
    useEffect(() => {
        axios.get(`${apiUrl}/certificates`).then(res => setCerts(res.data));
    }, [apiUrl]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Saving...');
        setIsError(false);

        const payload = {
            ...formData,
            backend_port: parseInt(formData.backend_port, 10),
        };

        try {
            if (isEditing) {
                await axios.put(`${apiUrl}/services/${formData.id}`, payload);
            } else {
                await axios.post(`${apiUrl}/services`, payload);
            }
            setMessage(isEditing ? 'Service updated successfully!' : 'Service added successfully!');
            setTimeout(onFinished, 1000);
        } catch (error) {
            setMessage(`Error: ${error.response?.data?.detail || error.message}`);
            setIsError(true);
        }
    };
    
    // --- REMOVED THE old "if (!editingService) return null;" line ---

    return (
        // The card class is no longer needed here as the modal provides the container
        <div> 
            <h3>{isEditing ? `Editing ${formData.domain_name}` : 'Add New Proxy Host'}</h3>
            <form onSubmit={handleSubmit}>
                <fieldset>
                    <legend>Details</legend>
                    <div className="form-group">
                        <label>Domain Name</label>
                        <input name="domain_name" value={formData.domain_name} onChange={handleChange} required />
                    </div>
                    <div className="form-group" style={{display: 'flex', gap: '10px'}}>
                        <select name="forward_scheme" value={formData.forward_scheme} onChange={handleChange}>
                            <option value="http">http</option>
                            <option value="https">https</option>
                        </select>
                        <input name="backend_host" value={formData.backend_host} onChange={handleChange} placeholder="Forward Hostname / IP" required style={{flexGrow: 1}} />
                        <input name="backend_port" type="number" value={formData.backend_port} onChange={handleChange} placeholder="Forward Port" required style={{width: '100px'}} />
                    </div>
                     <div className="form-group">
                        <label><input type="checkbox" name="cache_assets" checked={formData.cache_assets} onChange={handleChange} /> Cache Assets</label>
                        <label><input type="checkbox" name="websockets_support" checked={formData.websockets_support} onChange={handleChange} /> Websockets Support</label>
                        <label><input type="checkbox" name="waf_enabled" checked={formData.waf_enabled} onChange={handleChange} /> Block Common Exploits (WAF)</label>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>SSL</legend>
                    <div className="form-group">
                        <label>SSL Certificate</label>
                        <select name="certificate_name" value={formData.certificate_name} onChange={handleChange}>
                            <option value="dummy">None (Dummy Self-Signed)</option>
                            {certs.map(cert => <option key={cert} value={cert}>{cert}</option>)}
                        </select>
                    </div>
                     <div className="form-group">
                        <label><input type="checkbox" name="force_ssl" checked={formData.force_ssl} onChange={handleChange} /> Force SSL</label>
                        <label><input type="checkbox" name="http2_support" checked={formData.http2_support} onChange={handleChange} /> HTTP/2 Support</label>
                        <label><input type="checkbox" name="hsts_enabled" checked={formData.hsts_enabled} onChange={handleChange} /> HSTS Enabled</label>
                        <label><input type="checkbox" name="hsts_subdomains" checked={formData.hsts_subdomains} onChange={handleChange} disabled={!formData.hsts_enabled} /> HSTS Subdomains</label>
                    </div>
                </fieldset>
                
                <div style={{marginTop: '20px'}}>
                    <button type="submit">Save</button>
                    <button type="button" onClick={onFinished} style={{marginLeft: '10px', backgroundColor: '#7f8c8d'}}>Cancel</button>
                    {message && <p style={{ color: isError ? 'red' : 'green' }}>{message}</p>}
                </div>
            </form>
        </div>
    );
};

export default NewProxyForm;