import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { deleteInventoryItem, updateInventoryItem } from '@/lib/stores/inventoryStore';
import { LOCAL_PATHS, readJsonFile, writeJsonFile } from '@/lib/localData';

// PATCH /api/inventory/[id] — edit price / lowStockAlert / restock (owner + cashier_inventory only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = token.role as string;
    if (role !== 'owner' && role !== 'cashier_inventory') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    try {
        const body = await req.json();
        const { price, lowStockAlert, addStock } = body;
        const { item } = await updateInventoryItem(id, {
            price: price !== undefined ? Number(price) : undefined,
            lowStockAlert: lowStockAlert !== undefined ? Number(lowStockAlert) : undefined,
            addStock: addStock !== undefined ? Number(addStock) : undefined,
        });

        // Save restock history (local file, works offline too)
        if (addStock !== undefined && Number(addStock) > 0) {
            const history = await readJsonFile<any[]>(LOCAL_PATHS.restockHistory, []);
            history.unshift({
                id: `restock_${Date.now()}`,
                inventoryId: item._id,
                fabricType: item.fabricType,
                colour: item.colour,
                qtyAdded: Number(addStock),
                date: new Date().toISOString(),
            });
            await writeJsonFile(LOCAL_PATHS.restockHistory, history);
        }

        return NextResponse.json(item);
    } catch (err: any) {
        const status = err?.status ?? 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}

// DELETE /api/inventory/[id] — owner only
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (token.role !== 'owner') {
        return NextResponse.json({ error: 'Forbidden. Only owner can delete products.' }, { status: 403 });
    }
    try {
        await deleteInventoryItem(id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const status = err?.status ?? 500;
        return NextResponse.json({ error: err.message }, { status });
    }
}
