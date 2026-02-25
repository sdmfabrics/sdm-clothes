import crypto from 'crypto';
import Inventory from '@/models/Inventory';
import { connectDB } from '@/lib/db';
import { LOCAL_PATHS, readJsonFile, writeJsonFile } from '@/lib/localData';

export type InventoryDTO = {
  _id: string;
  fabricType: string;
  colour: string;
  price: number;
  stockQty: number;
  lowStockAlert: number;
  createdAt?: string;
  updatedAt?: string;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function keyOf(fabricType: string, colour: string) {
  return `${norm(fabricType)}__${norm(colour)}`;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Plain object shape for a single inventory record (from .lean() or .toObject()) */
type InventoryPlain = {
  _id: unknown;
  fabricType: string;
  colour: string;
  price: number;
  stockQty: number;
  lowStockAlert: number;
  createdAt?: Date;
  updatedAt?: Date;
};

async function findExistingCaseInsensitive(fabricType: string, colour: string): Promise<InventoryPlain | null> {
  const ft = fabricType.trim();
  const c = colour.trim();
  const doc = await Inventory.findOne({
    fabricType: { $regex: `^${escapeRegex(ft)}$`, $options: 'i' },
    colour: { $regex: `^${escapeRegex(c)}$`, $options: 'i' },
  }).lean();
  return doc as InventoryPlain | null;
}

export async function getInventoryList(): Promise<{ items: InventoryDTO[]; mode: 'online' | 'offline' }> {
  try {
    await connectDB();
    const items = await Inventory.find({}).sort({ fabricType: 1, colour: 1 }).lean();
    const dtoFromDb: InventoryDTO[] = items.map((x: any) => ({
      _id: String(x._id),
      fabricType: x.fabricType,
      colour: x.colour,
      price: x.price,
      stockQty: x.stockQty,
      lowStockAlert: x.lowStockAlert,
      createdAt: x.createdAt ? new Date(x.createdAt).toISOString() : undefined,
      updatedAt: x.updatedAt ? new Date(x.updatedAt).toISOString() : undefined,
    }));
    // Merge in any pending local-only items (ids starting with local_)
    const cached = await readJsonFile<InventoryDTO[]>(LOCAL_PATHS.inventoryCache, []);
    const pendingLocals = cached.filter((x) => x._id.startsWith('local_'));
    const merged: InventoryDTO[] = [...dtoFromDb];
    for (const local of pendingLocals) {
      const exists = merged.some(
        (x) => keyOf(x.fabricType, x.colour) === keyOf(local.fabricType, local.colour),
      );
      if (!exists) merged.push(local);
    }
    merged.sort((a, b) =>
      `${a.fabricType} ${a.colour}`.localeCompare(`${b.fabricType} ${b.colour}`),
    );
    await writeJsonFile(LOCAL_PATHS.inventoryCache, merged);
    return { items: merged, mode: 'online' };
  } catch {
    const cached = await readJsonFile<InventoryDTO[]>(LOCAL_PATHS.inventoryCache, []);
    return { items: cached, mode: 'offline' };
  }
}

export async function createInventoryItem(input: {
  fabricType: string;
  colour: string;
  price: number;
  stockQty: number;
  lowStockAlert: number;
}): Promise<{ item: InventoryDTO; mode: 'online' | 'offline' }> {
  const fabricType = input.fabricType.trim();
  const colour = input.colour.trim();
  const nowIso = new Date().toISOString();

  try {
    await connectDB();
    const item = await Inventory.create({
      fabricType,
      colour,
      price: Number(input.price),
      stockQty: Number(input.stockQty ?? 0),
      lowStockAlert: Number(input.lowStockAlert ?? 3),
    });

    const dto: InventoryDTO = {
      _id: String(item._id),
      fabricType: item.fabricType,
      colour: item.colour,
      price: item.price,
      stockQty: item.stockQty,
      lowStockAlert: item.lowStockAlert,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const { items } = await getInventoryList();
    // getInventoryList already writes cache, but keep response item from DB
    void items;
    return { item: dto, mode: 'online' };
  } catch (err: any) {
    const cached = await readJsonFile<InventoryDTO[]>(LOCAL_PATHS.inventoryCache, []);
    const k = keyOf(fabricType, colour);
    const exists = cached.some((x) => keyOf(x.fabricType, x.colour) === k);
    if (exists) {
      const e = new Error(`"${fabricType} ${colour}" already exists in inventory.`);
      (e as any).status = 409;
      throw e;
    }
    const localItem: InventoryDTO = {
      _id: `local_${crypto.randomUUID()}`,
      fabricType,
      colour,
      price: Number(input.price),
      stockQty: Number(input.stockQty ?? 0),
      lowStockAlert: Number(input.lowStockAlert ?? 3),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    cached.push(localItem);
    cached.sort((a, b) => `${a.fabricType} ${a.colour}`.localeCompare(`${b.fabricType} ${b.colour}`));
    await writeJsonFile(LOCAL_PATHS.inventoryCache, cached);
    return { item: localItem, mode: 'offline' };
  }
}

export async function updateInventoryItem(
  id: string,
  patch: { price?: number; lowStockAlert?: number; addStock?: number }
): Promise<{ item: InventoryDTO; mode: 'online' | 'offline' }> {
  const nowIso = new Date().toISOString();
  try {
    await connectDB();
    const $set: any = {};
    const $inc: any = {};
    if (patch.price !== undefined) $set.price = Number(patch.price);
    if (patch.lowStockAlert !== undefined) $set.lowStockAlert = Number(patch.lowStockAlert);
    if (patch.addStock !== undefined) $inc.stockQty = Number(patch.addStock);

    const updateOp: any = {};
    if (Object.keys($set).length) updateOp.$set = $set;
    if (Object.keys($inc).length) updateOp.$inc = $inc;

    const updated = await Inventory.findByIdAndUpdate(id, updateOp, { new: true, runValidators: true }).lean();
    if (!updated) {
      const e = new Error('Item not found');
      (e as any).status = 404;
      throw e;
    }

    const dto: InventoryDTO = {
      _id: String(updated._id),
      fabricType: updated.fabricType,
      colour: updated.colour,
      price: updated.price,
      stockQty: updated.stockQty,
      lowStockAlert: updated.lowStockAlert,
      createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    // refresh cache from DB (single source of truth)
    await getInventoryList();
    return { item: dto, mode: 'online' };
  } catch {
    const cached = await readJsonFile<InventoryDTO[]>(LOCAL_PATHS.inventoryCache, []);
    const idx = cached.findIndex((x) => x._id === id);
    if (idx === -1) {
      const e = new Error('Item not found');
      (e as any).status = 404;
      throw e;
    }
    const cur = cached[idx];
    const next: InventoryDTO = {
      ...cur,
      price: patch.price !== undefined ? Number(patch.price) : cur.price,
      lowStockAlert: patch.lowStockAlert !== undefined ? Number(patch.lowStockAlert) : cur.lowStockAlert,
      stockQty: patch.addStock !== undefined ? cur.stockQty + Number(patch.addStock) : cur.stockQty,
      updatedAt: nowIso,
    };
    cached[idx] = next;
    await writeJsonFile(LOCAL_PATHS.inventoryCache, cached);
    return { item: next, mode: 'offline' };
  }
}

export async function deleteInventoryItem(id: string): Promise<{ mode: 'online' | 'offline' }> {
  try {
    await connectDB();
    const deleted = await Inventory.findByIdAndDelete(id).lean();
    if (!deleted) {
      const e = new Error('Item not found');
      (e as any).status = 404;
      throw e;
    }
    await getInventoryList();
    return { mode: 'online' };
  } catch {
    const cached = await readJsonFile<InventoryDTO[]>(LOCAL_PATHS.inventoryCache, []);
    const next = cached.filter((x) => x._id !== id);
    if (next.length === cached.length) {
      const e = new Error('Item not found');
      (e as any).status = 404;
      throw e;
    }
    await writeJsonFile(LOCAL_PATHS.inventoryCache, next);
    return { mode: 'offline' };
  }
}

export async function decrementStockFromCache(items: Array<{ fabricType: string; colour: string; qty: number }>) {
  const cached = await readJsonFile<InventoryDTO[]>(LOCAL_PATHS.inventoryCache, []);
  const byKey = new Map(cached.map((x) => [keyOf(x.fabricType, x.colour), x]));

  for (const it of items) {
    const found = byKey.get(keyOf(it.fabricType, it.colour));
    if (!found) {
      const e = new Error(`Item not found: ${it.fabricType} ${it.colour}`);
      (e as any).status = 404;
      throw e;
    }
    if (found.stockQty < it.qty) {
      const e = new Error(`Not enough stock for ${it.fabricType} ${it.colour}. Available: ${found.stockQty}`);
      (e as any).status = 400;
      throw e;
    }
  }

  const nowIso = new Date().toISOString();
  const next = cached.map((x) => {
    const match = items.find((it) => keyOf(it.fabricType, it.colour) === keyOf(x.fabricType, x.colour));
    if (!match) return x;
    return { ...x, stockQty: x.stockQty - match.qty, updatedAt: nowIso };
  });

  await writeJsonFile(LOCAL_PATHS.inventoryCache, next);
}

export async function syncLocalInventory(): Promise<{ syncedCount: number; mode: 'online' | 'offline' }> {
  try {
    await connectDB();
  } catch {
    return { syncedCount: 0, mode: 'offline' };
  }

  const cached = await readJsonFile<InventoryDTO[]>(LOCAL_PATHS.inventoryCache, []);
  const remaining: InventoryDTO[] = [];
  let syncedCount = 0;

  for (const item of cached) {
    if (!item._id.startsWith('local_')) {
      remaining.push(item);
      continue;
    }

    try {
      // Avoid duplicates by fabric+colour
      let dbItem: InventoryPlain | null = await findExistingCaseInsensitive(item.fabricType, item.colour);

      if (!dbItem) {
        try {
          const created = await Inventory.create({
            fabricType: item.fabricType.trim(),
            colour: item.colour.trim(),
            price: item.price,
            stockQty: item.stockQty,
            lowStockAlert: item.lowStockAlert,
          });
          dbItem = created.toObject() as InventoryPlain;
        } catch (e: any) {
          // If another record already exists (often due to casing), treat as synced by linking it.
          if (e?.code === 11000) {
            dbItem = await findExistingCaseInsensitive(item.fabricType, item.colour);
          } else {
            throw e;
          }
        }
      }

      if (!dbItem) throw new Error('Sync failed to locate or create inventory item');

      const dto: InventoryDTO = {
        _id: String(dbItem._id),
        fabricType: dbItem.fabricType,
        colour: dbItem.colour,
        price: dbItem.price,
        stockQty: dbItem.stockQty,
        lowStockAlert: dbItem.lowStockAlert,
        createdAt: dbItem.createdAt ? new Date(dbItem.createdAt).toISOString() : item.createdAt,
        updatedAt: dbItem.updatedAt ? new Date(dbItem.updatedAt).toISOString() : item.updatedAt,
      };

      remaining.push(dto);
      syncedCount += 1;
    } catch {
      // Keep local item; try again next sync
      remaining.push(item);
    }
  }

  remaining.sort((a, b) => `${a.fabricType} ${a.colour}`.localeCompare(`${b.fabricType} ${b.colour}`));
  await writeJsonFile(LOCAL_PATHS.inventoryCache, remaining);

  return { syncedCount, mode: 'online' };
}


