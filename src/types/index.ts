export interface DownloadProgress {
  total: number;
  current: number;
  percentage: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface DownloadState {
  isDownloading: boolean;
  progress: DownloadProgress;
  logs: LogEntry[];
}