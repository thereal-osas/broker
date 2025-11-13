"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Gift,
  CreditCard,
  Filter,
  Calendar,
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_type: string;
  description: string;
  status: string;
  created_at: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionDisplayLabel = (type: string) => {
    switch (type) {
      case "admin_funding":
        return "Deposit Alert";
      case "admin_deduction":
        return "Debit Alert";
      case "credit":
        return "Credit Alert";
      case "debit":
        return "Debit Alert";
      case "referral_commission":
        return "Referral Commission";
      default:
        return type.replace("_", " ");
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
      case "admin_funding":
      case "credit":
        return <ArrowUpRight className="w-5 h-5 text-green-500" />;
      case "withdrawal":
      case "admin_deduction":
      case "debit":
        return <ArrowDownRight className="w-5 h-5 text-red-500" />;
      case "investment":
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case "profit":
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case "bonus":
        return <Gift className="w-5 h-5 text-orange-500" />;
      case "referral_commission":
        return <Gift className="w-5 h-5 text-purple-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "deposit":
      case "admin_funding":
      case "credit":
      case "profit":
      case "bonus":
      case "referral_commission":
        return "text-green-600";
      case "withdrawal":
      case "investment":
      case "admin_deduction":
      case "debit":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case "deposit":
      case "admin_funding":
      case "credit":
      case "profit":
      case "bonus":
      case "referral_commission":
        return "+";
      case "withdrawal":
      case "investment":
      case "admin_deduction":
      case "debit":
        return "-";
      default:
        return "";
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === "all") return true;
    return transaction.type === filter;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Transaction History
        </h1>
        <p className="text-gray-600">View all your account transactions</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Transactions</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="investment">Investments</option>
            <option value="profit">Profits</option>
            <option value="bonus">Bonuses</option>
            <option value="referral_commission">Referral Commissions</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Transactions Found
            </h3>
            <p className="text-gray-600">
              {filter === "all"
                ? "You haven't made any transactions yet."
                : `No ${filter} transactions found.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 capitalize">
                        {getTransactionDisplayLabel(transaction.type)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${getTransactionColor(
                        transaction.type
                      )}`}
                    >
                      {getAmountPrefix(transaction.type)}$
                      {(typeof transaction.amount === "number"
                        ? transaction.amount
                        : parseFloat(transaction.amount || "0")
                      ).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {transaction.balance_type} Balance
                    </p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : transaction.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
