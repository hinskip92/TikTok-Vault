# TikTok Video AI Categorizer

An automated solution for downloading TikTok videos and intelligently categorizing them using Google's Gemini AI model.

## Features

- **Automated Downloads**: Batch download TikTok videos from provided URLs
- **AI-Powered Categorization**: Uses Google's Gemini AI to analyze and categorize videos
- **Smart Organization**: Automatically organizes videos into topic-based folders
- **Real-time Progress**: Live progress tracking and logging through WebSocket connection
- **User-Friendly Interface**: React-based frontend with TypeScript support

## Prerequisites

- Node.js (v14 or higher)
- PowerShell
- Google Cloud account with Gemini API access
- Environment Variables:
  - `GEMINI_API_KEY`: Your Google Gemini API key
  - `PORT`: (Optional) Server port number (defaults to 3001)

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../
npm install
```

3. Set up your environment variables:
Create a `.env` file in the server directory with:
```
GEMINI_API_KEY=your_api_key_here
PORT=3001
```

## Usage

1. Start the server:
```bash
cd server
npm start
```

2. Start the client:
```bash
npm run dev
```

3. Access the application at `http://localhost:5173`

## How It Works

1. **Download Process**:
   - Users upload a JSON file containing TikTok video URLs
   - PowerShell script downloads videos to the server
   - Real-time progress updates via WebSocket

2. **Categorization Process**:
   - Videos are uploaded to Google's Gemini AI
   - AI analyzes video content and generates categories
   - Videos are automatically sorted into category folders
   - Organized by date (YYYY-MM) and topic

3. **File Organization**:
   ```
   server/
   ├── downloads/
   │   ├── YYYY-MM/
   │   │   ├── category1/
   │   │   │   └── video1.mp4
   │   │   └── category2/
   │   │       └── video2.mp4
   │   └── ...
   ```

## API Endpoints

- `POST /api/download`: Start video download process
  - Requires JSON file with video URLs
  - Returns download progress via WebSocket

- `POST /api/categorize/start`: Begin AI categorization
  - Processes all downloaded videos
  - Returns categorization results via WebSocket

## WebSocket Events

- `downloadProgress`: Real-time download progress updates
- `downloadLog`: Status messages and errors
- Connection at `ws://localhost:3001`

## Technology Stack

- **Frontend**:
  - React
  - TypeScript
  - Socket.io-client

- **Backend**:
  - Node.js
  - Express
  - Socket.io
  - Google Generative AI
  - PowerShell scripting

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini AI for video analysis
- Socket.io for real-time communications
- PowerShell community for download scripts
