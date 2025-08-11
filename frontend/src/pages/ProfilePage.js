import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    Box, Typography, TextField, Button, Paper
} from '@mui/material';

const API_URL = 'http://localhost:8000/api';

const ProfilePage = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters long.");
            return;
        }

        const toastId = toast.loading('Changing password...');
        try {
            const token = localStorage.getItem('access_token');
            await axios.put(`${API_URL}/auth/users/me/password`, {
                current_password: currentPassword,
                new_password: newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Password changed successfully!', { id: toastId });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>User Profile</Typography>
            <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>Change Password</Typography>
                <Box component="form" onSubmit={handleChangePassword} sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Current Password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Confirm New Password"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        required
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        sx={{ mt: 2 }}
                    >
                        Change Password
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default ProfilePage;
