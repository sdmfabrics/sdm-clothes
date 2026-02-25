import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                try {
                    await connectDB();
                    const user = await User.findOne({ email: credentials.email.trim().toLowerCase() }).lean();
                    if (!user || !user.password) return null;
                    const ok = await bcrypt.compare(credentials.password, user.password);
                    if (!ok) return null;
                    return {
                        id: String(user._id),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                    };
                } catch {
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
    ...(process.env.NEXTAUTH_URL && { trustHost: true }),
};

export type Role = 'owner' | 'cashier_pos' | 'cashier_inventory';

export function canAccessDashboard(role: Role): boolean {
    return role === 'owner';
}

export function canAccessInventory(role: Role): boolean {
    return role === 'owner' || role === 'cashier_inventory';
}

export function canAccessAlerts(role: Role): boolean {
    return role === 'owner';
}

export function canAccessUsers(role: Role): boolean {
    return role === 'owner';
}

export function canAccessPOS(role: Role): boolean {
    return true;
}

export function canDeleteProduct(role: Role): boolean {
    return role === 'owner';
}

export function canRestock(role: Role): boolean {
    return role === 'owner' || role === 'cashier_inventory';
}

export function canAddProduct(role: Role): boolean {
    return role === 'owner' || role === 'cashier_inventory';
}
