"use client";

import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Gift,
  Star,
  Wallet,
} from "lucide-react";

interface BalanceCardsProps {
  balance: {
    total_balance: number;
    card_balance: number;
    credit_score_balance: number;
  };
}

export default function BalanceCards({ balance }: BalanceCardsProps) {
  const balanceItems = [
    {
      title: "Total Balance",
      amount: balance.total_balance,
      icon: DollarSign,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      description: "Your main account balance",
    },
    {
      title: "Card Balance",
      amount: balance.card_balance,
      icon: Wallet,
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      iconColor: "text-indigo-600",
      description: "Admin funding balance",
    },
    {
      title: "Credit Score",
      amount: balance.credit_score_balance,
      icon: Star,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
      description: "Your credit rating",
      isPoints: true, // Flag to indicate this is a points system
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {balanceItems.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
        >
          <div className={`h-2 bg-gradient-to-r ${item.color}`}></div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${item.bgColor}`}>
                <item.icon className={`w-6 h-6 ${item.iconColor}`} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {item.isPoints ? "CRD " : "$"}
                  {Math.max(
                    0,
                    typeof item.amount === "number"
                      ? item.amount
                      : parseFloat(item.amount || 0)
                  ).toFixed(item.isPoints ? 0 : 2)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
