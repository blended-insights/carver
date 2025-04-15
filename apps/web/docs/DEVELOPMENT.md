# Carver Dashboard Development Guide

This guide provides information for developers who want to extend, modify, or contribute to the Carver Dashboard.

## Development Environment

### Prerequisites

- Node.js 20.x or later
- npm 7.x or later
- Redis server running locally or accessible via network
- Carver Watcher service running (typically on port 4000)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/blended-insights/carver.git
   cd carver
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file in `apps/web/.env.local`:
   ```
   WATCHER_API_URL=http://localhost:4000
   REDIS_URL=redis://localhost:6379
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the dashboard at http://localhost:3000

## Project Structure

The web package follows a standard Next.js App Router structure:

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

## Extending the Application

### Adding a New Page

1. Create a new directory in `src/app` for your page
2. Create a `page.tsx` file in the directory with your component
3. Use the Layout component for consistent styling
4. Add navigation links in the `Layout.tsx` file if needed

Example:

```tsx
// src/app/my-new-page/page.tsx
'use client';

import React from 'react';
import { Title, Text } from '@mantine/core';
import { Layout } from '../../components/Layout';

export default function MyNewPage() {
  return (
    <Layout>
      <Title order={2} className="mono">My New Page</Title>
      <Text>This is my new page content</Text>
    </Layout>
  );
}
```

### Creating a New Component

1. Create a new file in `src/components` for your component
2. Export the component with proper TypeScript types
3. Implement Mantine UI components for consistent styling
4. Add error handling and validation

Example:

```tsx
// src/components/MyNewComponent.tsx
import React from 'react';
import { Card, Text } from '@mantine/core';

interface MyNewComponentProps {
  title: string;
  content: string;
}

export function MyNewComponent({ title, content }: MyNewComponentProps) {
  return (
    <Card withBorder p="md">
      <Card.Section withBorder inheritPadding py="xs">
        <Text fw={500} className="mono">{title}</Text>
      </Card.Section>
      <Text mt="md">{content}</Text>
    </Card>
  );
}
```

### Adding a New Redis Channel

If you need to subscribe to a new Redis channel:

1. Update the `src/app/api/events/route.ts` file to include the new channel
2. Modify the `usePersistedEvents` hook to handle the new event type
3. Create types for the new notification format

Example:

```typescript
// In src/app/api/events/route.ts
const channels = ['watcher.status', 'file.change', 'my-new-channel'];

// In src/utils/redis.ts
export interface MyNewNotification {
  processId: string;
  someData: string;
  timestamp: number;
}

// In src/hooks/usePersistedEvents.ts
const [myNewNotifications, setMyNewNotifications] = useState<MyNewNotification[]>([]);

// ...inside the event handler
if (channel === 'my-new-channel') {
  const newData = data as MyNewNotification;
  setMyNewNotifications(prev => [newData, ...prev]);
}

// Include in the return value
return {
  // ...other values
  myNewNotifications,
};
```

## Customizing the UI

### Theme Customization

The application uses Mantine's theming system. To customize the theme:

1. Modify the `src/theme.ts` file:

```typescript
export const theme = createTheme({
  fontFamily: 'Your Sans Font, sans-serif',
  fontFamilyMonospace: 'Your Mono Font, monospace',
  headings: {
    fontFamily: 'Your Mono Font, monospace',
    sizes: {
      h1: { fontSize: '3rem' },
      // Other sizes...
    },
  },
  colors: {
    primary: yourCustomPrimaryColors,
    secondary: yourCustomSecondaryColors,
  },
  primaryColor: 'primary',
  primaryShade: 6,
});
```

2. Update global CSS in `src/app/globals.css` for custom styles.

### Adding Icons

The application uses Tabler Icons from `@tabler/icons-react`. To add new icons:

1. Import the icons from the package:

```typescript
import { 
  IconNewIcon1, 
  IconNewIcon2 
} from '@tabler/icons-react';
```

2. Use them in your components:

```tsx
<IconNewIcon1 size={24} />
```

## Testing

### Running Tests

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

1. Create a new test file next to the component you want to test
2. Use React Testing Library for component tests

Example:

```tsx
// src/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders the component with the correct title', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
```

## Building for Production

To build the application for production:

```bash
# Build the web package
npx nx build web

# Build all apps
npm run build
```

The production build will be available in the `apps/web/dist` directory.

## Common Development Patterns

### Data Fetching and State Management

The application uses React hooks for state management and data fetching:

```tsx
const [data, setData] = useState<DataType[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    const result = await apiFunction();
    setData(result);
  } catch (error) {
    setError('Error fetching data');
    console.error('Error:', error);
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

### Error Handling

Always add proper error handling to API calls and data processing:

```tsx
try {
  // Risky operation
} catch (error) {
  // Log the error
  logger.error('Error description:', error);
  
  // Set error state
  setError('User-friendly error message');
  
  // Optional: Throw the error for upper-level handling
  throw error;
} finally {
  // Clean up (e.g., set loading state to false)
  setIsLoading(false);
}
```

### Data Validation

Always validate data before processing it:

```tsx
if (!data || !Array.isArray(data)) {
  logger.error('Invalid data format:', data);
  setError('Received invalid data from the server');
  return;
}

// For nested objects
const validateWatcher = (watcher: any): boolean => {
  return watcher && 
    typeof watcher === 'object' && 
    typeof watcher.processId === 'string' &&
    typeof watcher.folderPath === 'string';
};

const validWatchers = data.filter(validateWatcher);
```

## Best Practices

1. **Type Safety**: Always use proper TypeScript types and interfaces
2. **Error Handling**: Add proper error handling to all async operations
3. **Data Validation**: Validate all data from external sources
4. **Component Structure**: Keep components focused and reusable
5. **Performance**: Optimize for performance using React hooks correctly
6. **Accessibility**: Make sure UI elements are accessible
7. **Documentation**: Document your code and components
8. **Testing**: Write tests for critical functionality

## Contributing

1. Create a new branch for your feature or fix
2. Make your changes with proper testing
3. Submit a pull request with a clear description
4. Make sure all tests pass
5. Update documentation if necessary

## Troubleshooting

See the main troubleshooting guide in README.md for common issues and solutions.

For development-specific issues:

1. **Next.js Build Errors**: Check for TypeScript errors and import issues
2. **Component Rendering Issues**: Use React Developer Tools to inspect component state
3. **API Connection Issues**: Check network tab in browser developer tools
4. **Redis Connection Issues**: Verify Redis server is running and accessible

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Mantine UI Documentation](https://mantine.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Redis Documentation](https://redis.io/documentation)
