"use client";

import { useState, useEffect } from "react";

interface Investment {
  id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  status: string;
  total_profit: number;
  created_at: string;
  updated_at: string;
  plan_name: string;
  daily_profit_rate: number;
  duration_days: number;
}

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/investments/user");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch investments");
      }

      setInvestments(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      console.error("Error fetching investments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const createInvestment = async (planId: string, amount: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/investments/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId, amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create investment");
      }

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    investments,
    fetchInvestments,
    createInvestment,
    isLoading,
    error,
  };
}
