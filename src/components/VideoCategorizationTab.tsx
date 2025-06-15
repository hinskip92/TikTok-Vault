import { useState, useEffect } from 'react';
import { FolderDot, FileText, Film } from 'lucide-react';
import { socket } from '../services/socket';

interface VideoFile {
  name: string;
  path: string;
  category?: string;
  description?: string;
  date?: string;
  url?: string;
}

interface CategorySummary {
  category: string;
  count: number;
  description?: string;
  monthKey?: string;
}

const VideoCategorizationTab = () => {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  const addToLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startCategorization = async () => {
    setProcessing(true);
    try {
      const response = await fetch('http://localhost:3001/api/categorize/start', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      addToLog(data.message);
      
      // Refresh video list after categorization
      fetchCategorizedVideos();
    } catch (error) {
      addToLog(`Error: ${error instanceof Error ? error.message : 'Failed to start categorization'}`);
    } finally {
      setProcessing(false);
    }
  };

  const fetchCategorizedVideos = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/videos');
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      addToLog(`Error fetching videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const filteredVideos = videos
    .filter(video => {
      const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
      const matchesSearch = video.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (video.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return (b.date || '').localeCompare(a.date || '');
      }
      return a.name.localeCompare(b.name);
    });

  // Function to update categories from videos
  const updateCategories = (videos: VideoFile[]) => {
    const categoryMap = new Map<string, CategorySummary>();
    
    videos.forEach(video => {
      if (video.category) {
        const key = video.category;
        const existing = categoryMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          categoryMap.set(key, {
            category: key,
            count: 1,
            monthKey: video.date ? new Date(video.date).toISOString().slice(0, 7) : undefined
          });
        }
      }
    });
    
    setCategories(Array.from(categoryMap.values()));
  };

  useEffect(() => {
    socket.on('downloadLog', ({ message, type }) => {
      addToLog(message);
    });

    return () => {
      socket.off('downloadLog');
    };
  }, []);

  // Update categories whenever videos change
  useEffect(() => {
    updateCategories(videos);
  }, [videos]);

  useEffect(() => {
    fetchCategorizedVideos();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FolderDot className="h-6 w-6 text-indigo-600" />
            Video Categorization
          </h2>
          <button
            onClick={startCategorization}
            disabled={processing}
            className={`px-4 py-2 rounded-md text-white ${
              processing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {processing ? 'Processing...' : 'Start Categorization'}
          </button>
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.category} value={cat.category}>{cat.category}</option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredVideos.map(video => (
            <div key={video.path} className="bg-gray-50 rounded-lg p-4 shadow-sm">
              <div 
                className="relative cursor-pointer group"
                onClick={() => setCurrentVideo(currentVideo?.path === video.path ? null : video)}
              >
                <video 
                  className="w-full h-48 object-cover rounded-lg mb-3"
                  preload="metadata"
                  playsInline
                  muted
                  key={video.path}
                  src={`http://localhost:3001/videos/${encodeURIComponent(video.relativePath)}`}
                  onError={(e) => {
                    console.error('Video loading error:', e);
                    addToLog(`Error loading video: ${video.name}`);
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  {currentVideo?.path !== video.path && (
                    <div className="w-12 h-12 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Video Player Modal */}
              {currentVideo?.path === video.path && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setCurrentVideo(null);
                    }
                  }}
                >
                  <div className="relative w-full max-w-4xl">
                    <button 
                      onClick={() => setCurrentVideo(null)}
                      className="absolute -top-10 right-0 text-white hover:text-gray-300 flex items-center gap-2"
                    >
                      <span>Close</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <video 
                      className="w-full rounded-lg"
                      controls
                      autoPlay
                      playsInline
                      src={`http://localhost:3001/videos/${encodeURIComponent(video.relativePath)}`}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Film className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium truncate">{video.name}</h4>
              </div>
              {video.category && (
                <span className="inline-block bg-indigo-100 text-indigo-800 text-sm px-2 py-1 rounded-full mb-2">
                  {video.category}
                </span>
              )}
              {video.description && (
                <p className="text-sm text-gray-600 mb-2">{video.description}</p>
              )}
              {video.date && (
                <p className="text-xs text-gray-500">
                  Added: {new Date(video.date).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Categories Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-gray-600" />
            Categories
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories
              .sort((a, b) => b.count - a.count)
              .map(cat => (
                <div 
                  key={cat.category} 
                  className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer transition-all ${
                    selectedCategory === cat.category ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedCategory(cat.category)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-medium">{cat.category}</span>
                      {cat.monthKey && (
                        <span className="text-xs text-gray-500">{cat.monthKey}</span>
                      )}
                    </div>
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm">
                      {cat.count}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Log Viewer */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-3">Processing Log</h3>
          <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
            {log.map((entry, index) => (
              <div key={index} className="text-gray-600">{entry}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCategorizationTab;
