import React, { useState } from 'react';
import { DownloadProvider } from './contexts/DownloadContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import UploadForm from './components/UploadForm';
import ProgressBar from './components/ProgressBar';
import LogViewer from './components/LogViewer';
import VideoCategorizationTab from './components/VideoCategorizationTab';

function App() {
  const [activeTab, setActiveTab] = useState('download');

  return (
    <DownloadProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Hero />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('download')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'download'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Download Videos
              </button>
              <button
                onClick={() => setActiveTab('categorize')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'categorize'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                Categorize Videos
              </button>
            </div>

            {activeTab === 'download' ? (
              <>
                <UploadForm />
                <ProgressBar />
                <LogViewer />
              </>
            ) : (
              <VideoCategorizationTab />
            )}
          </div>
        </main>
      </div>
    </DownloadProvider>
  );
}

export default App;