import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Alert
} from '@mui/material';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8000/api';

const Admin = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        role: 'read-only'
    });

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/auth/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUsers(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch users. You may not have administrative privileges.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Creating user...');
        try {
            const token = localStorage.getItem('access_token');
            await axios.post(`${API_URL}/auth/users`, newUser, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('User created successfully!', { id: toastId });
            setNewUser({ username: '', email: '', password: '', role: 'read-only' });
            fetchUsers();
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>User Management</Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Create New User</Typography>
                <Box component="form" onSubmit={handleCreateUser} noValidate>
                    <TextField
                        margin="normal" required fullWidth label="Username" name="username"
                        value={newUser.username} onChange={handleInputChange}
                    />
                    <TextField
                        margin="normal" fullWidth label="Email" name="email" type="email"
                        value={newUser.email} onChange={handleInputChange}
                    />
                    <TextField
                        margin="normal" required fullWidth label="Password" name="password" type="password"
                        value={newUser.password} onChange={handleInputChange}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Role</InputLabel>
                        <Select name="role" value={newUser.role} onChange={handleInputChange} label="Role">
                            <MenuItem value="read-only">Read-Only</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                    <Button type="submit" variant="contained" sx={{ mt: 2 }}>Create User</Button>
                </Box>
            </Paper>

            <Paper>
                <Typography variant="h6" sx={{ p: 2 }}>Existing Users</Typography>
                {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Username</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.username}>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.role}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default Admin;