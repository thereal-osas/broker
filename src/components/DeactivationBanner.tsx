'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, MessageCircle, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function DeactivationBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="bg-red-50 border-l-4 border-red-500 p-6 mb-6 relative shadow-lg rounded-r-lg"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-red-800">
                Account Deactivated
              </h3>
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Deactivated
              </span>
            </div>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Your account has been deactivated. You cannot perform transactions, 
                investments, withdrawals, or other platform activities.
              </p>
              <p className="mt-2">
                <strong>Contact support immediately</strong> to resolve this issue and reactivate your account.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/dashboard/support"
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Support
              </Link>
              <Link
                href="/dashboard/help"
                className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help Center
              </Link>
            </div>
          </div>
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={() => setIsVisible(false)}
                className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
