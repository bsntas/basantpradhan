import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password: string | null; // null for OAuth (Google) users
  name: string;
  purchases: string[];
  createdAt: string;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  purchases: string[];
}

// ── Storage adapters ─────────────────────────────────────────────────────────

const useRedisUrl = () => Boolean(process.env.REDIS_URL);
const useKV = () => !useRedisUrl() && Boolean(process.env.KV_REST_API_URL);

// ioredis client (singleton per serverless instance)
let _redisClient: import('ioredis').Redis | null = null;
function getRedis(): import('ioredis').Redis {
  if (!_redisClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Redis = require('ioredis') as typeof import('ioredis');
    _redisClient = new (Redis as unknown as { new(url: string): import('ioredis').Redis })(process.env.REDIS_URL!);
    _redisClient.on('error', (err: Error) => console.error('[ioredis]', err));
  }
  return _redisClient;
}

async function redisGet<T>(key: string): Promise<T | null> {
  const val = await getRedis().get(key);
  if (!val) return null;
  return JSON.parse(val) as T;
}

async function redisSet(key: string, value: unknown): Promise<void> {
  await getRedis().set(key, JSON.stringify(value));
}

// Vercel KV (REST-based, legacy)
async function kvGet<T>(key: string): Promise<T | null> {
  const { kv } = await import('@vercel/kv');
  const val = await kv.get<string>(key);
  if (val === null || val === undefined) return null;
  return (typeof val === 'string' ? JSON.parse(val) : val) as T;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(key, JSON.stringify(value));
}

// JSON file fallback (local dev only)
function readFile(): { users: User[] } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path');
  const dir = path.join(process.cwd(), 'data');
  const file = path.join(dir, 'users.json');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ users: [] }));
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeFile(db: { users: User[] }): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs') as typeof import('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path') as typeof import('path');
  const file = path.join(process.cwd(), 'data', 'users.json');
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    // Vercel production filesystem is read-only — set REDIS_URL or KV_REST_API_URL
    console.error('[db] writeFile failed (read-only filesystem?). Set REDIS_URL in Vercel env vars.', err);
    throw new Error('Database unavailable: set REDIS_URL in Vercel environment variables');
  }
}

// ── Unified get/set ──────────────────────────────────────────────────────────

async function dbGet<T>(key: string): Promise<T | null> {
  if (useRedisUrl()) return redisGet<T>(key);
  if (useKV()) return kvGet<T>(key);
  return null;
}

async function dbSet(key: string, value: unknown): Promise<void> {
  if (useRedisUrl()) return redisSet(key, value);
  if (useKV()) return kvSet(key, value);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function createUser(
  args: { email: string; name: string; password: string | null },
): Promise<User> {
  const normalEmail = args.email.toLowerCase();
  const hashed = args.password ? await bcrypt.hash(args.password, 10) : null;
  const user: User = {
    id: uuidv4(),
    email: normalEmail,
    password: hashed,
    name: args.name,
    purchases: [],
    createdAt: new Date().toISOString(),
  };

  if (useRedisUrl() || useKV()) {
    await dbSet(`user:${user.id}`, user);
    await dbSet(`email:${normalEmail}`, user.id);
  } else {
    const db = readFile();
    db.users.push(user);
    writeFile(db);
  }

  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalEmail = email.toLowerCase();
  if (useRedisUrl() || useKV()) {
    const userId = await dbGet<string>(`email:${normalEmail}`);
    if (!userId) return null;
    const raw = typeof userId === 'object' ? (userId as unknown as string) : userId;
    return findUserById(raw);
  }
  const db = readFile();
  return db.users.find(u => u.email === normalEmail) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (useRedisUrl() || useKV()) {
    return dbGet<User>(`user:${id}`);
  }
  const db = readFile();
  return db.users.find(u => u.id === id) ?? null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function addPurchase(userId: string, bookId: string): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user) return false;
  if (!user.purchases.includes(bookId)) {
    user.purchases.push(bookId);
    if (useRedisUrl() || useKV()) {
      await dbSet(`user:${userId}`, user);
    } else {
      const db = readFile();
      const u = db.users.find(x => x.id === userId);
      if (u) { u.purchases = user.purchases; writeFile(db); }
    }
  }
  return true;
}

export async function hasPurchased(userId: string, bookId: string): Promise<boolean> {
  const user = await findUserById(userId);
  return user ? user.purchases.includes(bookId) : false;
}

export function toPublicUser(user: User): UserPublic {
  return { id: user.id, email: user.email, name: user.name, purchases: user.purchases };
}
