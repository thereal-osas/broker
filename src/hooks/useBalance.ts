"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Balance {
  id: string;
  user_id: string;
  total_balance: number;
  card_balance: number;
  credit_score_balance: number;
  created_at: string;
  updated_at: string;
}

export function useBalance() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/balance");

      if (!response.ok) {
        throw new Error("Failed to fetch balance");
      }

      const data = await response.json();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh balance every 2 minutes when enabled
  useEffect(() => {
    if (!autoRefresh || !session?.user) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, session?.user, fetchBalance]);

  // Listen for global balance refresh events (e.g., from profit distribution)
  useEffect(() => {
    if (!session?.user) return;

    const handleBalanceRefresh = (event: CustomEvent) => {
      console.log("Balance refresh triggered:", event.detail);
      fetchBalance();
    };

    window.addEventListener(
      "balanceRefresh",
      handleBalanceRefresh as EventListener
    );

    return () => {
      window.removeEventListener(
        "balanceRefresh",
        handleBalanceRefresh as EventListener
      );
    };
  }, [session?.user, fetchBalance]);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  return {
    balance,
    isLoading,
    error,
    refreshBalance,
    autoRefresh,
    toggleAutoRefresh,
  };
}
