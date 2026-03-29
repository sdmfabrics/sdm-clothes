import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSaleByAnyId, updateSale, deleteSale } from '@/lib/stores/salesStore';

// GET /api/sales/[id] — fetch single sale by ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { sale } = await getSaleByAnyId(id);
    if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    return NextResponse.json(sale);
}

// PUT /api/sales/[id] — update a sale's items (recalculates total, adjusts inventory)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const body = await req.json();
        const { items } = body;
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Items array is required and must not be empty.' }, { status: 400 });
        }
        const { sale } = await updateSale(id, items);
        return NextResponse.json(sale);
    } catch (err: any) {
        const status = err?.status ?? 500;
        return NextResponse.json({ error: err.message ?? 'Failed to update sale.' }, { status });
    }
}

// DELETE /api/sales/[id] — delete a sale and restore inventory stock
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await deleteSale(id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const status = err?.status ?? 500;
        return NextResponse.json({ error: err.message ?? 'Failed to delete sale.' }, { status });
    }
}
