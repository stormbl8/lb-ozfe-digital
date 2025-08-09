import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar,
    Typography, Divider, Button, AppBar, Grid, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import axios from 'axios';

import DashboardIcon from '@mui/icons-material/Dashboard';
import DnsIcon from '@mui/icons-material/Dns';
import SecurityIcon from '@mui/icons-material/Security';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import ShieldIcon from '@mui/icons-material/Shield';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PublicIcon from '@mui/icons-material/Public';

const drawerWidth = 260;
const API_URL = 'http://localhost:8000/api';

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Proxy Hosts', icon: <DnsIcon />, path: '/services' },
    { text: 'Server Pools', icon: <GroupWorkIcon />, path: '/pools' },
    { text: 'SSL Certificates', icon: <SecurityIcon />, path: '/certs' },
    { text: 'Health Monitors', icon: <FavoriteIcon />, path: '/monitors' },
];

const secondaryMenuItems = [
    { text: 'WAF Rules', icon: <ShieldIcon />, path: '/waf' },
    { text: 'GSLB Management', icon: <PublicIcon />, path: '/gslb' },
    { text: 'Logs', icon: <DescriptionIcon />, path: '/logs' },
    { text: 'Licenses', icon: <VerifiedUserIcon />, path: '/licenses' },
    { text: 'User Management', icon: <SupervisedUserCircleIcon />, path: '/admin' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [hasLicense, setHasLicense] = useState(false);
    const [versionInfo, setVersionInfo] = useState({ version: '', build_date: '', commit: '' });
    const [aboutOpen, setAboutOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        setUser(null);
        navigate('/login');
    };

    // Fetch logged-in user
    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const response = await axios.get(`${API_URL}/auth/users/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUser(response.data);
                } catch {
                    console.error("Failed to fetch user, logging out.");
                    handleLogout();
                }
            }
        };
        fetchUser();
    }, []);

    // Fetch license status
    useEffect(() => {
        const fetchLicenseStatus = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await axios.get(`${API_URL}/license`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setHasLicense(response.data.user_limit > 1);
            } catch {
                setHasLicense(false);
            }
        };
        if (user) fetchLicenseStatus();
    }, [user]);

    // Fetch API version info
    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const response = await axios.get(`${API_URL}/version`);
                setVersionInfo(response.data);
            } catch (error) {
                console.error("Failed to fetch API version", error);
            }
        };
        fetchVersion();
    }, []);

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Grid container justifyContent="space-between" alignItems="center">
                        <Grid item>
                            <Typography variant="h6" noWrap>
                                Load Balancer UI
                            </Typography>
                        </Grid>
                        <Grid item>
                            {user && (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <AccountCircleIcon sx={{ mr: 1 }} />
                                    <Typography>{user.username} ({user.role})</Typography>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </Toolbar>
            </AppBar>

            <Drawer
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column'
                    },
                }}
                variant="permanent"
                anchor="left"
            >
                <Toolbar />
                <div>
                    <List>
                        {menuItems.map((item) => (
                            <ListItem key={item.text} disablePadding>
                                <ListItemButton component={NavLink} to={item.path}
                                    disabled={!hasLicense && item.text === 'Proxy Hosts'}>
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                    <Divider />
                    <List>
                        {secondaryMenuItems.map((item) => (
                            <ListItem key={item.text} disablePadding>
                                <ListItemButton component={NavLink} to={item.path}
                                    disabled={!hasLicense && [
                                        'WAF Rules', 'GSLB Management', 'User Management',
                                        'Server Pools', 'Health Monitors', 'SSL Certificates'
                                    ].includes(item.text)}>
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </div>

                {/* Version / About Button */}
                <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Button variant="outlined" fullWidth onClick={() => setAboutOpen(true)}>
                        Version {versionInfo.version || '...'}
                    </Button>
                </Box>

                <Box sx={{ marginTop: 'auto', p: 2 }}>
                    <Button variant="contained" startIcon={<LogoutIcon />}
                        onClick={handleLogout} fullWidth>
                        Logout
                    </Button>
                </Box>
            </Drawer>

            <Box component="main" sx={{
                flexGrow: 1, bgcolor: 'background.default', p: 3,
                height: '100vh', overflow: 'auto'
            }}>
                <Toolbar />
                {children}
            </Box>

            {/* About Dialog */}
            <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)}>
                <DialogTitle>About</DialogTitle>
                <DialogContent dividers>
                    <Typography>API Version: {versionInfo.version || 'N/A'}</Typography>
                    <Typography>Build Date: {versionInfo.build_date || 'N/A'}</Typography>
                    <Typography>Git Commit: {versionInfo.commit || 'N/A'}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAboutOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Layout;
