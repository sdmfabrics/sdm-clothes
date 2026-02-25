import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createSale, getSalesList } from '@/lib/stores/salesStore';

// GET /api/sales — list all sales (sorted newest first)
export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { sales } = await getSalesList();
    return NextResponse.json(sales);
}

// POST /api/sales — complete a sale (save + reduce stock atomically)
export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const { items, paymentMethod } = body;
        const { sale } = await createSale({ items, paymentMethod });
        return NextResponse.json(sale, { status: 201 });
    } catch (err: any) {
        const status = err?.status ?? 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
