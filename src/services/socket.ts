import { io } from 'socket.io-client';
import { DownloadProgress } from '../types';

const SOCKET_URL = 'http://localhost:3001';

export const socket = io(SOCKET_URL);

export const initializeSocketListeners = (
  onProgress: (progress: DownloadProgress) => void,
  onLog: (message: string, type: 'info' | 'warning' | 'error' | 'success') => void
) => {
  socket.on('downloadProgress', (progress: DownloadProgress) => {
    onProgress(progress);
  });

  socket.on('downloadLog', ({ message, type }) => {
    onLog(message, type);
  });

  return () => {
    socket.off('downloadProgress');
    socket.off('downloadLog');
  };
};