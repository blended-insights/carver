// Define your two notification types.
export interface WatcherStatusNotification {
  processId: string;
  status: 'started' | 'running' | 'error' | 'shutdown';
  message: string;
  timestamp: number;
}

export interface FileChangeNotification {
  processId: string;
  eventType: 'add' | 'change' | 'unlink';
  filePath: string;
  timestamp: number;
}

// watcher -> statuses & file changes