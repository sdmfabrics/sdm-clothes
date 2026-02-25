import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const path = req.nextUrl.pathname;
        const role = token?.role as 'owner' | 'cashier_pos' | 'cashier_inventory' | undefined;

        if (!role) return NextResponse.next();

        // Root: redirect by role
        if (path === '/') {
            if (role === 'owner') return NextResponse.redirect(new URL('/dashboard', req.url));
            return NextResponse.redirect(new URL('/pos', req.url));
        }

        // Dashboard: owner only
        if (path.startsWith('/dashboard')) {
            if (role !== 'owner') return NextResponse.redirect(new URL('/pos', req.url));
            return NextResponse.next();
        }
        // Users: owner only
        if (path.startsWith('/users')) {
            if (role !== 'owner') return NextResponse.redirect(new URL('/pos', req.url));
            return NextResponse.next();
        }
        // Inventory: owner + cashier_inventory
        if (path.startsWith('/inventory')) {
            if (role === 'cashier_pos') return NextResponse.redirect(new URL('/pos', req.url));
            return NextResponse.next();
        }
        // Alerts: owner only
        if (path.startsWith('/alerts')) {
            if (role !== 'owner') return NextResponse.redirect(new URL('/pos', req.url));
            return NextResponse.next();
        }
        // Sales: owner only (sales history)
        if (path.startsWith('/sales')) {
            if (role !== 'owner') return NextResponse.redirect(new URL('/pos', req.url));
            return NextResponse.next();
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        '/',
        '/dashboard/:path*',
        '/inventory/:path*',
        '/alerts/:path*',
        '/users/:path*',
        '/sales/:path*',
        '/pos/:path*',
        '/receipt/:path*',
    ],
};
