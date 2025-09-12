// utils/CustomMySQLSessionStorage.js
import mysql from "mysql2/promise";

export class CustomMySQLSessionStorage {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async storeSession(session) {
    const conn = await this.pool.getConnection();
    try {
      await conn.query(
        "REPLACE INTO shopify_sessions (id, data) VALUES (?, ?)",
        [session.id, JSON.stringify(session)]
      );
    } finally {
      conn.release();
    }
  }

  async loadSession(id) {
    const conn = await this.pool.getConnection();
    try {
      const [rows] = await conn.query(
        "SELECT data FROM shopify_sessions WHERE id = ?",
        [id]
      );
      if (!rows.length) return undefined;
      return JSON.parse(rows[0].data);
    } finally {
      conn.release();
    }
  }

  async deleteSession(id) {
    const conn = await this.pool.getConnection();
    try {
      await conn.query("DELETE FROM shopify_sessions WHERE id = ?", [id]);
    } finally {
      conn.release();
    }
  }
}
