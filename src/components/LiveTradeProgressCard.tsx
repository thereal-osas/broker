"use client";

import { useState, useEffect } from "react";
import { 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  CheckCircle, 
  Pause, 
  XCircle,
  Calendar,
  BarChart3
} from "lucide-react";

interface LiveTradeProgressProps {
  trade: {
    id: string;
    plan_name: string;
    amount: number;
    status: string;
    total_profit: number;
    hourly_profit_rate: number;
    duration_hours: number;
    start_time: string;
    end_time?: string;
  };
  onRefresh?: () => void;
}

export default function LiveTradeProgressCard({ trade, onRefresh }: LiveTradeProgressProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hourlyProfits, setHourlyProfits] = useState<any[]>([]);
  const [isLoadingProfits, setIsLoadingProfits] = useState(false);

  // Update current time every minute for real-time progress
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Fetch hourly profit details
  useEffect(() => {
    fetchHourlyProfits();
  }, [trade.id]);

  const fetchHourlyProfits = async () => {
    setIsLoadingProfits(true);
    try {
      const response = await fetch(`/api/live-trade/profits/${trade.id}`);
      if (response.ok) {
        const data = await response.json();
        setHourlyProfits(data.profits || []);
      }
    } catch (error) {
      console.error("Error fetching hourly profits:", error);
    } finally {
      setIsLoadingProfits(false);
    }
  };

  const calculateProgress = () => {
    const startTime = new Date(trade.start_time);
    const endTime = trade.end_time ? new Date(trade.end_time) : null;
    const totalDurationMs = trade.duration_hours * 60 * 60 * 1000;
    
    if (trade.status === 'completed' || endTime) {
      return 100;
    }
    
    if (trade.status !== 'active') {
      return 0;
    }

    const elapsedMs = currentTime.getTime() - startTime.getTime();
    const progress = Math.min((elapsedMs / totalDurationMs) * 100, 100);
    return Math.max(progress, 0);
  };

  const getTimeElapsed = () => {
    const startTime = new Date(trade.start_time);
    const endTime = trade.end_time ? new Date(trade.end_time) : currentTime;
    const elapsedMs = endTime.getTime() - startTime.getTime();
    
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getTimeRemaining = () => {
    if (trade.status !== 'active') return 'N/A';
    
    const startTime = new Date(trade.start_time);
    const totalDurationMs = trade.duration_hours * 60 * 60 * 1000;
    const endTime = new Date(startTime.getTime() + totalDurationMs);
    const remainingMs = endTime.getTime() - currentTime.getTime();
    
    if (remainingMs <= 0) return 'Completed';
    
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getExpectedCompletion = () => {
    const startTime = new Date(trade.start_time);
    const totalDurationMs = trade.duration_hours * 60 * 60 * 1000;
    const endTime = new Date(startTime.getTime() + totalDurationMs);
    
    return endTime.toLocaleString();
  };

  const getStatusIcon = () => {
    switch (trade.status) {
      case 'active':
        return <Activity className="w-5 h-5 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Pause className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (trade.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const progress = calculateProgress();
  const expectedTotalProfit = trade.amount * trade.hourly_profit_rate * trade.duration_hours;
  const profitPercentage = expectedTotalProfit > 0 ? (trade.total_profit / expectedTotalProfit) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{trade.plan_name}</h3>
          <p className="text-sm text-gray-500">Investment: ${formatCurrency(trade.amount)}</p>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>
            {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              trade.status === 'active' ? 'bg-green-500' : 
              trade.status === 'completed' ? 'bg-blue-500' : 'bg-gray-400'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Time Elapsed</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{getTimeElapsed()}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Time Remaining</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{getTimeRemaining()}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Profit Earned</span>
          </div>
          <p className="text-lg font-semibold text-green-600">${formatCurrency(trade.total_profit)}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Expected Total</span>
          </div>
          <p className="text-lg font-semibold text-blue-600">${formatCurrency(expectedTotalProfit)}</p>
        </div>
      </div>

      {/* Profit Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Profit Progress</span>
          <span className="text-sm text-gray-500">{profitPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(profitPercentage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Trade Details */}
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Hourly Rate:</span>
          <span className="font-medium text-green-600">
            {(trade.hourly_profit_rate * 100).toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Duration:</span>
          <span className="font-medium">{trade.duration_hours} hours</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Started:</span>
          <span className="font-medium">{new Date(trade.start_time).toLocaleString()}</span>
        </div>
        {trade.status === 'active' && (
          <div className="flex justify-between">
            <span className="text-gray-500">Expected Completion:</span>
            <span className="font-medium">{getExpectedCompletion()}</span>
          </div>
        )}
        {trade.end_time && (
          <div className="flex justify-between">
            <span className="text-gray-500">Completed:</span>
            <span className="font-medium">{new Date(trade.end_time).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Hourly Profits Summary */}
      {hourlyProfits.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Hourly Distributions ({hourlyProfits.length})
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Last distribution: {hourlyProfits.length > 0 ? 
              new Date(hourlyProfits[hourlyProfits.length - 1].created_at).toLocaleString() : 
              'None yet'
            }
          </div>
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm"
        >
          Refresh Data
        </button>
      )}
    </div>
  );
}
