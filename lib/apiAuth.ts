import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export type Role = 'owner' | 'cashier_pos' | 'cashier_inventory';

export async function getSessionRole(req: NextRequest): Promise<Role | null> {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    return (token?.role as Role) || null;
}

export function requireAuth(role: Role | null, allowed: Role[]): boolean {
    if (!role) return false;
    return allowed.includes(role);
}

export function unauthorizedResponse() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
