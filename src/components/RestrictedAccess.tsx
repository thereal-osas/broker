'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Lock, MessageCircle, HelpCircle } from 'lucide-react';
import Link from 'next/link';

interface RestrictedAccessProps {
  children: ReactNode;
  fallback?: ReactNode;
  allowedForDeactivated?: boolean;
}

export default function RestrictedAccess({ 
  children, 
  fallback,
  allowedForDeactivated = false 
}: RestrictedAccessProps) {
  const { data: session } = useSession();

  // If user is not logged in, show children (let auth handle it)
  if (!session?.user) {
    return <>{children}</>;
  }

  // If user is active, always show children
  if (session.user.isActive) {
    return <>{children}</>;
  }

  // If user is deactivated but this content is allowed for deactivated users
  if (allowedForDeactivated) {
    return <>{children}</>;
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default restriction message
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md mx-auto"
    >
      <div className="mb-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
          <Lock className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-600">
          Your account has been deactivated. This feature is not available.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          Contact support to resolve this issue and regain access to all platform features.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/support"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Support
          </Link>
          <Link
            href="/dashboard/help"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Help Center
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
