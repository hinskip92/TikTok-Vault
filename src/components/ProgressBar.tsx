import React from 'react';
import { useDownload } from '../contexts/DownloadContext';

const ProgressBar: React.FC = () => {
  const { state } = useDownload();
  const { progress } = state;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">
          Downloading videos ({progress.current} of {progress.total})
        </span>
        <span className="text-sm font-medium text-blue-600">
          {progress.percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5" role="progressbar" aria-valuenow={progress.percentage} aria-valuemin="0" aria-valuemax="100">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
