import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { LOCAL_PATHS, readJsonFile } from '@/lib/localData';
import type { InventoryDTO } from '@/lib/stores/inventoryStore';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const items = await readJsonFile<InventoryDTO[]>(LOCAL_PATHS.inventoryCache, []);
    return NextResponse.json(items);
}

