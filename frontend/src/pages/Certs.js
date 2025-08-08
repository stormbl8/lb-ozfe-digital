import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Button, TextField, CircularProgress, Alert, Checkbox, FormControlLabel
} from '@mui/material';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8000/api';

const Certs = () => {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainToIssue, setDomainToIssue] = useState('');
  const [useStaging, setUseStaging] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchCerts = async () => {
    try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
        const [certsRes, userRes] = await Promise.all([
            axios.get(`${API_URL}/certificates`, authHeaders),
            axios.get(`${API_URL}/auth/users/me`, authHeaders)
        ]);
        setCerts(certsRes.data);
        setIsAdmin(userRes.data.role === 'admin');
    } catch (error) {
        console.error("Failed to fetch certificates", error);
        toast.error("Failed to fetch certificates.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const handleIssue = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(`Starting issuance for ${domainToIssue}...`);
    setMessage('');
    setIsError(false);

    try {
        const token = localStorage.getItem('access_token');
        const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
        const response = await axios.post(`${API_URL}/certificates/issue`, {
            domain: domainToIssue,
            use_staging: useStaging
        }, authHeaders);
        toast.success(response.data.message, { id: toastId });
        setDomainToIssue('');
        setTimeout(fetchCerts, 15000);
    } catch (error) {
        const errorMessage = error.response?.data?.detail || error.message;
        toast.error(`Error: ${errorMessage}`, { id: toastId });
        setMessage(errorMessage);
        setIsError(true);
    }
  };

  const getExpirationColor = (days) => {
    if (days < 0) return 'error';
    if (days <= 30) return 'warning';
    return 'success';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>SSL/TLS Certificates</Typography>
      <p>
        Manage Let's Encrypt certificates for your services. Certificates that are 
        less than 30 days from expiry will be automatically renewed by a background task.
      </p>
      
      {isAdmin && (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Issue New Certificate</Typography>
            <p>To issue a wildcard certificate, enter the domain as <code>*.yourdomain.com</code>.</p>
            <Box component="form" onSubmit={handleIssue} sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    size="small"
                    label="Domain Name"
                    value={domainToIssue}
                    onChange={(e) => setDomainToIssue(e.target.value)}
                    placeholder="e.g., myapp.com or *.myapp.com"
                    required
                    fullWidth
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={useStaging}
                            onChange={(e) => setUseStaging(e.target.checked)}
                        />
                    }
                    label="Use Staging Environment"
                />
                <Button type="submit" variant="contained" disabled={!domainToIssue}>Issue Certificate</Button>
            </Box>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Discovered Certificates</Typography>
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Expiration Date</TableCell>
                        <TableCell>Days to Expiration</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={3} align="center"><CircularProgress /></TableCell></TableRow>
                    ) : certs.length > 0 ? (
                        certs.map((cert) => (
                            <TableRow key={cert.name}>
                                <TableCell>{cert.name}</TableCell>
                                <TableCell>{new Date(cert.expiration_date).toLocaleDateString()}</TableCell>
                                <TableCell color={getExpirationColor(cert.days_to_expiration)}>
                                    <Typography color={getExpirationColor(cert.days_to_expiration)}>
                                        {cert.days_to_expiration} days
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={3} align="center">No certificates found.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Certs;