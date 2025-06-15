import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import fs from 'fs';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add debug logging for API initialization
console.log('Starting server initialization...');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
console.log('Server and Socket.IO initialized');

app.use(cors());
// Serve video files with proper MIME type and headers
app.use('/videos', (req, res, next) => {
  const filePath = path.join(__dirname, 'downloads', decodeURIComponent(req.url).replace(/^\//, '').replace(/\//g, path.sep));
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Video not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, 'user_data.json');
  }
});

const upload = multer({ storage });

// Debug line to check if API key is accessible
console.log('API Key available:', !!process.env.GEMINI_API_KEY);

// Initialize both the GenerativeAI and FileManager
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

// Function to upload video using File API
async function uploadVideoToGemini(videoPath) {
  console.log('Uploading video to Gemini...');
  
  const uploadResponse = await fileManager.uploadFile(videoPath, {
    mimeType: 'video/mp4',
    displayName: path.basename(videoPath)
  });
  
  console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);
  return uploadResponse.file;
}

// Function to check video processing status
async function waitForVideoProcessing(file) {
  console.log('Checking video processing status...');
  let currentFile = await fileManager.getFile(file.name);
  
  while (currentFile.state === FileState.PROCESSING) {
    console.log('Video still processing, waiting...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    currentFile = await fileManager.getFile(file.name);
  }

  if (currentFile.state === FileState.FAILED) {
    throw new Error('Video processing failed');
  }
  
  return currentFile;
}

// Function to analyze video using Gemini
async function analyzeVideoWithGemini(file, prompt) {
  console.log('Analyzing video with Gemini...');
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: file.mimeType,
        fileUri: file.uri
      }
    },
    { text: prompt }
  ]);

  const response = await result.response;
  return response.text();
}

app.post('/api/download', upload.single('jsonFile'), (req, res) => {
  console.log('Download endpoint hit');
  const { file } = req;
  if (!file) {
    console.error('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  console.log('File uploaded successfully:', file.path);

  const scriptPath = path.join(__dirname, 'Get-TikTokVideo.ps1');
  const outputPath = path.join(__dirname, 'downloads');
  
  console.log('Script path:', scriptPath);
  console.log('Output path:', outputPath);

  // Verify the PowerShell script exists
  if (!fs.existsSync(scriptPath)) {
    console.error('PowerShell script not found at:', scriptPath);
    return res.status(500).json({ error: 'PowerShell script not found' });
  }

  // Verify the output directory exists, create if it doesn't
  if (!fs.existsSync(outputPath)) {
    console.log('Creating output directory:', outputPath);
    fs.mkdirSync(outputPath, { recursive: true });
  }

  console.log('Spawning PowerShell process...');
  const powershell = spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    '-JsonFile', path.join(__dirname, 'uploads', 'user_data.json'),
    '-OutputFolder', outputPath
  ]);

  console.log('PowerShell process spawned');

  powershell.stdout.on('data', (data) => {
    const message = data.toString().trim();
    console.log('PowerShell stdout:', message);
    io.emit('downloadLog', { message, type: 'info' });
    
    // Parse progress information if available
    const progressMatch = message.match(/Downloading video (\d+) of (\d+)/);
    if (progressMatch) {
      const current = parseInt(progressMatch[1]);
      const total = parseInt(progressMatch[2]);
      const percentage = Math.round((current / total) * 100);
      console.log(`Download progress: ${percentage}%`);
      
      io.emit('downloadProgress', {
        current,
        total,
        percentage
      });
    }
  });

  powershell.stderr.on('data', (data) => {
    const errorMessage = data.toString().trim();
    console.error('PowerShell stderr:', errorMessage);
    io.emit('downloadLog', {
      message: errorMessage,
      type: 'error'
    });
  });

  powershell.on('error', (error) => {
    console.error('Failed to start PowerShell process:', error);
    io.emit('downloadLog', {
      message: `Failed to start download process: ${error.message}`,
      type: 'error'
    });
    res.status(500).json({ error: 'Failed to start download process' });
  });

  powershell.on('close', (code) => {
    console.log('PowerShell process closed with code:', code);
    if (code === 0) {
      io.emit('downloadLog', {
        message: 'Download completed successfully',
        type: 'success'
      });
    } else {
      io.emit('downloadLog', {
        message: `Process exited with code ${code}`,
        type: 'error'
      });
    }
  });

  // Send immediate response to prevent timeout
  console.log('Sending initial response');
  res.json({ message: 'Download started' });
});

