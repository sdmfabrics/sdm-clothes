import { promises as fs } from 'fs';
import path from 'path';

/**
 * On Vercel the filesystem is read-only except for /tmp.
 * We detect the Vercel environment and redirect local-data writes there.
 * In local dev (or any other host) we keep the project-relative `local-data/`
 * folder so the files survive restarts.
 */
const LOCAL_DATA_DIR = process.env.VERCEL
  ? '/tmp/local-data'
  : path.join(process.cwd(), 'local-data');

export const LOCAL_PATHS = {
  inventoryCache: path.join(LOCAL_DATA_DIR, 'inventory_cache.json'),
  pendingSales: path.join(LOCAL_DATA_DIR, 'pending_sales.json'),
  restockHistory: path.join(LOCAL_DATA_DIR, 'restock_history.json'),
};

async function ensureLocalDir() {
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
}

export async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    await ensureLocalDir();
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await ensureLocalDir();
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpPath, filePath);
  } catch {
    // On read-only filesystems (edge cases), silently skip the write.
    // The DB is the source of truth; the local file is only a cache.
  }
}
