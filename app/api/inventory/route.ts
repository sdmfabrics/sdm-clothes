import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createInventoryItem, getInventoryList } from '@/lib/stores/inventoryStore';

// GET /api/inventory — list all (any authenticated role)
export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { items } = await getInventoryList();
    return NextResponse.json(items);
}

// POST /api/inventory — add new item (owner + cashier_inventory only)
export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = token.role as string;
    if (role !== 'owner' && role !== 'cashier_inventory') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const { fabricType, colour, price, stockQty, lowStockAlert } = body;

        if (!fabricType || !colour || price == null) {
            return NextResponse.json({ error: 'fabricType, colour, and price are required.' }, { status: 400 });
        }

        const { item } = await createInventoryItem({
            fabricType,
            colour,
            price: Number(price),
            stockQty: Number(stockQty ?? 0),
            lowStockAlert: Number(lowStockAlert ?? 3),
        });

        return NextResponse.json(item, { status: 201 });
    } catch (err: any) {
        const status = err?.status ?? (err?.code === 11000 ? 409 : 500);
        return NextResponse.json({ error: err.message }, { status });
    }
}
