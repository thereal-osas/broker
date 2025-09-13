"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Timer,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

interface DistributionResult {
  success: boolean;
  processed: number;
  skipped: number;
  errors: number;
  completed?: number;
  totalAmount?: number;
  message: string;
  details: string[];
  timestamp: string;
}

interface CooldownStatus {
  isOnCooldown: boolean;
  nextAllowedTime: Date | null;
  remainingTime: number;
  remainingTimeFormatted: string;
}

interface DistributionState {
  isProcessing: boolean;
  progress: string;
  result: DistributionResult | null;
  cooldown: CooldownStatus | null;
}

interface EnhancedDistributionButtonProps {
  type: "investment" | "liveTrade";
  state: DistributionState;
  onTrigger: () => void;
  onConfirm: () => void;
  showConfirm: boolean;
  onCancelConfirm: () => void;
  activeCount: number;
}

export function EnhancedDistributionButton({
  type,
  state,
  onTrigger,
  onConfirm,
  showConfirm,
  onCancelConfirm,
  activeCount,
}: EnhancedDistributionButtonProps) {
  const isInvestment = type === "investment";
  const title = isInvestment ? "Investment Profits" : "Live Trade Profits";
  const cooldownType = isInvestment ? "24 hours" : "1 hour";
  
  const isDisabled = state.isProcessing || (state.cooldown?.isOnCooldown ?? false);
  
  const getButtonColor = () => {
    if (state.isProcessing) return "bg-yellow-500 hover:bg-yellow-600";
    if (state.cooldown?.isOnCooldown) return "bg-gray-400 cursor-not-allowed";
    return isInvestment ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700";
  };

  const getButtonText = () => {
    if (state.isProcessing) return "Processing...";
    if (state.cooldown?.isOnCooldown) return `Cooldown: ${state.cooldown.remainingTimeFormatted}`;
    return `Run ${title}`;
  };

  const getIcon = () => {
    if (state.isProcessing) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (state.cooldown?.isOnCooldown) return <Timer className="w-4 h-4" />;
    return <Play className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Main Button */}
      <div className="relative">
        <button
          onClick={onTrigger}
          disabled={isDisabled}
          className={`
            flex items-center justify-center px-6 py-3 rounded-lg text-white font-medium
            transition-all duration-200 min-w-[200px] relative overflow-hidden
            ${getButtonColor()}
            ${isDisabled ? "opacity-75" : "hover:shadow-lg transform hover:scale-105"}
          `}
        >
          <div className="flex items-center space-x-2">
            {getIcon()}
            <span>{getButtonText()}</span>
          </div>
          
          {/* Progress bar for processing */}
          {state.isProcessing && (
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-white/30"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </button>

        {/* Active count badge */}
        {activeCount > 0 && !state.isProcessing && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
          >
            {activeCount}
          </motion.div>
        )}
      </div>

      {/* Progress Text */}
      <AnimatePresence>
        {state.isProcessing && state.progress && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-gray-600 text-center"
          >
            {state.progress}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cooldown Info */}
      {state.cooldown?.isOnCooldown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center space-x-2 text-sm text-gray-500"
        >
          <Clock className="w-4 h-4" />
          <span>Next distribution in {state.cooldown.remainingTimeFormatted}</span>
        </motion.div>
      )}

      {/* Last Result */}
      <AnimatePresence>
        {state.result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`
              p-4 rounded-lg border-l-4 space-y-2
              ${state.result.success 
                ? "bg-green-50 border-green-400" 
                : "bg-red-50 border-red-400"
              }
            `}
          >
            <div className="flex items-center space-x-2">
              {state.result.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className={`font-medium ${
                state.result.success ? "text-green-800" : "text-red-800"
              }`}>
                {state.result.message}
              </span>
            </div>
            
            <div className="text-sm space-y-1">
              {state.result.details.map((detail, index) => (
                <div key={index} className={
                  state.result!.success ? "text-green-700" : "text-red-700"
                }>
                  • {detail}
                </div>
              ))}
            </div>
            
            <div className="text-xs text-gray-500">
              {new Date(state.result.timestamp).toLocaleString()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={onCancelConfirm}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <h3 className="text-lg font-semibold">Confirm Distribution</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to run {title.toLowerCase()} distribution? 
                This will process all eligible accounts and cannot be undone.
                {activeCount > 0 && (
                  <span className="block mt-2 font-medium">
                    {activeCount} {isInvestment ? "investments" : "live trades"} will be processed.
                  </span>
                )}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={onCancelConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className={`
                    flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors
                    ${isInvestment ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                  `}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
