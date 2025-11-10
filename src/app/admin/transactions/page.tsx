"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Edit2,
  X,
  Search,
  Filter,
  CheckCircle,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";

interface Transaction {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: string;
  amount: number;
  balance_type: string;
  description: string;
  status: string;
  created_at: string;
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [newDate, setNewDate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, searchTerm, typeFilter]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        toast.error("Failed to fetch transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("An error occurred while fetching transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    setFilteredTransactions(filtered);
  };

  const handleEditDate = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setNewDate(new Date(transaction.created_at).toISOString().slice(0, 16));
  };

  const handleUpdateDate = async () => {
    if (!editingTransaction || !newDate) return;

    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/admin/transactions/${editingTransaction.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            created_at: newDate,
          }),
        }
      );

      if (response.ok) {
        toast.success("Transaction date updated successfully");
        setEditingTransaction(null);
        setNewDate("");
        fetchTransactions();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update transaction date");
      }
    } catch (error) {
      console.error("Error updating transaction date:", error);
      toast.error("An error occurred while updating transaction date");
    } finally {
      setIsUpdating(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      deposit: "bg-green-100 text-green-800",
      withdrawal: "bg-red-100 text-red-800",
      investment: "bg-blue-100 text-blue-800",
      profit: "bg-purple-100 text-purple-800",
      bonus: "bg-yellow-100 text-yellow-800",
      referral_commission: "bg-pink-100 text-pink-800",
      admin_funding: "bg-indigo-100 text-indigo-800",
      credit: "bg-green-100 text-green-800",
      debit: "bg-red-100 text-red-800",
      live_trade_investment: "bg-cyan-100 text-cyan-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const transactionTypes = [
    "all",
    "deposit",
    "withdrawal",
    "investment",
    "profit",
    "bonus",
    "referral_commission",
    "admin_funding",
    "credit",
    "debit",
    "live_trade_investment",
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Transaction Management
          </h1>
          <p className="text-gray-600">
            View and manage all user transactions
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by user email, name, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                {transactionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "all"
                      ? "All Types"
                      : type.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Transactions Found
              </h3>
              <p className="text-gray-600">
                {searchTerm || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No transactions available"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Date
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction, index) => (
                    <motion.tr
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.first_name} {transaction.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(transaction.type)}`}
                        >
                          {transaction.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ${parseFloat(String(transaction.amount)).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {transaction.balance_type}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {transaction.description || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(transaction.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleEditDate(transaction)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="Edit Date"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Date Modal */}
      {editingTransaction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Transaction Date
              </h3>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Transaction: {editingTransaction.type}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Amount: ${parseFloat(String(editingTransaction.amount)).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                User: {editingTransaction.email}
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Date & Time
              </label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingTransaction(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDate}
                disabled={isUpdating || !newDate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isUpdating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Update Date
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

