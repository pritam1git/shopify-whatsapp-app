import express from "express";
import crypto from "crypto";

export default (shopify) => {
  const router = express.Router();

  // ------------------------------
  // Uninstall webhook
  // ------------------------------
  router.post("/app/uninstalled", async (req, res) => {
    console.log("➡️ /webhooks/app/uninstalled hit");

    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const body = req.body;
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(body, "utf8")
      .digest("base64");

    if (generatedHmac === hmacHeader) {
      console.log("✅ HMAC verified successfully");
      res.status(200).send("OK");

      try {
        await shopify.webhooks.process({
          rawBody: req.body,
          rawRequest: req,
          rawResponse: res,
        });

        console.log("🗑️ app/uninstalled webhook processed successfully");
      } catch (err) {
        console.error("❌ Webhook error:", err);
      }
    } else {
      console.log("❌ HMAC verification failed");
      console.log("Header HMAC:", hmacHeader);
      console.log("Generated HMAC:", generatedHmac);
      return res.status(401).send("Unauthorized");
    }
  });

  // ------------------------------
  // Mandatory compliance webhooks
  // ------------------------------

  router.post("/customers/data_request", (req, res) => {
    console.log("➡️ /webhooks/customers/data_request hit");

    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const body = req.body;
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(body, "utf8")
      .digest("base64");

    if (generatedHmac === hmacHeader) {
      console.log("✅ HMAC verified successfully");
      console.log("📨 customers/data_request webhook received");
      res.status(200).send({ status: "success" });
    } else {
      console.log("❌ HMAC verification failed");
      console.log("Header HMAC:", hmacHeader);
      console.log("Generated HMAC:", generatedHmac);
      res.status(401).send("Unauthorized");
    }
  });

  router.post("/customers/redact", (req, res) => {
    console.log("➡️ /webhooks/customers/redact hit");

    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const body = req.body;
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(body, "utf8")
      .digest("base64");

    if (generatedHmac === hmacHeader) {
      console.log("✅ HMAC verified successfully");
      console.log("🗑️ customers/redact webhook received");
      res.status(200).send({ status: "success" });
    } else {
      console.log("❌ HMAC verification failed");
      console.log("Header HMAC:", hmacHeader);
      console.log("Generated HMAC:", generatedHmac);
      res.status(401).send("Unauthorized");
    }
  });

  router.post("/shop/redact", (req, res) => {
    console.log("➡️ /webhooks/shop/redact hit");

    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const body = req.body;
    const generatedHmac = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(body, "utf8")
      .digest("base64");

    if (generatedHmac === hmacHeader) {
      console.log("✅ HMAC verified successfully");
      console.log("🗑️ shop/redact webhook received");
      res.status(200).send({ status: "success" });
    } else {
      console.log("❌ HMAC verification failed");
      console.log("Header HMAC:", hmacHeader);
      console.log("Generated HMAC:", generatedHmac);
      res.status(401).send("Unauthorized");
    }
  });

  return router;
};
