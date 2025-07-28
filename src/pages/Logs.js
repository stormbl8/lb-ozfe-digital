import React, { useState, useEffect, useRef } from 'react';

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
    <div className="card">
      <h3>{logType.charAt(0).toUpperCase() + logType.slice(1)} Log</h3>
      <p>Status: <span style={{ color: isConnected ? 'green' : 'red' }}>●</span> {isConnected ? 'Connected' : 'Disconnected'}</p>
      <pre
        ref={logContainerRef}
        style={{
          backgroundColor: '#2b2b2b',
          color: '#f1f1f1',
          border: '1px solid #ddd',
          padding: '10px',
          height: '300px',
          overflowY: 'scroll',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {logs.join('\n')}
      </pre>
    </div>
  );
};

const Logs = () => {
  return (
    <div>
      <h1 className="page-header">Logs</h1>
      <p>View real-time access and error logs from the NGINX proxy.</p>
      <LogViewer logType="access" />
      <LogViewer logType="error" />
    </div>
  );
};

export default Logs;