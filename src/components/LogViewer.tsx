import React, { useEffect, useRef } from 'react';
import { useDownload } from '../contexts/DownloadContext';
import { LogEntry } from '../types';

const LogViewer: React.FC = () => {
  const { state } = useDownload();
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 bg-gray-50 rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Download Logs</h2>
      </div>
      <div className="h-64 overflow-y-auto p-4 space-y-2">
        {state.logs.map((log) => (
          <div key={log.id} className={`text-sm ${getLogColor(log.type)}`}>
            <span className="text-gray-400">
              {log.timestamp.toLocaleTimeString()}{' '}
            </span>
            {log.message}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default LogViewer;