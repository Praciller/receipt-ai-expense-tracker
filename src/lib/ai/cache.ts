import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ParseCache, ParsedReceiptResult } from './router';

interface CacheEntry {
  expiresAt: number;
  value: ParsedReceiptResult;
}

const globalCaches = globalThis as typeof globalThis & {
  receiptFileCaches?: Map<string, FileParseCache>;
};
const cacheInstances =
  globalCaches.receiptFileCaches ??
  (globalCaches.receiptFileCaches = new Map<string, FileParseCache>());

export class FileParseCache implements ParseCache {
  private readonly memory = new Map<string, CacheEntry>();
  private readonly directory: string;

  constructor(directory: string) {
    this.directory = path.resolve(directory);
  }

  async get(key: string) {
    const memoryEntry = this.memory.get(key);
    if (memoryEntry) {
      if (memoryEntry.expiresAt > Date.now()) {
        return memoryEntry.value;
      }
      this.memory.delete(key);
    }

    const filePath = this.filePath(key);
    try {
      const entry = JSON.parse(await readFile(filePath, 'utf8')) as CacheEntry;
      if (entry.expiresAt <= Date.now()) {
        await unlink(filePath).catch(() => undefined);
        return null;
      }

      this.memory.set(key, entry);
      return entry.value;
    } catch {
      return null;
    }
  }

  async set(
    key: string,
    value: ParsedReceiptResult,
    ttlSeconds: number,
  ) {
    const entry: CacheEntry = {
      expiresAt: Date.now() + ttlSeconds * 1000,
      value: { ...value, cached: false },
    };
    this.memory.set(key, entry);
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.filePath(key), JSON.stringify(entry), 'utf8');
  }

  private filePath(key: string) {
    return path.join(this.directory, `${key}.json`);
  }
}

export function getFileParseCache(directory: string) {
  const resolved = path.resolve(directory);
  const existing = cacheInstances.get(resolved);
  if (existing) {
    return existing;
  }

  const cache = new FileParseCache(resolved);
  cacheInstances.set(resolved, cache);
  return cache;
}
