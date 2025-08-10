import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Button, IconButton, Tooltip, CircularProgress, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MonitorForm from '../components/MonitorForm';
import Modal from '../components/Modal';

const API_URL = 'http://localhost:8000/api';

const Monitors = () => {
    const [monitors, setMonitors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingMonitor, setEditingMonitor] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const fetchMonitors = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };

            const [monitorsRes, userRes] = await Promise.all([
                axios.get(`${API_URL}/monitors`, authHeaders),
                axios.get(`${API_URL}/auth/users/me`, authHeaders)
            ]);

            setMonitors(monitorsRes.data);
            setIsAdmin(userRes.data.role === 'admin');
            setError('');
        } catch (err) {
            setError('Failed to fetch health monitors.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMonitors();
    }, [fetchMonitors]);

    const handleCloseForm = () => {
        setEditingMonitor(null);
        fetchMonitors();
    };

    const handleDelete = async (monitorId, monitorName) => {
        if (window.confirm(`Are you sure you want to delete the monitor "${monitorName}"?`)) {
            try {
                const token = localStorage.getItem('access_token');
                await axios.delete(`${API_URL}/monitors/${monitorId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchMonitors();
            } catch (err) {
                setError(`Failed to delete ${monitorName}: ${err.response?.data?.detail || err.message}`);
            }
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Health Monitors</Typography>
            <Modal isOpen={!!editingMonitor} onClose={handleCloseForm}>
                <MonitorForm
                    key={editingMonitor ? editingMonitor.id : 'new'}
                    editingMonitor={editingMonitor}
                    onFinished={handleCloseForm}
                    apiUrl={API_URL}
                />
            </Modal>
            <Paper>
                {isAdmin && (
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={() => setEditingMonitor({})}>Add Monitor</Button>
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Interval / Timeout</TableCell>
                                <TableCell>Details</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : monitors.length > 0 ? (
                                monitors.map((monitor) => (
                                    <TableRow key={monitor.id} hover>
                                        <TableCell>{monitor.name}</TableCell>
                                        <TableCell>{monitor.type.toUpperCase()}</TableCell>
                                        <TableCell>{monitor.interval}s / {monitor.timeout}s</TableCell>
                                        <TableCell>
                                            {monitor.type === 'http' ? `${monitor.http_method} ${monitor.path} → ${monitor.expected_status}` : 'TCP Connect'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit">
                                                <span>
                                                    <IconButton onClick={() => setEditingMonitor(monitor)} disabled={!isAdmin}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <span>
                                                    <IconButton onClick={() => handleDelete(monitor.id, monitor.name)} disabled={!isAdmin}>
                                                        <DeleteIcon color="error" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} align="center">No health monitors created yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default Monitors;