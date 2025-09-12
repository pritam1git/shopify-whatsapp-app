import express from "express";

export default (shopify) => {
  const router = express.Router();

  router.post("/app/uninstalled", async (req, res) => {
    try {
      // Shopify expects raw body, not parsed JSON
      await shopify.webhooks.process({
        rawBody: req.body,      // rawBody from express.raw
        rawRequest: req,
        rawResponse: res,
      });
      // ✅ Do NOT send res here, Shopify handles it
    } catch (err) {
      console.error("❌ Webhook error:", err);
      if (!res.headersSent) res.status(500).send("Webhook error");
    }
  });

  return router;
};
