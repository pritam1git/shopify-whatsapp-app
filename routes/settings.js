// routes/settings.js
import express from "express";
import cors from "cors";
import { getShopSettings } from "../utils/database.js";

const router = express.Router();
router.use(cors()); // allow store origins in dev; tighten in prod

// GET /api/whatsapp/settings?shop=store.myshopify.com
router.get("/api/whatsapp/settings", async (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).json({ error: "missing shop" });
  try {
    const settings = await getShopSettings(shop);
    if (!settings) return res.json(null);
    // map DB fields to predictable JSON keys
    return res.json({
      phone: settings.phone,
      message: settings.message,
      button_text: settings.button_text || settings.button_text,
      position: settings.position,
      button_color: settings.button_colorx
    });
  } catch (err) {
    console.error("GET /api/whatsapp/settings error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;
