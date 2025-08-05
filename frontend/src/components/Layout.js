import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
    Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, 
    Typography, Divider, Button, AppBar, Grid
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

const drawerWidth = 260;
const API_URL = 'http://localhost:8000/api';

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Proxy Hosts', icon: <DnsIcon />, path: '/services' },
    { text: 'Server Pools', icon: <GroupWorkIcon />, path: '/pools' },
    { text: 'SSL Certificates', icon: <SecurityIcon />, path: '/certs' },
];

const secondaryMenuItems = [
    { text: 'WAF Rules', icon: <ShieldIcon />, path: '/waf' },
    { text: 'Logs', icon: <DescriptionIcon />, path: '/logs' },
    { text: 'Licenses', icon: <VerifiedUserIcon />, path: '/licenses' },
    { text: 'User Management', icon: <SupervisedUserCircleIcon />, path: '/admin' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const Layout = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        setUser(null);
        navigate('/login');
    };

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const response = await axios.get(`${API_URL}/auth/users/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setUser(response.data);
                } catch (error) {
                    console.error("Failed to fetch user, logging out.");
                    handleLogout();
                }
            }
        };
        fetchUser();
    }, []);

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Grid container justifyContent="space-between" alignItems="center">
                        <Grid item>
                            <Typography variant="h6" noWrap component="div">
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
                                <ListItemButton component={NavLink} to={item.path}>
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
                                <ListItemButton component={NavLink} to={item.path}>
                                    <ListItemIcon>{item.icon}</ListItemIcon>
                                    <ListItemText primary={item.text} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </div>
                <Box sx={{ marginTop: 'auto', p: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                        fullWidth
                    >
                        Logout
                    </Button>
                </Box>
            </Drawer>
            <Box
                component="main"
                sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3, height: '100vh', overflow: 'auto' }}
            >
                <Toolbar /> 
                {children}
            </Box>
        </Box>
    );
};

export default Layout;