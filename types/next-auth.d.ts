import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      firstName: string;
      lastName: string;
      phone: string;
      emailVerified: boolean;
      referralCode: string;
      isActive: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    firstName: string;
    lastName: string;
    phone: string;
    emailVerified: boolean;
    referralCode: string;
    isActive: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    firstName: string;
    lastName: string;
    phone: string;
    emailVerified: boolean;
    referralCode: string;
    isActive: boolean;
  }
}
