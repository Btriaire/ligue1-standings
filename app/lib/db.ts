import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "users.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  }
  return _db;
}

export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: number;
}

export function createUser(email: string, name: string, passwordHash: string): User | null {
  try {
    const stmt = getDb().prepare(
      "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)"
    );
    const result = stmt.run(email.toLowerCase().trim(), name.trim(), passwordHash);
    return getUserById(result.lastInsertRowid as number);
  } catch {
    return null; // email already exists
  }
}

export function getUserByEmail(email: string): User | null {
  return (getDb().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim()) as User) ?? null;
}

export function getUserById(id: number): User | null {
  return (getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as User) ?? null;
}
