import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, CircularProgress, Alert } from '@mui/material';

// The WebSocket URL is derived from the API URL
const WS_URL = 'ws://localhost:8000/ws/logs';
const MAX_LOGS = 200; // Keep the log display from growing infinitely

const LogViewer = ({ logType }) => {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/${logType}`);

    ws.onopen = () => {
      console.log(`Connected to ${logType} log stream.`);
      setIsConnected(true);
      setLogs(prev => [`--- Connected to ${logType} log stream ---`, ...prev]);
    };

    ws.onmessage = (event) => {
      setLogs(prev => [event.data, ...prev.slice(0, MAX_LOGS - 1)]);
    };

    ws.onclose = () => {
      console.log(`Disconnected from ${logType} log stream.`);
      setIsConnected(false);
      setLogs(prev => [`--- Disconnected from ${logType} log stream ---`, ...prev]);
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for ${logType}:`, error);
      setLogs(prev => [`--- WebSocket Error ---`, ...prev]);
    };

    // Cleanup function to close the WebSocket connection when the component unmounts
    return () => {
      ws.close();
    };
  }, [logType]); // Re-run effect if logType changes

  // Auto-scroll to the bottom of the log container
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>{logType.charAt(0).toUpperCase() + logType.slice(1)} Log</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>Status: <span style={{ color: isConnected ? 'green' : 'red' }}>●</span> {isConnected ? 'Connected' : 'Disconnected'}</Typography>
        <Box
            ref={logContainerRef}
            sx={{
                backgroundColor: '#2b2b2b',
                color: '#f1f1f1',
                border: '1px solid #ddd',
                p: 2,
                height: '300px',
                overflowY: 'scroll',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: 'monospace',
                fontSize: 12
            }}
        >
            {logs.join('\n')}
        </Box>
    </Paper>
  );
};

const Logs = () => {
  return (
    <Box>
        <Typography variant="h4" gutterBottom>Logs</Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>View real-time access and error logs from the NGINX proxy.</Typography>
        <LogViewer logType="access" />
        <LogViewer logType="error" />
    </Box>
  );
};

export default Logs;