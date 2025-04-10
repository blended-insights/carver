# Carver Dashboard Documentation

## Overview

The Carver Dashboard is a user-friendly web interface for managing and monitoring file watcher processes. It provides developers with a simple way to start, stop, and monitor file watchers that track changes in project directories.

## Features

- **Real-time Updates**: See file changes and watcher status in real-time through Redis subscriptions
- **Interactive UI**: Modern, developer-focused interface with monospaced fonts and a clean layout
- **Process Management**: Start, stop, and restart watcher processes with a simple interface
- **Folder Browsing**: Browse available folders and start new watcher processes
- **Status Monitoring**: Monitor the status of all active watchers

## Architecture

### Technology Stack

- **Next.js 15**: React framework for the frontend UI
- **Mantine UI**: Component library for the user interface
- **Redis**: Used for real-time event notifications
- **Server-Sent Events (SSE)**: For real-time updates from Redis to the browser
- **TypeScript**: For type safety and better developer experience

### Directory Structure

```
apps/web/
├── docs/               # Documentation
├── public/             # Static assets
├── src/
│   ├── app/            # Next.js application routes
│   │   ├── api/        # API routes for SSE
│   │   ├── folders/    # Folder listing and process detail pages
│   │   └── page.tsx    # Dashboard home page
│   ├── components/     # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── theme.ts        # Theme configuration
│   └── utils/          # Utility functions
│       ├── api.ts      # API client for watcher service
│       ├── logger.ts   # Logging utility
│       └── redis.ts    # Redis utilities
└── package.json        # Dependencies and scripts
```

### Components

- **Layout**: Main application layout with navigation sidebar
- **WatcherCard**: Card component for displaying watcher processes
- **PersistedFileChanges**: Timeline component for displaying file changes
- **PersistedWatcherStatus**: Timeline component for displaying watcher status events

### Hooks

- **usePersistedEvents**: Custom hook for managing Server-Sent Events connection

## Getting Started

### Prerequisites

Before running the dashboard, make sure you have:

1. Node.js 20.x or later
2. Redis server running locally or accessible via network
3. Carver Watcher service running (typically on port 4000)

### Installation

1. Navigate to the project directory:
   ```bash
   cd /path/to/carver
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the `apps/web` directory with:
     ```
     INTERNAL_WATCHER_API_URL=http://localhost:4000
     REDIS_URL=redis://localhost:6379
     ```

4. Start the development server:
   ```bash
   # Start both watcher and web services
   npm run dev
   
   # Or just the web dashboard
   npx nx run web:serve --configuration=development
   ```

5. Open your browser to http://localhost:3000

## User Guide

### Dashboard Page

The dashboard provides an overview of all active watcher processes. From here you can:

- View all active watchers in a grid layout
- See recent file changes and status updates
- Click on a watcher card to view details
- Stop or restart watcher processes directly from the cards

### Folders Page

The folders page shows all available folders that can be watched. From here you can:

- Browse all folders available for watching
- Start new watcher processes on selected folders - after starting a watcher, you'll be automatically redirected to the process detail page
- See which folders are already being watched

### Process Detail Page

Each watcher process has its own detail page where you can:

- See detailed information about the watcher process
- View a timeline of file changes specific to this process
- View status history for this process
- Stop or restart the watcher process (the kill button is always enabled for any process)

## Technical Details

### Navigation Flow

The application implements a user-friendly navigation flow:

1. **Dashboard to Folders**: From the dashboard, users can navigate to the folders page to browse available folders.
2. **Start Watcher**: When a user starts a watcher on the folders page, they are automatically redirected to the process detail page for the newly created watcher.
3. **Kill Process**: When a user kills a process from the process detail page, they are automatically redirected back to the folders page.
4. **Process Details**: Process details pages can be accessed directly via URLs in the format `/folders/[processId]`.

This navigation pattern creates a natural workflow for creating, monitoring, and ending watcher processes.

### Process Management

The dashboard provides controls for managing watcher processes:

- **Kill Button**: The kill button (red X icon) is always enabled, allowing users to terminate any process regardless of its current status. After killing a process, the user is automatically redirected to the folders page.
- **Restart Button**: The restart button (blue refresh icon) is disabled when a process is already running to prevent redundant restarts.

Process control is implemented through the following workflow:
1. User clicks the kill or restart button
2. The corresponding API endpoint is called (`/watchers/:processId/kill` or `/watchers/:processId/restart`)
3. The process state is updated in the backend
4. For kill actions, the user is automatically redirected to the folders page
5. For restart actions, real-time status updates are propagated through Redis channels and the UI reflects the new process status

### API Integration

The dashboard integrates with the Carver Watcher API through the following endpoints:

- `GET /folders`: Get a list of available folders
- `POST /folders/:folderPath/start?project=projectName`: Start a new watcher process
- `POST /watchers/:processId/kill`: Stop a watcher process
- `POST /watchers/:processId/restart`: Restart a watcher process
- `GET /watchers`: Get all active watcher processes

### Real-time Updates

The dashboard uses Server-Sent Events (SSE) to receive real-time updates from Redis.

1. The Next.js API route `/api/events` subscribes to Redis channels
2. The frontend connects to this SSE endpoint using the `usePersistedEvents` hook
3. Updates are pushed to the browser in real-time as they occur

#### Redis Channels

The application subscribes to two Redis channels:

1. `watcher.status`: For watcher status updates
   ```json
   {
     "processId": "watcher-1743732509429-60jma8x",
     "status": "shutdown",
     "message": "File watcher closed during server shutdown",
     "timestamp": 1743733477603
   }
   ```

2. `file.change`: For file change notifications
   ```json
   {
     "processId": "watcher-1743774616080-46i50qc",
     "eventType": "change",
     "filePath": "apps/watcher/src/lib/seeder/index.ts",
     "timestamp": 1743774840242
   }
   ```

## Customization and Development

### Theme Customization

The UI theme is defined in `src/theme.ts`. You can customize colors, fonts, and other UI elements by modifying this file.

### Adding New Features

To add new features:

1. Create new components in the `src/components` directory
2. Add new pages in the `src/app` directory following Next.js App Router conventions
3. Extend API utilities in `src/utils/api.ts` if new endpoints are needed

### Building for Production

To build the application for production:

```bash
npx nx build web
```

The production build will be available in the `apps/web/dist` directory.

## Troubleshooting

### CORS Issues

If you encounter CORS errors when making API requests:

1. Make sure the watcher service has CORS enabled
2. Check that the `INTERNAL_WATCHER_API_URL` environment variable is set correctly
3. Ensure the watcher service is running and accessible
4. For development environments, the API routes have CORS enabled and allow requests from `http://localhost:3000`
5. For production environments, the API routes allow requests from domains specified in the `ALLOWED_ORIGINS` environment variable. If not specified, it defaults to `https://app.carver.dev`
6. For custom domain setups, set the `ALLOWED_ORIGINS` environment variable with a comma-separated list of allowed origins (e.g., `https://app.example.com,https://api.example.com`)

### Redis Connection Issues

If real-time updates are not working:

1. Check that Redis is running and accessible
2. Verify the `REDIS_URL` environment variable is set correctly
3. Check the browser console for connection errors
4. Make sure the Redis channels are being published to

### Data Validation Errors

If you see unexpected behavior with the data:

1. Check the browser console for validation errors
2. Ensure the watcher API is returning data in the expected format
3. Verify that the environment variables are set correctly
