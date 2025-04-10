# Carver Dashboard Component Documentation

This document provides detailed information about the components used in the Carver Dashboard.

## Layout Component

**File**: `src/components/Layout.tsx`

The Layout component provides the overall structure for the application, including the navigation sidebar and header.

### Props

| Prop | Type | Description |
|------|------|-------------|
| children | ReactNode | Content to render in the main area |

### Features

- Responsive sidebar that collapses on mobile
- Dynamic navigation links
- Active watcher list that updates automatically
- Consistent spacing and styling

### Example Usage

```tsx
import { Layout } from '../components/Layout';

export default function MyPage() {
  return (
    <Layout>
      <div>My page content</div>
    </Layout>
  );
}
```

## WatcherCard Component

**File**: `src/components/WatcherCard.tsx`

The WatcherCard component displays information about a watcher process in a card format.

### Props

| Prop | Type | Description |
|------|------|-------------|
| processId | string | ID of the watcher process |
| folderPath | string | Path to the folder being watched |
| status | string (optional) | Current status of the watcher (default: 'running') |
| onAction | Function (optional) | Callback to invoke after an action is performed |

### Features

- Display process ID and folder path
- Color-coded status badge
- Action buttons for viewing, restarting, and killing the process
- Error handling for invalid path data

### Example Usage

```tsx
import { WatcherCard } from '../components/WatcherCard';

// Inside your component
<WatcherCard
  processId="watcher-12345"
  folderPath="/path/to/project"
  status="running"
  onAction={() => fetchWatchers()}
/>
```

## FileChangesList Component

**File**: `src/components/FileChangesList.tsx`

This component displays a timeline of file changes for one or all watcher processes.

### Props

| Prop | Type | Description |
|------|------|-------------|
| changes | FileChangeNotification[] | Array of file change notifications |
| maxItems | number (optional) | Maximum number of items to display (default: 50) |
| processId | string (optional) | If provided, only show changes for this process |

### Features

- Visual timeline of file changes
- Color-coded by change type (add, change, delete)
- Displays file path and timestamp
- Empty state handling
- Sorts changes by timestamp (newest first)

### Example Usage

```tsx
import { FileChangesList } from '../components/FileChangesList';

// Inside your component
<FileChangesList 
  changes={fileChanges} 
  maxItems={10} 
  processId="watcher-12345"
/>
```

## WatcherStatusList Component

**File**: `src/components/WatcherStatusList.tsx`

This component displays a timeline of watcher status notifications.

### Props

| Prop | Type | Description |
|------|------|-------------|
| notifications | WatcherStatusNotification[] | Array of status notifications |
| maxItems | number (optional) | Maximum number of items to display (default: 50) |
| processId | string (optional) | If provided, only show notifications for this process |

### Features

- Visual timeline of status changes
- Color-coded by status type (started, running, error, shutdown)
- Displays status message and timestamp
- Empty state handling
- Sorts notifications by timestamp (newest first)

### Example Usage

```tsx
import { WatcherStatusList } from '../components/WatcherStatusList';

// Inside your component
<WatcherStatusList 
  notifications={statusNotifications} 
  maxItems={10} 
  processId="watcher-12345"
/>
```

## Custom Hooks

### usePersistedEvents Hook

**File**: `src/hooks/usePersistedEvents.ts`

This hook manages the Server-Sent Events (SSE) connection for real-time updates.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| options | Object | Configuration options |
| options.processId | string (optional) | If provided, filter events for this process |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| statusNotifications | WatcherStatusNotification[] | Array of status notifications |
| fileChanges | FileChangeNotification[] | Array of file change notifications |
| isConnected | boolean | Whether the SSE connection is established |
| error | string \| null | Error message if the connection failed |

### Features

- Automatic reconnection on error
- Filtering by process ID
- Automatic event parsing
- Connection status tracking

### Example Usage

```tsx
import { usePersistedEvents } from '../hooks/usePersistedEvents';

// Inside your component
const { 
  statusNotifications, 
  fileChanges, 
  isConnected, 
  error 
} = usePersistedEvents({ processId: 'watcher-12345' });
```

## Types and Interfaces

### FileChangeNotification

```typescript
interface FileChangeNotification {
  processId: string;
  eventType: 'add' | 'change' | 'unlink';
  filePath: string;
  timestamp: number;
}
```

### WatcherStatusNotification

```typescript
interface WatcherStatusNotification {
  processId: string;
  status: 'started' | 'running' | 'error' | 'shutdown';
  message: string;
  timestamp: number;
}
```

## Styling and Theming

The application uses a combination of Mantine's theme system and custom CSS classes.

### Global Classes

| Class | Description |
|-------|-------------|
| .mono | Applies monospace font styling |
| .code-filename | Styles for file names |
| .console | Styles for console/terminal output |
| .terminal | Styles for inline terminal text |

### Theme Configuration

The theme is configured in `src/theme.ts` with:

- Primary colors for interactive elements
- Secondary colors for UI elements
- Typography settings with monospace headings
- Custom font sizes for headings
- Font family configuration
