import React from 'react';
import { Download } from 'lucide-react';
import { useDownload } from '../contexts/DownloadContext';
import { uploadAndStartDownload } from '../services/api';
import { initializeSocketListeners } from '../services/socket';

interface DownloadButtonProps {
  selectedFile: File | null;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ selectedFile }) => {
  const { state, addLog, updateProgress, setIsDownloading } = useDownload();
  const { isDownloading } = state;

  const handleDownload = async () => {
    if (!selectedFile) {
      addLog('Please select a file first', 'error');
      return;
    }

    try {
      setIsDownloading(true);
      addLog('Starting download process...', 'info');

      // Initialize socket listeners for real-time updates
      const cleanup = initializeSocketListeners(
        (progress) => updateProgress(progress),
        (message, type) => addLog(message, type)
      );

      // Start the download process
      await uploadAndStartDownload(selectedFile, 'downloads');
      
      addLog('Download process initiated successfully', 'success');
    } catch (error) {
      addLog(`Failed to start download: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={!selectedFile || isDownloading}
      aria-label="Start Download"
      className={`mt-6 w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white
        ${
          !selectedFile || isDownloading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }
      `}
    >
      <Download className="w-5 h-5 mr-2" />
      {isDownloading ? 'Downloading...' : 'Start Download'}
    </button>
  );
};

export default DownloadButton;
