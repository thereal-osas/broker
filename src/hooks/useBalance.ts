'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Balance {
  id: string;
  user_id: string;
  total_balance: number;
  profit_balance: number;
  deposit_balance: number;
  bonus_balance: number;
  credit_score_balance: number;
  created_at: string;
  updated_at: string;
}

export function useBalance() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/balance');
      
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      
      const data = await response.json();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalance = () => {
    fetchBalance();
  };

  useEffect(() => {
    fetchBalance();
  }, [session]);

  return {
    balance,
    isLoading,
    error,
    refreshBalance,
  };
}
