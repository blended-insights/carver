import { useState } from 'react';
import {
  executeDangerAction,
  DangerAction,
  DangerActionResponse,
} from '../api/danger';

/**
 * Hook for executing danger zone actions with loading and error handling
 */
export function useDangerAction() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DangerActionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Execute a danger zone action
   *
   * @param action The action to execute
   * @returns Promise with the action result
   */
  const executeAction = async (action: DangerAction) => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await executeDangerAction(action);
      setResult(response);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeAction,
    isLoading,
    result,
    error,
  };
}
