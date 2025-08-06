import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Button, IconButton, Tooltip, CircularProgress, Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PoolForm from '../components/PoolForm';
import Modal from '../components/Modal';

const API_URL = 'http://localhost:8000/api';

const Pools = () => {
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingPool, setEditingPool] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const fetchPools = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };

            const [poolsRes, userRes] = await Promise.all([
                axios.get(`${API_URL}/pools`, authHeaders),
                axios.get(`${API_URL}/auth/users/me`, authHeaders)
            ]);

            setPools(poolsRes.data);
            setIsAdmin(userRes.data.role === 'admin');
            setError('');
        } catch (err) {
            setError('Failed to fetch server pools.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPools();
    }, [fetchPools]);

    const handleCloseForm = () => {
        setEditingPool(null);
        fetchPools();
    };

    const handleDelete = async (poolId, poolName) => {
        if (window.confirm(`Are you sure you want to delete the pool "${poolName}"?`)) {
            try {
                const token = localStorage.getItem('access_token');
                await axios.delete(`${API_URL}/pools/${poolId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchPools();
            } catch (err) {
                setError(`Failed to delete ${poolName}: ${err.response?.data?.detail || err.message}`);
            }
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Server Pools</Typography>
            <Modal isOpen={!!editingPool} onClose={handleCloseForm}>
                <PoolForm
                    key={editingPool ? editingPool.id : 'new'}
                    editingPool={editingPool}
                    onFinished={handleCloseForm}
                    apiUrl={API_URL}
                />
            </Modal>
            <Paper>
                {isAdmin && (
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={() => setEditingPool({})}>Add Server Pool</Button>
                    </Box>
                )}
                {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Algorithm</TableCell>
                                <TableCell>Servers</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : pools.length > 0 ? (
                                pools.map((pool) => (
                                    <TableRow key={pool.id} hover>
                                        <TableCell>{pool.name}</TableCell>
                                        <TableCell>{pool.load_balancing_algorithm}</TableCell>
                                        <TableCell>{pool.backend_servers.length}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Edit">
                                                <span>
                                                    <IconButton onClick={() => setEditingPool(pool)} disabled={!isAdmin}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <span>
                                                    <IconButton onClick={() => handleDelete(pool.id, pool.name)} disabled={!isAdmin}>
                                                        <DeleteIcon color="error" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={4} align="center">No server pools created yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default Pools;