import { useRedis } from '../context/RedisContext';

export const useProcessNotifications = (processId: string) => {
  const { state } = useRedis();

  const filteredStatuses = state.statuses.filter(
    (status) => status.processId === processId
  );
  const filteredFileChanges = state.fileChanges.filter(
    (change) => change.processId === processId
  );

  const mostRecentStatus = filteredStatuses.length > 0
    ? filteredStatuses.reduce((latest, status) =>
        status.timestamp > latest.timestamp ? status : latest,
      filteredStatuses[0])
    : undefined;

  return { statuses: filteredStatuses, fileChanges: filteredFileChanges, mostRecentStatus };
};
