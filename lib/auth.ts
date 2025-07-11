import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { userQueries } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find user by email
          const user = await userQueries.findByEmail(credentials.email);
          
          if (!user) {
            return null;
          }

          // Check if user is active
          if (!user.is_active) {
            return null;
          }

          // Compare password (plain text as requested)
          if (user.password !== credentials.password) {
            return null;
          }

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            firstName: user.first_name,
            lastName: user.last_name,
            phone: user.phone,
            emailVerified: user.email_verified,
            referralCode: user.referral_code,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.phone = user.phone;
        token.emailVerified = Boolean(user.emailVerified);
        token.referralCode = user.referralCode;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.phone = token.phone as string;
        session.user.emailVerified = token.emailVerified as boolean;
        session.user.referralCode = token.referralCode as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Utility functions for authentication
export const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Role-based access control
export const hasRole = (userRole: string, requiredRole: string): boolean => {
  const roleHierarchy = {
    admin: 2,
    investor: 1,
  };
  
  return (roleHierarchy[userRole as keyof typeof roleHierarchy] || 0) >= 
         (roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0);
};

// Check if user is admin
export const isAdmin = (userRole: string): boolean => {
  return userRole === 'admin';
};

// Check if user is investor
export const isInvestor = (userRole: string): boolean => {
  return userRole === 'investor';
};

// Middleware for protecting routes
export const requireAuth = (requiredRole?: string) => {
  return (req: any, res: any, next: any) => {
    const session = req.session;
    
    if (!session?.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (requiredRole && !hasRole(session.user.role, requiredRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength (basic validation since we're using plain text)
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

// Validate phone number
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// User registration validation
export const validateRegistration = (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) => {
  const errors: string[] = [];
  
  if (!userData.email || !isValidEmail(userData.email)) {
    errors.push('Valid email is required');
  }
  
  if (!userData.password || !isValidPassword(userData.password)) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (!userData.firstName || userData.firstName.trim().length < 2) {
    errors.push('First name must be at least 2 characters long');
  }
  
  if (!userData.lastName || userData.lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters long');
  }
  
  if (userData.phone && !isValidPhone(userData.phone)) {
    errors.push('Invalid phone number format');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};
