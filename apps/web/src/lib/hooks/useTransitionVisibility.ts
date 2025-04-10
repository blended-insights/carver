'use client';

import { useState, useEffect } from 'react';

interface UseTransitionVisibilityOptions {
  /**
   * Delay in milliseconds before starting the transition
   * @default 100
   */
  delay?: number;
  
  /**
   * Initial visibility state
   * @default false
   */
  initialVisibility?: boolean;
}

/**
 * A hook to handle transition visibility with a delayed start
 * Useful for triggering entrance animations after component mounting
 */
export function useTransitionVisibility(options: UseTransitionVisibilityOptions = {}) {
  const { delay = 100, initialVisibility = false } = options;
  const [isVisible, setIsVisible] = useState(initialVisibility);
  
  useEffect(() => {
    // Small delay to ensure DOM is ready before starting the transition
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);
  
  return {
    isVisible,
    setIsVisible
  };
}
