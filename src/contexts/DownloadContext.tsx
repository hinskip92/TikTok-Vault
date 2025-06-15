import React, { createContext, useContext, useState } from 'react';
import { DownloadState, LogEntry, DownloadProgress } from '../types';

interface DownloadContextType {
  state: DownloadState;
  addLog: (message: string, type: LogEntry['type']) => void;
  updateProgress: (progress: DownloadProgress) => void;
  setIsDownloading: (isDownloading: boolean) => void;
  clearLogs: () => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DownloadState>({
    isDownloading: false,
    progress: { total: 0, current: 0, percentage: 0 },
    logs: [],
  });

  const addLog = (message: string, type: LogEntry['type']) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      message,
      type,
    };
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, newLog],
    }));
  };

  const updateProgress = (progress: DownloadProgress) => {
    setState((prev) => ({
      ...prev,
      progress,
    }));
  };

  const setIsDownloading = (isDownloading: boolean) => {
    setState((prev) => ({
      ...prev,
      isDownloading,
    }));
  };

  const clearLogs = () => {
    setState((prev) => ({
      ...prev,
      logs: [],
    }));
  };

  return (
    <DownloadContext.Provider
      value={{
        state,
        addLog,
        updateProgress,
        setIsDownloading,
        clearLogs,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = () => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
};