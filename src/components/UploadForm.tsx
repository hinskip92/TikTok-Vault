import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useDownload } from '../contexts/DownloadContext';
import DownloadButton from './DownloadButton';

const UploadForm: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addLog } = useDownload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      addLog('Please upload a valid JSON file', 'error');
      return;
    }

    setSelectedFile(file);
    addLog(`Selected file: ${file.name}`, 'info');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-sm font-medium text-gray-900">Upload user_data.json</h3>
        <p className="mt-1 text-xs text-gray-500">
          Drag and drop or click to select your file
        </p>
      </div>
      {selectedFile && (
        <p className="mt-2 text-sm text-gray-600 text-center">
          Selected: {selectedFile.name}
        </p>
      )}
      <DownloadButton selectedFile={selectedFile} />
    </div>
  );
};

export default UploadForm;