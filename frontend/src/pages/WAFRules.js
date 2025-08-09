import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography, Button, IconButton, TextField, CircularProgress, Alert, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8000/api';

const WAFRules = () => {
    const [rulesets, setRulesets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newRulesetName, setNewRulesetName] = useState('');
    const [excludedRules, setExcludedRules] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    const fetchRulesets = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('access_token');
            const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
            
            const [rulesetsRes, userRes] = await Promise.all([
                axios.get(`${API_URL}/waf/rulesets`, authHeaders),
                axios.get(`${API_URL}/auth/users/me`, authHeaders)
            ]);
            
            setRulesets(rulesetsRes.data);
            setIsAdmin(userRes.data.role === 'admin');
            setError('');
        } catch (err) {
            setError('Failed to fetch WAF rulesets.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRulesets();
    }, [fetchRulesets]);

    const handleCreateRuleset = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Creating ruleset...');
        
        const excludedIds = excludedRules.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

        try {
            const token = localStorage.getItem('access_token');
            const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };
            await axios.post(`${API_URL}/waf/rulesets`, {
                name: newRulesetName,
                excluded_rule_ids: excludedIds
            }, authHeaders);

            toast.success('Ruleset created successfully!', { id: toastId });
            setNewRulesetName('');
            setExcludedRules('');
            fetchRulesets();
        } catch (err) {
            const errorMessage = err.response?.data?.detail || err.message;
            toast.error(`Error: ${errorMessage}`, { id: toastId });
        }
    };
    
    const handleDeleteRuleset = async (rulesetId, rulesetName) => {
        if (window.confirm(`Are you sure you want to delete the ruleset "${rulesetName}"?`)) {
            const toastId = toast.loading('Deleting ruleset...');
            try {
                const token = localStorage.getItem('access_token');
                await axios.delete(`${API_URL}/waf/rulesets/${rulesetId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                toast.success('Ruleset deleted successfully!', { id: toastId });
                fetchRulesets();
            } catch (err) {
                const errorMessage = err.response?.data?.detail || err.message;
                toast.error(`Error: ${errorMessage}`, { id: toastId });
            }
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>WAF Rulesets</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
                Create and manage reusable sets of WAF rules to apply to your proxy hosts. OWASP rule IDs to exclude can be found in the official documentation.
            </Typography>
            
            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Create New Ruleset</Typography>
                <Box component="form" onSubmit={handleCreateRuleset} sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField size="small" label="Ruleset Name" name="name" value={newRulesetName} onChange={(e) => setNewRulesetName(e.target.value)} required />
                    <TextField 
                        size="small" 
                        label="Excluded Rule IDs (Comma-separated)" 
                        name="excluded_rules" 
                        value={excludedRules} 
                        onChange={(e) => setExcludedRules(e.target.value)} 
                        helperText="e.g., 920230, 931130, 942200"
                        fullWidth
                    />
                    <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!isAdmin}>Create Ruleset</Button>
                </Box>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Existing Rulesets</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Excluded Rule IDs</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : rulesets.length > 0 ? (
                                rulesets.map((ruleset) => (
                                    <TableRow key={ruleset.id}>
                                        <TableCell>{ruleset.name}</TableCell>
                                        <TableCell>{ruleset.excluded_rule_ids.join(', ') || 'None'}</TableCell>
                                        <TableCell align="right">
                                            <Tooltip title="Delete">
                                                <IconButton onClick={() => handleDeleteRuleset(ruleset.id, ruleset.name)} disabled={!isAdmin}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} align="center">No rulesets configured.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default WAFRules;