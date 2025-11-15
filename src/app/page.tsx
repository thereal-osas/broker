"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  TrendingUp,
  Shield,
  DollarSign,
  Users,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user) {
      if (session.user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (session?.user) {
    return null; // Will redirect
  }

  const features = [
    {
      icon: TrendingUp,
      title: "Seamless Crypto Transactions",
      description: "Send and receive crptocurrency with unmatched ease and security through our optimized transaction system.",
    },
    {
      icon: Shield,
      title: "70% Loss Coverage",
      description: "Trade and invest with confidence. At BCP, we cover 70% of losses, minimizing your risk and ensuring a safer investment experience.",
    },
    {
      icon: DollarSign,
      title: "Fiat-Crypto Bridge",
      description: "Enjoy smooth conversions between USD, EUR, empowering you to operate freely across both traditional and digital financial ecosystems.",
    },
    {
      icon: Users,
      title: "Cloud Trading & Mining",
      description: "Access real-time expert trading calls and efficient mining through our advanced pool merge system; maximizing performance and profitability.",
    },
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-2xl font-bold text-white">BCP</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/auth/signin"
              className="text-gray-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6"
          >
            Trade Smart,
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              {" "}
              Earn More
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto"
          >
            Join thousands of traders earning consistent returns with our
            AI-powered trading platform. Start with as little as $100 and
            watch your portfolio grow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center group"
            >
              Start Trading Today
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/signin"
              className="border border-gray-600 text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-800 hover:text-white transition-all"
            >
              Sign In to Dashboard
            </Link>
          </motion.div>
        </div>
      </div>



      {/* Features Section */}
      <div className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose BCP?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Our platform combines cutting-edge technology with proven
              trading strategies
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-20 bg-gradient-to-r from-orange-500/10 to-orange-600/10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Start Your Trading Journey?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of successful traders and start building your
              wealth today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all"
              >
                Create Free Account
              </Link>
              <Link
                href="/auth/signin"
                className="border border-orange-500 text-orange-400 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-500 hover:text-white transition-all"
              >
                Access Dashboard
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <span className="text-xl font-bold text-white">BCP</span>
          </div>
          <p className="text-gray-400 mb-4">
            Empowering traders worldwide with smart, secure, and profitable
            trading solutions.
          </p>
          <p className="text-gray-500 text-sm">
            © 2024 BCP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
