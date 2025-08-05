import React, { useState } from 'react';
import axios from 'axios';
import { Box, Typography, Button, Alert, Paper, TextField } from '@mui/material';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8000/api';

const Licenses = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            toast.error("Please select a file to upload.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await axios.post(`${API_URL}/auth/license/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage(response.data.message);
            setIsError(false);
            toast.success(response.data.message);
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            setMessage(errorMessage);
            setIsError(true);
            toast.error(errorMessage);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>License Management</Typography>
            <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6">Upload JWT License File</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                    Upload a JWT file to assign an "admin" or "read-only" role to your user account.
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField 
                        type="file" 
                        onChange={handleFileChange}
                        variant="outlined"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                    />
                    <Button 
                        variant="contained" 
                        onClick={handleFileUpload}
                        disabled={!selectedFile}
                    >
                        Upload License
                    </Button>
                </Box>
                {message && (
                    <Alert severity={isError ? "error" : "success"} sx={{ mt: 2 }}>
                        {message}
                    </Alert>
                )}
            </Paper>
        </Box>
    );
};

export default Licenses;