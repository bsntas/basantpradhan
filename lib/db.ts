import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  password: string;
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

const useKV = () => Boolean(process.env.KV_REST_API_URL);

// Vercel KV (production)
async function kvGet<T>(key: string): Promise<T | null> {
  const { kv } = await import('@vercel/kv');
  const val = await kv.get<string>(key);
  if (val === null || val === undefined) return null;
  // kv.set stores parsed JSON automatically; stringify guard for safety
  return (typeof val === 'string' ? JSON.parse(val) : val) as T;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const { kv } = await import('@vercel/kv');
  await kv.set(key, JSON.stringify(value));
}

// JSON file fallback (local dev — no KV vars needed)
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
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function createUser(email: string, password: string, name: string): Promise<User | null> {
  const normalEmail = email.toLowerCase();
  const hashed = await bcrypt.hash(password, 10);
  const user: User = {
    id: uuidv4(),
    email: normalEmail,
    password: hashed,
    name,
    purchases: [],
    createdAt: new Date().toISOString(),
  };

  if (useKV()) {
    const exists = await kvGet<string>(`email:${normalEmail}`);
    if (exists) return null;
    await kvSet(`user:${user.id}`, user);
    await kvSet(`email:${normalEmail}`, user.id);
  } else {
    const db = readFile();
    if (db.users.find(u => u.email === normalEmail)) return null;
    db.users.push(user);
    writeFile(db);
  }

  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalEmail = email.toLowerCase();
  if (useKV()) {
    const userId = await kvGet<string>(`email:${normalEmail}`);
    if (!userId) return null;
    const raw = typeof userId === 'object' ? (userId as unknown as string) : userId;
    return findUserById(raw);
  }
  const db = readFile();
  return db.users.find(u => u.email === normalEmail) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  if (useKV()) {
    return kvGet<User>(`user:${id}`);
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
    if (useKV()) {
      await kvSet(`user:${userId}`, user);
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
