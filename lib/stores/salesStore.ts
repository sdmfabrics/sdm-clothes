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
  discount: number;
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
      items: s.items.map((i: any) => ({ ...i, discount: i.discount ?? 0 })),
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
      items: doc.items.map((i: any) => ({ ...i, discount: i.discount ?? 0 })),
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
  items: Array<{ fabricType: string; colour: string; price: number; qty: number; discount?: number }>;
  paymentMethod?: 'cash' | 'card';
}): Promise<{ sale: SaleDTO; mode: 'online' | 'offline' }> {
  const paymentMethod: 'cash' | 'card' = input.paymentMethod === 'card' ? 'card' : 'cash';
  if (!input.items || input.items.length === 0) {
    const e = new Error('Cart is empty.');
    (e as any).status = 400;
    throw e;
  }

  const saleItems: SaleItemDTO[] = input.items.map((i) => {
    const itemDiscount = Math.max(0, Number(i.discount ?? 0));
    const subtotal = Math.max(0, Number(i.qty) * Number(i.price) - itemDiscount);
    return {
      fabricType: String(i.fabricType).trim(),
      colour: String(i.colour).trim(),
      price: Number(i.price),
      qty: Number(i.qty),
      discount: itemDiscount,
      subtotal,
    };
  });
  const totalAmount = saleItems.reduce((sum, i) => sum + i.subtotal, 0);

  // Online-only: require DB connection; no offline pending sales
  await connectDB();
  await syncPendingSales();

  // Stock check (DB)
  for (const item of saleItems) {
    const inv = (await Inventory.findOne({ fabricType: item.fabricType, colour: item.colour }).lean()) as any;
    if (!inv) {
      const e = new Error(`Item not found: ${item.fabricType} ${item.colour}`);
      (e as any).status = 404;
      throw e;
    }
    if ((inv.stockQty as number) < item.qty) {
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
}

export async function updateSale(
  id: string,
  newItems: Array<{ fabricType: string; colour: string; price: number; qty: number }>
): Promise<{ sale: SaleDTO; mode: 'online' | 'offline' }> {
  if (!newItems || newItems.length === 0) {
    const e = new Error('Sale must have at least one item.');
    (e as any).status = 400;
    throw e;
  }
  await connectDB();
  const existingDoc = await Sale.findById(id).lean() as any;
  if (!existingDoc) {
    const e = new Error('Sale not found');
    (e as any).status = 404;
    throw e;
  }
  const oldItems: SaleItemDTO[] = existingDoc.items;
  const newSaleItems: SaleItemDTO[] = newItems.map((i) => {
    const itemDiscount = Math.max(0, Number((i as any).discount ?? 0));
    const subtotal = Math.max(0, Number(i.qty) * Number(i.price) - itemDiscount);
    return {
      fabricType: String(i.fabricType).trim(),
      colour: String(i.colour).trim(),
      price: Number(i.price),
      qty: Number(i.qty),
      discount: itemDiscount,
      subtotal,
    };
  });

  const getKey = (f: string, c: string) => `${f.trim().toLowerCase()}__${c.trim().toLowerCase()}`;

  // Build diff: positive delta = consume more stock, negative = restore stock
  const diff = new Map<string, { fabricType: string; colour: string; delta: number }>();
  for (const item of oldItems) {
    const k = getKey(item.fabricType, item.colour);
    const cur = diff.get(k) ?? { fabricType: item.fabricType, colour: item.colour, delta: 0 };
    cur.delta -= item.qty; // old items restore stock
    diff.set(k, cur);
  }
  for (const item of newSaleItems) {
    const k = getKey(item.fabricType, item.colour);
    const cur = diff.get(k) ?? { fabricType: item.fabricType, colour: item.colour, delta: 0 };
    cur.delta += item.qty; // new items consume stock
    diff.set(k, cur);
  }

  // Validate stock where more is being consumed
  for (const { fabricType, colour, delta } of diff.values()) {
    if (delta > 0) {
      const inv = await Inventory.findOne({ fabricType, colour }).lean() as any;
      if (!inv) {
        const e = new Error(`Item not found in inventory: ${fabricType} ${colour}`);
        (e as any).status = 404;
        throw e;
      }
      if ((inv.stockQty as number) < delta) {
        const e = new Error(`Not enough stock for ${fabricType} ${colour}. Available: ${inv.stockQty}`);
        (e as any).status = 400;
        throw e;
      }
    }
  }

  // Apply stock adjustments
  for (const { fabricType, colour, delta } of diff.values()) {
    if (delta !== 0) {
      await Inventory.findOneAndUpdate(
        { fabricType, colour },
        { $inc: { stockQty: -delta } }
      );
    }
  }

  const newTotal = newSaleItems.reduce((sum, i) => sum + i.subtotal, 0);
  const updated = await Sale.findByIdAndUpdate(
    id,
    { $set: { items: newSaleItems, totalAmount: newTotal } },
    { new: true, runValidators: true }
  ).lean() as any;

  if (!updated) {
    const e = new Error('Sale not found after update');
    (e as any).status = 404;
    throw e;
  }

  void getInventoryList();

  const sale: SaleDTO = {
    _id: String(updated._id),
    saleId: updated.saleId,
    date: new Date(updated.date).toISOString(),
    items: updated.items.map((i: any) => ({ ...i, discount: i.discount ?? 0 })),
    totalAmount: updated.totalAmount,
    synced: updated.synced ?? true,
    paymentMethod: (updated as any).paymentMethod || 'cash',
  };
  return { sale, mode: 'online' };
}

export async function deleteSale(id: string): Promise<{ mode: 'online' | 'offline' }> {
  await connectDB();
  const existingDoc = await Sale.findById(id).lean() as any;
  if (!existingDoc) {
    const e = new Error('Sale not found');
    (e as any).status = 404;
    throw e;
  }
  // Restore stock for all items in the deleted sale
  for (const item of existingDoc.items as SaleItemDTO[]) {
    await Inventory.findOneAndUpdate(
      { fabricType: item.fabricType, colour: item.colour },
      { $inc: { stockQty: item.qty } }
    );
  }
  await Sale.findByIdAndDelete(id);
  void getInventoryList();
  return { mode: 'online' };
}
