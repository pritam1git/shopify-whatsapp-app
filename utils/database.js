// utils/database.js
import mysql from "mysql2/promise";

// ------------------------------
// Database Connection Pool
// ------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shopify_app",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
});

// ------------------------------
// Test DB Connection
// ------------------------------
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// ------------------------------
// Initialize Tables
// ------------------------------
export async function initDatabase() {
  try {
    const connected = await testConnection();
    if (!connected) throw new Error("Database connection failed");

    const connection = await pool.getConnection();

    // App installations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS app_installations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop VARCHAR(255) NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        scope TEXT,
        plan VARCHAR(50) DEFAULT 'free',
        installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        app_version VARCHAR(20) DEFAULT '1.0.0',
        shop_domain VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        webhook_registered BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shop (shop)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Checked/created table: app_installations");

    // Shop settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS shop_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        message TEXT,
        buttonText VARCHAR(100),
        position VARCHAR(50),
        buttonColor VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shop (shop)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Checked/created table: shop_settings");

    connection.release();
    console.log("✅ Database tables initialized successfully");

    await logTableCounts();
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  }
}

// ------------------------------
// Log table counts
// ------------------------------
async function logTableCounts() {
  try {
    const connection = await pool.getConnection();
    const [installRows] = await connection.execute("SELECT COUNT(*) as count FROM app_installations");
    const [settingsRows] = await connection.execute("SELECT COUNT(*) as count FROM shop_settings");
    connection.release();
    console.log(`📊 Database stats - Installations: ${installRows[0].count}, Settings: ${settingsRows[0].count}`);
  } catch (error) {
    console.error("❌ Error getting table counts:", error);
  }
}

// ------------------------------
// App Installation Helpers
// ------------------------------
export async function storeAppInstallation(session, shopData = null) {
  try {
    console.log(`💾 Storing app installation for shop: ${session.shop}`);
    const connection = await pool.getConnection();

    await connection.execute(
      `INSERT INTO app_installations (shop, access_token, scope, shop_domain, last_login)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         access_token = VALUES(access_token),
         scope = VALUES(scope),
         shop_domain = VALUES(shop_domain),
         last_login = NOW(),
         is_active = true,
         updated_at = CURRENT_TIMESTAMP`,
      [
        session.shop,
        session.accessToken,
        session.scope || null,
        shopData?.domain || session.shop
      ]
    );

    connection.release();
    console.log(`✅ App installation stored for shop: ${session.shop}`);
  } catch (error) {
    console.error(`❌ App installation store error for shop ${session?.shop || "unknown"}:`, error);
    throw error;
  }
}

export async function getAppInstallation(shop) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM app_installations WHERE shop = ?",
      [shop]
    );
    connection.release();
    return rows.length ? rows[0] : null;
  } catch (error) {
    console.error(`❌ Error fetching app installation for shop ${shop}:`, error);
    throw error;
  }
}

export async function upsertWhatsappSettings(shop, { phone, message, buttonText, position, buttonColor}) {
  await pool.query(
    `INSERT INTO shop_settings (shop, phone, message, buttonText, position, buttonColor)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE phone=?, message=?, buttonText=?, position=?, buttonColor=?`,
    [shop, phone, message, buttonText, position, buttonColor, phone, message, buttonText, position, buttonColor]
  );
}
// ------------------------------
// WhatsApp Settings Helpers
// ------------------------------
export async function saveShopSettings(shop, settings) {
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      `INSERT INTO shop_settings (shop, phone, message, buttonText, position, buttonColor)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         phone = VALUES(phone),
         message = VALUES(message),
         buttonText = VALUES(buttonText),
         position = VALUES(position),
         buttonColor = VALUES(buttonColor),
         updated_at = CURRENT_TIMESTAMP`,
      [
        shop,
        settings.phone || null,
        settings.message || null,
        settings.buttonText || null,
        settings.position || null,
        settings.buttonColor || null,
      ]
    );
    connection.release();
    console.log(`✅ Settings saved for shop: ${shop}`);
  } catch (error) {
    console.error(`❌ Error saving settings for shop ${shop}:`, error);
    throw error;
  }
}

export async function getShopSettings(shop) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM shop_settings WHERE shop = ?",
      [shop]
    );
    connection.release();
    return rows.length ? rows[0] : null;
  } catch (error) {
    console.error(`❌ Error loading settings for shop ${shop}:`, error);
    throw error;
  }
}
// ------------------------------
// Update Webhook Registered Flag
// ------------------------------
export async function updateWebhookRegistered(shop, status = true) {
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      "UPDATE app_installations SET webhook_registered = ? WHERE shop = ?",
      [status ? 1 : 0, shop]
    );
    connection.release();
    console.log(`🔔 Webhook registered status updated for ${shop}: ${status}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating webhook registered for ${shop}:`, error);
    throw error;
  }
}

// ------------------------------
// Delete Shop Data (Uninstall cleanup)
// ------------------------------
export async function deleteAppInstallation(shop) {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      "DELETE FROM app_installations WHERE shop = ?",
      [shop]
    );
    connection.release();
    console.log(`🗑️ Deleted installation for shop: ${shop}, affected rows: ${result.affectedRows}`);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`❌ Error deleting installation for shop ${shop}:`, error);
    throw error;
  }
}

export async function deleteShopSettings(shop) {
  try {
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      "DELETE FROM shop_settings WHERE shop = ?",
      [shop]
    );
    connection.release();
    console.log(`🗑️ Deleted settings for shop: ${shop}, affected rows: ${result.affectedRows}`);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`❌ Error deleting settings for shop ${shop}:`, error);
    throw error;
  }
}

// ------------------------------
// Delete All Shop Data (Helper for webhook)
// ------------------------------
export async function deleteShopData(shop) {
  try {
    await deleteAppInstallation(shop);
    await deleteShopSettings(shop);
    console.log(`✅ Full cleanup done for shop: ${shop}`);
  } catch (error) {
    console.error(`❌ Error cleaning up data for shop ${shop}:`, error);
    throw error;
  }
}
export async function getActiveInstallations() {
  const connection = await pool.getConnection();
  const [rows] = await connection.execute(
    "SELECT * FROM app_installations WHERE is_active = 1"
  );
  connection.release();
  return rows;
}

// ------------------------------
// Export Pool
// ------------------------------
export default pool;
