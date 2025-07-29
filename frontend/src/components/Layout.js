import React from 'react';
import { NavLink } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DnsIcon from '@mui/icons-material/Dns';
import SecurityIcon from '@mui/icons-material/Security';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import ShieldIcon from '@mui/icons-material/Shield';
import GroupWorkIcon from '@mui/icons-material/GroupWork';

const drawerWidth = 260;

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Proxy Hosts', icon: <DnsIcon />, path: '/services' },
    { text: 'Server Pools', icon: <GroupWorkIcon />, path: '/pools' },
    { text: 'SSL Certificates', icon: <SecurityIcon />, path: '/certs' },
];

const secondaryMenuItems = [
    { text: 'WAF Rules', icon: <ShieldIcon />, path: '/waf' },
    { text: 'Logs', icon: <DescriptionIcon />, path: '/logs' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const Layout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex' }}>
            <Drawer
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
                variant="permanent"
                anchor="left"
            >
                <Toolbar>
                    <Typography variant="h6" noWrap component="div">
                        Load Balancer UI
                    </Typography>
                </Toolbar>
                <Divider />
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