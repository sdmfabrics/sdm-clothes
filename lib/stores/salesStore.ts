import crypto from 'crypto';
import Sale from '@/models/Sale';
import Inventory from '@/models/Inventory';
import { connectDB } from '@/lib/db';
import { LOCAL_PATHS, readJsonFile, writeJsonFile } from '@/lib/localData';
import { decrementStockFromCache, getInventoryList } from '@/lib/stores/inventoryStore';

export type SaleItemDTO = {
  fabricType: string;
  colour: string;
  price: number;
  qty: number;
  subtotal: number;
};

export type SaleDTO = {
  _id: string;
  saleId?: string;
  date: string;
  items: SaleItemDTO[];
  totalAmount: number;
  synced: boolean;
  paymentMethod: 'cash' | 'card';
};

function isMongoObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

export async function getPendingSales(): Promise<SaleDTO[]> {
  return await readJsonFile<SaleDTO[]>(LOCAL_PATHS.pendingSales, []);
}

export async function syncPendingSales(): Promise<{ syncedCount: number; mode: 'online' | 'offline' }> {
  try {
    await connectDB();
  } catch {
    return { syncedCount: 0, mode: 'offline' };
  }

  const pending = await getPendingSales();
  if (pending.length === 0) return { syncedCount: 0, mode: 'online' };

  let syncedCount = 0;
  const remaining: SaleDTO[] = [];

  for (const sale of pending) {
    try {
      const exists = await Sale.findOne({ saleId: sale._id }).lean();
      if (exists) {
        syncedCount += 1;
        continue;
      }

      // Reduce DB stock (idempotent per saleId)
      for (const item of sale.items) {
        const updated = await Inventory.findOneAndUpdate(
          { fabricType: item.fabricType, colour: item.colour, stockQty: { $gte: item.qty } },
          { $inc: { stockQty: -item.qty } },
          { new: true }
        );
        if (!updated) {
          throw new Error(`Sync failed: not enough stock for ${item.fabricType} ${item.colour}`);
        }
      }

      await Sale.create({
        saleId: sale._id,
        date: new Date(sale.date),
        items: sale.items,
        totalAmount: sale.totalAmount,
        synced: true,
        paymentMethod: sale.paymentMethod || 'cash',
      });

      syncedCount += 1;
    } catch {
      remaining.push(sale);
    }
  }

  await writeJsonFile(LOCAL_PATHS.pendingSales, remaining);

  // Refresh inventory cache from DB after successful sync attempts
  try {
    await getInventoryList();
  } catch {
    // ignore
  }

  return { syncedCount, mode: 'online' };
}

export async function getSalesList(): Promise<{ sales: SaleDTO[]; mode: 'online' | 'offline' }> {
  try {
    await connectDB();
    await syncPendingSales();
    const sales = await Sale.find({}).sort({ date: -1 }).lean();
    const dto: SaleDTO[] = sales.map((s: any) => ({
      _id: String(s._id),
      saleId: s.saleId,
      date: new Date(s.date).toISOString(),
      items: s.items,
      totalAmount: s.totalAmount,
      synced: s.synced ?? true,
      paymentMethod: (s.paymentMethod as 'cash' | 'card') || 'cash',
    }));

    // If there are still unsynced local sales (sync failures), include them too
    const pending = await getPendingSales();
    const merged = [...pending, ...dto].sort((a, b) => b.date.localeCompare(a.date));
    return { sales: merged, mode: 'online' };
  } catch {
    const pending = await getPendingSales();
    return { sales: pending.sort((a, b) => b.date.localeCompare(a.date)), mode: 'offline' };
  }
}

export async function getSaleByAnyId(id: string): Promise<{ sale: SaleDTO | null; mode: 'online' | 'offline' }> {
  try {
    await connectDB();
    await syncPendingSales();

    const bySaleId = await Sale.findOne({ saleId: id }).lean();
    const doc = bySaleId || (isMongoObjectId(id) ? await Sale.findById(id).lean() : null);
    if (!doc) return { sale: null, mode: 'online' };

    const dto: SaleDTO = {
      _id: String(doc._id),
      saleId: doc.saleId,
      date: new Date(doc.date).toISOString(),
      items: doc.items,
      totalAmount: doc.totalAmount,
      synced: doc.synced ?? true,
      paymentMethod: (doc as any).paymentMethod || 'cash',
    };
    return { sale: dto, mode: 'online' };
  } catch {
    const pending = await getPendingSales();
    const found = pending.find((s) => s._id === id);
    return { sale: found ?? null, mode: 'offline' };
  }
}

export async function createSale(input: {
  items: Array<{ fabricType: string; colour: string; price: number; qty: number }>;
  paymentMethod?: 'cash' | 'card';
}): Promise<{ sale: SaleDTO; mode: 'online' | 'offline' }> {
  const paymentMethod: 'cash' | 'card' = input.paymentMethod === 'card' ? 'card' : 'cash';
  if (!input.items || input.items.length === 0) {
    const e = new Error('Cart is empty.');
    (e as any).status = 400;
    throw e;
  }

  const saleItems: SaleItemDTO[] = input.items.map((i) => ({
    fabricType: String(i.fabricType).trim(),
    colour: String(i.colour).trim(),
    price: Number(i.price),
    qty: Number(i.qty),
    subtotal: Number(i.qty) * Number(i.price),
  }));
  const totalAmount = saleItems.reduce((sum, i) => sum + i.subtotal, 0);

  // Try online first
  try {
    await connectDB();
    await syncPendingSales();

    // Stock check (DB)
    for (const item of saleItems) {
      const inv = await Inventory.findOne({ fabricType: item.fabricType, colour: item.colour }).lean();
      if (!inv) {
        const e = new Error(`Item not found: ${item.fabricType} ${item.colour}`);
        (e as any).status = 404;
        throw e;
      }
      if (inv.stockQty < item.qty) {
        const e = new Error(`Not enough stock for ${item.fabricType} ${item.colour}. Available: ${inv.stockQty}`);
        (e as any).status = 400;
        throw e;
      }
    }

    for (const item of saleItems) {
      await Inventory.findOneAndUpdate(
        { fabricType: item.fabricType, colour: item.colour },
        { $inc: { stockQty: -item.qty } }
      );
    }

    const saleId = crypto.randomUUID();
    const saleDoc = await Sale.create({
      saleId,
      date: new Date(),
      items: saleItems,
      totalAmount,
      synced: true,
      paymentMethod,
    });

    // refresh cache
    void getInventoryList();

    const sale: SaleDTO = {
      _id: String(saleDoc._id),
      saleId,
      date: saleDoc.date.toISOString(),
      items: saleItems,
      totalAmount,
      synced: true,
      paymentMethod,
    };
    return { sale, mode: 'online' };
  } catch {
    // Offline: use local inventory cache + pending file
    await decrementStockFromCache(saleItems.map((i) => ({ fabricType: i.fabricType, colour: i.colour, qty: i.qty })));
    const saleId = crypto.randomUUID();

    const pending = await getPendingSales();
    const localSale: SaleDTO = {
      _id: saleId, // used as receipt URL id while offline
      saleId,
      date: new Date().toISOString(),
      items: saleItems,
      totalAmount,
      synced: false,
      paymentMethod,
    };
    pending.unshift(localSale);
    await writeJsonFile(LOCAL_PATHS.pendingSales, pending);

    return { sale: localSale, mode: 'offline' };
  }
}

