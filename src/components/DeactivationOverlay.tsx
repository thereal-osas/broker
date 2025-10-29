"use client";

import { motion } from "framer-motion";
import { AlertTriangle, MessageCircle, Lock } from "lucide-react";
import Link from "next/link";

export default function DeactivationOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Account Access Restricted
          </h3>
          
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200 mb-4">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Deactivated
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Your account has been temporarily deactivated. You can only access the support page to contact our team for assistance.
          </p>
          
          <div className="space-y-3">
            <Link
              href="/dashboard/support"
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact Support
            </Link>
            
            <p className="text-xs text-gray-500">
              Please contact support to resolve this issue and reactivate your account.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
