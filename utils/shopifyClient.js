// utils/shopifyClient.js - Complete Fixed Version
import "@shopify/shopify-api/adapters/node";
import { shopifyApi } from "@shopify/shopify-api";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getAppInstallation, storeAppInstallation } from "./database.js";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env") });

// Validate required environment variables
const requiredEnvVars = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'SHOPIFY_HOST'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:", missingVars);
  process.exit(1);
}

// Shopify API configuration with database-backed sessionStorage
export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: (process.env.SHOPIFY_SCOPES || "read_products,write_script_tags,read_orders").split(','),
  hostName: process.env.SHOPIFY_HOST.replace(/^https?:\/\//, ""),
  hostScheme: process.env.NODE_ENV === 'production' ? "https" : "https",
  apiVersion: "2024-01",
  isEmbeddedApp: true,
  cookies: {
    secure: process.env.NODE_ENV === 'production', // true in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'lax' for local
  },
  // ------------------------
  // Add sessionStorage to fix storeSession error
  // ------------------------
  sessionStorage: {
    async storeSession(session) {
      console.log("💾 Storing session in DB:", session.id);
      await storeAppInstallation({
        shop: session.shop,
        accessToken: session.accessToken || session.token,
        scope: session.scope
      });
      return session;
    },
    async loadSession(id) {
      console.log("🔹 Loading session:", id);
      const session = await getAppInstallation(id);
      if (!session) return null;
      return {
        id: session.id || session.shop,
        shop: session.shop,
        accessToken: session.access_token,
        scope: session.scope
      };
    },
    async deleteSession(id) {
      console.log("🗑️ Deleting session:", id);
      return true;
    }
  }
});

console.log("✅ Shopify API initialized with MySQL session storage");
console.log("🔧 Config:", {
  apiKey: process.env.SHOPIFY_API_KEY?.substring(0, 8) + "...",
  hostName: process.env.SHOPIFY_HOST?.replace(/^https?:\/\//, ""),
  scopes: shopify.config.scopes.toString(),
  apiVersion: shopify.config.apiVersion,
});
