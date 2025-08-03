'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function HelpPage() {
  const { data: session } = useSession();

  const helpTopics = [
    {
      title: 'Account Issues',
      description: 'Problems with login, verification, or account access',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100',
    },
    {
      title: 'Investment Questions',
      description: 'Understanding investment plans and returns',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
    },
    {
      title: 'Transaction Support',
      description: 'Issues with deposits, withdrawals, or transfers',
      icon: Info,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'General Inquiries',
      description: 'Other questions about our platform',
      icon: HelpCircle,
      color: 'text-gray-600 bg-gray-100',
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Help Center</h1>
          <p className="text-gray-600">
            Get help with your account and find answers to common questions
          </p>
        </div>

        {/* Account Status Alert for Deactivated Users */}
        {session?.user && !session.user.isActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8"
          >
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-red-600 mt-1 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Account Deactivated
                </h3>
                <p className="text-red-700 mb-4">
                  Your account has been deactivated. To resolve this issue and regain full access 
                  to the platform, please contact our support team immediately.
                </p>
                <Link
                  href="/dashboard/support"
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Support Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Contact Support</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <MessageCircle className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <h3 className="font-semibold text-gray-900">Live Chat</h3>
                <p className="text-gray-600 text-sm">Get instant help from our support team</p>
                <Link
                  href="/dashboard/support"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Start Chat →
                </Link>
              </div>
            </div>

            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <Mail className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <h3 className="font-semibold text-gray-900">Email Support</h3>
                <p className="text-gray-600 text-sm">support@credcrypto.com</p>
                <p className="text-green-600 text-sm font-medium">Response within 24 hours</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-purple-50 rounded-lg">
              <Phone className="h-8 w-8 text-purple-600 mr-4" />
              <div>
                <h3 className="font-semibold text-gray-900">Phone Support</h3>
                <p className="text-gray-600 text-sm">+1 (555) 123-4567</p>
                <p className="text-purple-600 text-sm font-medium">Mon-Fri 9AM-6PM EST</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-orange-50 rounded-lg">
              <Clock className="h-8 w-8 text-orange-600 mr-4" />
              <div>
                <h3 className="font-semibold text-gray-900">Business Hours</h3>
                <p className="text-gray-600 text-sm">Monday - Friday</p>
                <p className="text-orange-600 text-sm font-medium">9:00 AM - 6:00 PM EST</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Help Topics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Common Help Topics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {helpTopics.map((topic, index) => (
              <motion.div
                key={topic.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
              >
                <div className="flex items-start">
                  <div className={`p-2 rounded-lg ${topic.color} mr-4`}>
                    <topic.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{topic.title}</h3>
                    <p className="text-gray-600 text-sm">{topic.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700 text-sm">
              <strong>Need immediate assistance?</strong> For urgent account issues or security concerns, 
              please contact our support team directly through live chat or phone.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
