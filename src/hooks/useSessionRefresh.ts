'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SessionRefreshOptions {
  onStatusChange?: (newStatus: boolean) => void;
  checkInterval?: number; // in milliseconds
  enabled?: boolean;
}

export function useSessionRefresh(options: SessionRefreshOptions = {}) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<boolean | null>(null);
  
  const {
    onStatusChange,
    checkInterval = 30000, // 30 seconds default
    enabled = true
  } = options;

  const refreshSession = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the session with fresh data
        await update({
          ...session,
          user: {
            ...session.user,
            ...data.user,
          },
        });

        // Check if status changed
        if (data.statusChanged && lastStatusRef.current !== null) {
          console.log('User status changed:', data.user.isActive);
          
          // Call status change callback
          if (onStatusChange) {
            onStatusChange(data.user.isActive);
          }

          // If user was deactivated, show notification and redirect to support
          if (!data.user.isActive && lastStatusRef.current === true) {
            // Force page refresh to apply middleware restrictions
            router.refresh();
          }
          
          // If user was reactivated, refresh the page
          if (data.user.isActive && lastStatusRef.current === false) {
            router.refresh();
          }
        }

        // Update last known status
        lastStatusRef.current = data.user.isActive;
        
        return data.user;
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
    }
  }, [session, update, onStatusChange, router]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    return await refreshSession();
  }, [refreshSession]);

  // Set up automatic refresh interval
  useEffect(() => {
    if (!enabled || !session?.user) return;

    // Set initial status
    if (lastStatusRef.current === null) {
      lastStatusRef.current = session.user.isActive;
    }

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(refreshSession, checkInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, session?.user, checkInterval, refreshSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    refreshSession: manualRefresh,
    isRefreshing: false, // Could add loading state if needed
  };
}
