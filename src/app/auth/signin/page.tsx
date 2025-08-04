"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, MessageCircle } from "lucide-react";

// Component to handle search params (needs Suspense)
function SearchParamsHandler({ setDeactivationMessage }: { setDeactivationMessage: (message: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for URL parameters indicating session invalidation or deactivation
    const message = searchParams.get('message');
    const reason = searchParams.get('reason');

    if (message === 'session_invalidated') {
      setDeactivationMessage("Your session has been terminated. Please contact support if you believe this is an error.");
    } else if (reason === 'account_deactivated') {
      setDeactivationMessage("Your account has been deactivated. Please contact support to regain access.");
    }
  }, [searchParams, setDeactivationMessage]);

  return null; // This component doesn't render anything
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deactivationMessage, setDeactivationMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Check if error is due to account deactivation
        if (result.error.includes('deactivated') || result.error.includes('ACCOUNT_DEACTIVATED')) {
          setDeactivationMessage("Your account has been deactivated. Please contact support to regain access.");
          setError("");
        } else {
          setError("Invalid email or password");
        }
      } else {
        // Get session to check user role
        const session = await getSession();
        if (session?.user?.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Handle search params with Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler setDeactivationMessage={setDeactivationMessage} />
      </Suspense>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <span className="text-white text-2xl font-bold">C</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-300">Sign in to your CredCrypto account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm"
            >
              {error}
            </motion.div>
          )}

          {deactivationMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-600/30 border border-red-500 rounded-lg p-4 text-red-100"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-100 mb-1">
                    Account Deactivated
                  </h3>
                  <p className="text-sm text-red-200 mb-3">
                    {deactivationMessage}
                  </p>
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4 text-red-300" />
                    <span className="text-xs text-red-300">
                      Contact our support team for immediate assistance
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Signing In...
              </div>
            ) : (
              "Sign In"
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-300">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

      
      </motion.div>
    </div>
  );
}
