// server.js - Complete Fixed Version
import "@shopify/shopify-api/adapters/node";
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { initDatabase, getAppInstallation} from "./utils/database.js";
import { shopify } from "./utils/shopifyClient.js";
import { serveWidget } from './controllers/widgetController.js';
import cookieParser from "cookie-parser";
import { topLevelAuth } from "./controllers/authController.js";
dotenv.config();
const app = express();
// Webhook routes without JSON parser (raw body needed)
app.use("/webhooks", express.raw({ type: 'application/json' }));
app.use(express.json());
const PORT = process.env.PORT || 3000;
app.get("/serveWidget", serveWidget);

async function startServer() {
  try {
    // Initialize database first
    await initDatabase();
    console.log("✅ Database initialized test");

    // Middleware setup
    app.use(cookieParser());
    app.use(express.static("public"));
    
    // API routes with JSON parser
    app.use("/api", bodyParser.json());

    // Debug middleware
    app.use((req, res, next) => {
      console.log(`➡️ ${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });

    // Admin UI
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    app.get("/", async (req, res) => {
      const shop = req.query.shop;
      const embedded = req.query.embedded;

      if (!shop) return res.status(400).send("Missing shop parameter");

      const installation = await getAppInstallation(shop);

      // Not installed
      if (!installation || !installation.access_token) {
        console.log(`⚠️ No installation found for ${shop}`);

        if (embedded === "1") {
          // Force top-level redirect for embedded apps
          return topLevelAuth(req, res);
        } else {
          // Normal redirect to auth
          return res.redirect(`/auth?shop=${shop}`);
        }
      }

      // Installed → serve admin.html
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      res.sendFile(path.join(__dirname, "views/admin.html"));
    });

    // Import and setup routes
    const authRoutes = (await import("./routes/auth.js")).default;
    const apiRoutes = (await import("./routes/api.js")).default;
    const widgetRoutes = (await import("./routes/widget.js")).default;
    const webhookRoutes = (await import("./routes/webhooks.js")).default(shopify);

    // Route registration
    app.use("/auth", authRoutes);  // Fixed: proper auth prefix
    app.use("/api", apiRoutes);
    app.use("/", widgetRoutes);
    app.use("/webhooks", webhookRoutes);


    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ 
        status: "OK", 
        timestamp: new Date().toISOString(),
        port: PORT 
      });
    });

    // Installations endpoint
    app.get("/installations", async (req, res) => {
      try {
        const { getActiveInstallations } = await import("./utils/database.js");
        const installations = await getActiveInstallations();
        res.json({
          success: true,
          count: installations.length,
          installations,
        });
      } catch (error) {
        console.error("❌ Installations endpoint error:", error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error("❌ Global error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error",
        message: error.message 
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ 
        success: false, 
        error: "Route not found",
        path: req.path 
      });
    });

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 App URL: ${process.env.SHOPIFY_HOST}`);
      console.log(`🗄️ Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log(`🔗 Auth URL: ${process.env.SHOPIFY_HOST}/auth`);
      console.log(`🔗 Callback URL: ${process.env.SHOPIFY_HOST}/auth/callback`);
    });

  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
}

startServer();