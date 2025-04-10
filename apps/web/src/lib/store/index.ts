// Export everything from redis-store.ts
export * from './redis-store';

// Export relevant hooks and components
export { usePersistedEvents } from '@/lib/hooks/usePersistedEvents';
export { EventsManager } from '@/lib/components/EventsManager';
export { PersistedFileChanges } from '@/lib/components/PersistedFileChanges';
export { PersistedWatcherStatus } from '@/lib/components/PersistedWatcherStatus';
