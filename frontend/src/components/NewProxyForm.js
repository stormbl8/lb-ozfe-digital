import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NewProxyForm = ({ editingService, onFinished, apiUrl }) => {
    const blankService = {
        service_type: 'http',
        listen_port: '',
        domain_name: '',
        backend_servers: [{ host: '', port: 80, max_fails: 3, fail_timeout: '10s' }],
        load_balancing_algorithm: 'round_robin',
        enabled: true,
        forward_scheme: 'http',
        cache_assets: false,
        websockets_support: true,
        waf_enabled: false,
        certificate_name: 'dummy',
        force_ssl: true,
        http2_support: true,
        hsts_enabled: false,
        hsts_subdomains: false,
        access_list_ips: [],
        access_list_type: 'allow',
        basic_auth_user: '',
        basic_auth_pass: '',
        advanced_config: '',
    };

    const [formData, setFormData] = useState(blankService);
    const [certs, setCerts] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const isEditing = !!(formData && formData.id);

    useEffect(() => {
        if (editingService && editingService.id) {
            const servers = editingService.backend_servers && editingService.backend_servers.length > 0
                ? editingService.backend_servers
                : [{ host: '', port: 80, max_fails: 3, fail_timeout: '10s' }];
            setFormData({ ...editingService, backend_servers: servers, basic_auth_pass: '' });
        } else if (editingService) { // For "Add New"
            setFormData(blankService);
        }
    }, [editingService]);
    
    useEffect(() => {
        axios.get(`${apiUrl}/certificates`).then(res => setCerts(res.data));
    }, [apiUrl]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleServerChange = (index, field, value) => {
        const newServers = [...formData.backend_servers];
        if (field === 'port' || field === 'max_fails') {
            newServers[index][field] = parseInt(value, 10) || 0;
        } else {
            newServers[index][field] = value;
        }
        setFormData(prev => ({ ...prev, backend_servers: newServers }));
    };

    const addServer = () => {
        setFormData(prev => ({ ...prev, backend_servers: [...prev.backend_servers, { host: '', port: 80, max_fails: 3, fail_timeout: '10s' }]}));
    };

    const removeServer = (index) => {
        setFormData(prev => ({ ...prev, backend_servers: prev.backend_servers.filter((_, i) => i !== index)}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('Saving...');
        setIsError(false);

        const payload = {
            ...formData,
            listen_port: formData.listen_port ? parseInt(formData.listen_port, 10) : null,
            access_list_ips: Array.isArray(formData.access_list_ips) ? formData.access_list_ips.filter(ip => ip.trim() !== '') : [],
            backend_servers: formData.backend_servers.filter(s => s.host && s.port),
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
    
    return (
        <div> 
            <h3>{isEditing ? `Editing Service #${formData.id}` : 'Add New Service'}</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Service Type</label>
                    <div style={{display: 'flex', gap: '15px'}}>
                        <label><input type="radio" name="service_type" value="http" checked={formData.service_type === 'http'} onChange={handleChange} /> HTTP Proxy</label>
                        <label><input type="radio" name="service_type" value="tcp" checked={formData.service_type === 'tcp'} onChange={handleChange} /> TCP Stream</label>
                        <label><input type="radio" name="service_type" value="udp" checked={formData.service_type === 'udp'} onChange={handleChange} /> UDP Stream</label>
                    </div>
                </div>

                {/* Conditional Rendering based on Service Type */}
                {formData.service_type === 'http' ? (
                    <>
                        <fieldset>
                            <legend>Details</legend>
                            <div className="form-group">
                                <label>Domain Name</label>
                                <input name="domain_name" value={formData.domain_name} onChange={handleChange} required />
                            </div>
                            
                            <div className="form-group">
                                <label>Backend Server Pool</label>
                                {formData.backend_servers.map((server, index) => (
                                    <div key={index} style={{display: 'flex', gap: '5px', marginBottom: '5px', alignItems: 'center'}}>
                                        <select name="forward_scheme" value={formData.forward_scheme} onChange={handleChange} style={{flexShrink: 0}}>
                                            <option value="http">http</option>
                                            <option value="https">https</option>
                                        </select>
                                        <input value={server.host} onChange={(e) => handleServerChange(index, 'host', e.target.value)} placeholder="Hostname / IP" required style={{flexGrow: 1}} />
                                        <input type="number" value={server.port} onChange={(e) => handleServerChange(index, 'port', e.target.value)} placeholder="Port" required style={{width: '80px'}} />
                                        <input type="number" title="Max Fails" value={server.max_fails} onChange={(e) => handleServerChange(index, 'max_fails', e.target.value)} style={{width: '60px'}} />
                                        <input type="text" title="Fail Timeout (e.g., 10s)" value={server.fail_timeout} onChange={(e) => handleServerChange(index, 'fail_timeout', e.target.value)} style={{width: '60px'}} />
                                        <button type="button" onClick={() => removeServer(index)} disabled={formData.backend_servers.length <= 1}>&times;</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addServer}>Add Backend Server</button>
                            </div>

                            <div className="form-group">
                                <label>Load Balancing Algorithm</label>
                                <select name="load_balancing_algorithm" value={formData.load_balancing_algorithm} onChange={handleChange}>
                                    <option value="round_robin">Round Robin</option>
                                    <option value="least_conn">Least Connections</option>
                                    <option value="ip_hash">IP Hash</option>
                                </select>
                            </div>

                            <div className="form-group">
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
                        
                        <fieldset>
                            <legend>Access</legend>
                            <div className="form-group">
                                <label>Access List</label>
                                <select name="access_list_type" value={formData.access_list_type} onChange={handleChange}>
                                    <option value="allow">Allow these IPs</option>
                                    <option value="deny">Deny these IPs</option>
                                </select>
                                <textarea
                                    name="access_list_ips"
                                    value={Array.isArray(formData.access_list_ips) ? formData.access_list_ips.join('\n') : ''}
                                    onChange={(e) => setFormData(prev => ({...prev, access_list_ips: e.target.value.split('\n')}))}
                                    rows="3"
                                    placeholder="Enter one IP or CIDR per line, e.g., 192.168.1.100 or 10.0.0.0/24"
                                    style={{ fontFamily: 'monospace', width: '100%', boxSizing: 'border-box', marginTop: '5px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>HTTP Basic Authentication</label>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <input name="basic_auth_user" value={formData.basic_auth_user || ''} onChange={handleChange} placeholder="Username" style={{flexGrow: 1}} />
                                    <input name="basic_auth_pass" type="password" value={formData.basic_auth_pass || ''} onChange={handleChange} placeholder="Password (enter to set/change)" style={{flexGrow: 1}} />
                                </div>
                            </div>
                        </fieldset>
                    </>
                ) : (
                    <fieldset>
                        <legend>Stream Details</legend>
                        <div className="form-group">
                            <label>Listen Port</label>
                            <input name="listen_port" type="number" value={formData.listen_port || ''} onChange={handleChange} required />
                            <small>The port the proxy will listen on. Must be within the exposed range (e.g., 10000-10100).</small>
                        </div>
                        <div className="form-group">
                            <label>Backend Server Pool</label>
                            {formData.backend_servers.map((server, index) => (
                                <div key={index} style={{display: 'flex', gap: '10px', marginBottom: '5px'}}>
                                    <input value={server.host} onChange={(e) => handleServerChange(index, 'host', e.target.value)} placeholder="Hostname / IP" required style={{flexGrow: 1}} />
                                    <input type="number" value={server.port} onChange={(e) => handleServerChange(index, 'port', e.target.value)} placeholder="Port" required style={{width: '100px'}} />
                                    <button type="button" onClick={() => removeServer(index)} disabled={formData.backend_servers.length <= 1}>&times;</button>
                                </div>
                            ))}
                            <button type="button" onClick={addServer}>Add Backend Server</button>
                        </div>
                    </fieldset>
                )}
                
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