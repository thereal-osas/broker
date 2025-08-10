"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "../../hooks/useToast";

interface BalanceManagerProps {
  userId: string;
  currentBalance: {
    total_balance: number;
    profit_balance: number;
    deposit_balance: number;
    bonus_balance: number;
    credit_score_balance: number;
    card_balance: number;
  };
  onBalanceUpdate: () => void;
}

export default function BalanceManager({
  userId,
  currentBalance,
  onBalanceUpdate,
}: BalanceManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState("total_balance");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [operation, setOperation] = useState<"add" | "subtract">("add");
  const toast = useToast();

  const balanceTypes = [
    { key: "total_balance", label: "Total Balance", color: "bg-blue-500" },
    { key: "card_balance", label: "Card Balance", color: "bg-indigo-500" },
    {
      key: "credit_score_balance",
      label: "Credit Score Balance",
      color: "bg-red-500",
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint =
        operation === "add"
          ? "/api/admin/balance/fund"
          : "/api/admin/balance/fund";
      const response = await fetch(endpoint, {
        method: operation === "add" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          balanceType: selectedBalance,
          amount: parseFloat(amount),
          description,
          operation,
        }),
      });

      if (response.ok) {
        setAmount("");
        setDescription("");
        onBalanceUpdate();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update balance");
      }
    } catch {
      toast.error("An error occurred while updating balance");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Balance Management
      </h3>

      {/* Current Balances Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {balanceTypes.map((type) => (
          <div key={type.key} className="bg-gray-50 rounded-lg p-3">
            <div className={`w-3 h-3 ${type.color} rounded-full mb-2`}></div>
            <p className="text-xs text-gray-600 mb-1">{type.label}</p>
            <p className="text-lg font-semibold text-gray-900">
              $
              {Math.max(
                0,
                typeof currentBalance[
                  type.key as keyof typeof currentBalance
                ] === "number"
                  ? currentBalance[type.key as keyof typeof currentBalance] || 0
                  : parseFloat(
                      String(
                        currentBalance[
                          type.key as keyof typeof currentBalance
                        ] || "0"
                      )
                    )
              ).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Balance Update Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Balance Type
            </label>
            <select
              value={selectedBalance}
              onChange={(e) => setSelectedBalance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {balanceTypes.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operation
            </label>
            <select
              value={operation}
              onChange={(e) =>
                setOperation(e.target.value as "add" | "subtract")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="add">Add Funds</option>
              <option value="subtract">Deduct Funds</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
            placeholder="Enter amount"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
            placeholder="Enter description for this transaction"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading || !amount}
          className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all ${
            operation === "add"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-red-600 hover:bg-red-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
              Processing...
            </div>
          ) : (
            `${operation === "add" ? "Add" : "Deduct"} $${amount || "0.00"}`
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}
