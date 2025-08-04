"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import DeactivationBanner from "../../components/DeactivationBanner";
import DeactivationOverlay from "../../components/DeactivationOverlay";


import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  ArrowDownRight,
  History,
  User,
  Share2,
  LogOut,
  Menu,
  X,
  Mail,
  MessageSquare,
  Activity,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Investments", href: "/dashboard/investments", icon: TrendingUp },
  { name: "Live Trade", href: "/dashboard/live-trade", icon: Activity },
  { name: "Deposit", href: "/dashboard/deposit", icon: CreditCard },
  { name: "Withdraw", href: "/dashboard/withdraw", icon: ArrowDownRight },
  { name: "Transactions", href: "/dashboard/transactions", icon: History },
  { name: "Newsletters", href: "/dashboard/newsletters", icon: Mail },
  { name: "Referrals", href: "/dashboard/referrals", icon: Share2 },
  { name: "Support", href: "/dashboard/support", icon: MessageSquare },
  { name: "Profile", href: "/dashboard/profile", icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check if user is deactivated and not on support page
  const isUserDeactivated = session?.user && !session.user.isActive;
  const isOnSupportPage = pathname === "/dashboard/support";
  const shouldShowOverlay = isUserDeactivated && !isOnSupportPage;


  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    if (session.user.role === "admin") {
      router.push("/admin/dashboard");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user || session.user.role === "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">CredCrypto</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive
                        ? "text-blue-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session.user.firstName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.firstName} {session.user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">Investor</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">CredCrypto</h1>
            <div className="w-10"></div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">


          {/* Show deactivation banner for deactivated users */}
          {session?.user && !session.user.isActive && (
            <div className="p-6 pb-0">
              <DeactivationBanner userEmail={session.user.email} />
            </div>
          )}
          <div className={shouldShowOverlay ? "blur-sm pointer-events-none" : ""}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Deactivation overlay for restricted access */}
      {shouldShowOverlay && (
        <DeactivationOverlay userEmail={session.user.email} />
      )}
    </div>
  );
}
