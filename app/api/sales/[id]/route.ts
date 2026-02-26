import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSaleByAnyId } from '@/lib/stores/salesStore';

// GET /api/sales/[id] — fetch single sale by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { sale } = await getSaleByAnyId(id);
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    return NextResponse.json(sale);
}
