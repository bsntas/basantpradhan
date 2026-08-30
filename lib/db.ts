import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

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

interface DB {
  users: User[];
}

function readDB(): DB {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(db: DB): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export async function createUser(email: string, password: string, name: string): Promise<User | null> {
  const db = readDB();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) return null;
  const hashed = await bcrypt.hash(password, 10);
  const user: User = { id: uuidv4(), email, password: hashed, name, purchases: [], createdAt: new Date().toISOString() };
  db.users.push(user);
  writeDB(db);
  return user;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = readDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function findUserById(id: string): User | null {
  const db = readDB();
  return db.users.find(u => u.id === id) ?? null;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function addPurchase(userId: string, bookId: string): boolean {
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return false;
  if (!user.purchases.includes(bookId)) {
    user.purchases.push(bookId);
    writeDB(db);
  }
  return true;
}

export function hasPurchased(userId: string, bookId: string): boolean {
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  return user ? user.purchases.includes(bookId) : false;
}

export function toPublicUser(user: User): UserPublic {
  return { id: user.id, email: user.email, name: user.name, purchases: user.purchases };
}
