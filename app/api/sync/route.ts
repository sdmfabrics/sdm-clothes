import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { syncPendingSales } from '@/lib/stores/salesStore';
import { getInventoryList, syncLocalInventory } from '@/lib/stores/inventoryStore';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const salesSync = await syncPendingSales();
  const invSync = await syncLocalInventory();
  // Also refresh inventory cache (best-effort)
  try {
    await getInventoryList();
  } catch {
    // ignore
  }
  return NextResponse.json({
    salesSynced: salesSync.syncedCount,
    inventorySynced: invSync.syncedCount,
    mode: salesSync.mode === 'online' && invSync.mode === 'online' ? 'online' : 'offline',
  });
}