// Define downloads path constant
const downloadsPath = path.join(__dirname, 'downloads');

// Helper function to get all video files recursively
async function getAllVideoFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return getAllVideoFiles(fullPath);
    } else if (entry.name.endsWith('.mp4')) {
      // Extract category from path
      const pathParts = fullPath.split(path.sep);
      const category = pathParts[pathParts.length - 2];
      const date = entry.name.split('.')[0]; // Gets YYYY-MM-DD-HH-MM-SS
      
      // Convert the filename date format to ISO string
      const dateParts = date.split('-');
      const isoDate = new Date(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-based)
        parseInt(dateParts[2]),
        parseInt(dateParts[3]),
        parseInt(dateParts[4]),
        parseInt(dateParts[5])
      ).toISOString();

      // Get path relative to downloads directory
      const relativePath = path.relative(downloadsPath, fullPath);
      return [{
        name: entry.name,
        path: fullPath,
        relativePath: relativePath,
        category: category,
        date: isoDate
      }];
    }
    return [];
  }));
  
  return files.flat();
}

// Endpoint to get all categorized videos
app.get('/api/videos', async (req, res) => {
  try {
    if (!fs.existsSync(downloadsPath)) {
      console.log('Downloads directory not found, creating it...');
      fs.mkdirSync(downloadsPath, { recursive: true });
    }
    
    const videos = await getAllVideoFiles(downloadsPath);
    console.log(`Found ${videos.length} videos`);
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: `Failed to fetch videos: ${error.message}` });
  }
});

app.post('/api/categorize/start', async (req, res) => {
  try {
    console.log('Starting categorization process');
    const downloadsPath = path.join(__dirname, 'downloads');
    console.log('Downloads path:', downloadsPath);
    
    io.emit('downloadLog', {
      message: 'Starting video categorization...',
      type: 'info'
    });

    const files = await readdir(downloadsPath);
    const videoFiles = files.filter(file => file.endsWith('.mp4'));

    for (const file of videoFiles) {
      console.log(`Processing video: ${file}`);
      io.emit('downloadLog', {
        message: `Processing ${file}...`,
        type: 'info'
      });

      try {
        const videoPath = path.join(downloadsPath, file);
        console.log('Video path:', videoPath);

        // Step 1: Upload video to Gemini
        const uploadedFile = await uploadVideoToGemini(videoPath);
        
        // Step 2: Wait for processing
        const processedFile = await waitForVideoProcessing(uploadedFile);
        
        // Step 3: Analyze the video
        const prompt = `You are a video analysis assistant. Analyze this TikTok video and output ONLY a JSON object with exactly these fields:
        {
          "category": "a single word or short phrase category in lowercase (e.g., 'health', 'technology', 'self-help')",
          "description": "a brief description"
        }
        Do not include any other text in your response. Ensure the category is in lowercase and uses hyphens for multi-word categories.`;
        
        const responseText = await analyzeVideoWithGemini(processedFile, prompt);
        console.log('Analysis response:', responseText);
        
        // Parse the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No valid JSON found in response');
        }
        
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Extract date and organize files
        const datePart = file.split('.')[0];
        const date = new Date(datePart.replace(/-/g, ' '));
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const categoryPath = path.join(downloadsPath, monthKey, analysis.category);
        await fs.promises.mkdir(categoryPath, { recursive: true });

        const oldPath = path.join(downloadsPath, file);
        const newPath = path.join(categoryPath, file);
        
        await fs.promises.rename(oldPath, newPath);
        
        // Clean up the uploaded file
        await fileManager.deleteFile(processedFile.name);
        
        io.emit('downloadLog', {
          message: `Categorized ${file} as "${analysis.category}": ${analysis.description}`,
          type: 'success'
        });

      } catch (error) {
        console.error(`Error processing ${file}:`, error);
        io.emit('downloadLog', {
          message: `Failed to process ${file}: ${error.message}`,
          type: 'error'
        });
      }
    }

    console.log('Categorization process completed');
    res.json({ message: 'Video categorization completed successfully' });
  } catch (error) {
    console.error('Fatal categorization error:', error);
    io.emit('downloadLog', {
      message: `Categorization error: ${error.message}`,
      type: 'error'
    });
    res.status(500).json({ error: 'Failed to start categorization' });
  }
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
