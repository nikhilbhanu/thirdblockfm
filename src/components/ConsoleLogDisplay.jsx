import React, { useState, useEffect, useCallback } from 'react';

const ConsoleLogDisplay = () => {
    const [logs, setLogs] = useState([]);

    const addLog = useCallback((type, messages) => {
        const timestamp = new Date().toLocaleTimeString();
        const messageStr = messages.map(msg => {
            if (typeof msg === 'object') {
                try {
                    return JSON.stringify(msg, null, 2);
                } catch (e) {
                    return '[Unserializable Object]';
                }
            }
            return String(msg);
        }).join(' ');

        // Wrap setLogs in setTimeout to avoid state update during render
        setTimeout(() => {
            setLogs(prevLogs => [...prevLogs, { type, message: `[${timestamp}] ${type.toUpperCase()}: ${messageStr}` }]);
        }, 0); // Use a delay of 0 to push to the next event loop tick
    }, []);

    useEffect(() => {
        const originalConsole = { ...console };

        const newConsole = {
            ...originalConsole,
            log: (...args) => {
                originalConsole.log(...args);
                addLog('log', args);
            },
            error: (...args) => {
                originalConsole.error(...args);
                addLog('error', args);
            },
            warn: (...args) => {
                originalConsole.warn(...args);
                addLog('warn', args);
            },
            info: (...args) => {
                originalConsole.info(...args);
                addLog('info', args);
            },
            debug: (...args) => {
                originalConsole.debug(...args);
                addLog('debug', args);
            },
        };

        console = newConsole;

        // Cleanup function to restore original console
        return () => {
            console = originalConsole;
        };
    }, [addLog]);

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            left: '10px',
            right: '10px',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '5px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: 9999, // Ensure it's on top
        }}>
            <h4 style={{ marginTop: 0, marginBottom: '5px', borderBottom: '1px solid #777', paddingBottom: '5px' }}>Console Logs:</h4>
            {logs.length === 0 && <p>No logs yet...</p>}
            {logs.map((log, index) => (
                <div key={index} style={{
                    color: log.type === 'error' ? 'red' : log.type === 'warn' ? 'yellow' : 'white',
                    whiteSpace: 'pre-wrap', // Preserve whitespace and newlines
                    wordBreak: 'break-all', // Break long words
                    marginBottom: '5px',
                    borderBottom: '1px dashed #444',
                    paddingBottom: '3px'
                }}>
                    {log.message}
                </div>
            ))}
        </div>
    );
};

export default ConsoleLogDisplay;
