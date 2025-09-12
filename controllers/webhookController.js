// controllers/webhookController.js
import pkg from "raw-body";
const { rawBody } = pkg;
import { deleteAppInstallation } from "../utils/database.js"; // 👈 ye function DB se uninstall cleanup karega

export const appUninstalled = async (req, res, shopify) => {
  try {
    const body = await rawBody(req);
    const hmac = req.headers["x-shopify-hmac-sha256"];

    // Verify webhook signature
    const verified = shopify.webhooks.verify(body, hmac, process.env.SHOPIFY_API_SECRET);
    if (!verified) {
      console.warn("❌ Webhook verification failed");
      return res.status(401).send("Webhook verification failed");
    }

    const data = JSON.parse(body.toString());
    const shop = data.myshopify_domain;

    // Delete session from storage
    const sessionKey = `${shop}_offline`;
    const deletedSession = await shopify.config.sessionStorage.deleteSession(sessionKey);

    // Delete DB record
    const deletedDb = await deleteAppInstallation(shop);

    console.log("🗑️ Uninstall cleanup report:", {
      shop,
      sessionDeleted: !!deletedSession,
      dbDeleted: deletedDb > 0 ? `${deletedDb} record(s) removed` : "No DB record found",
    });

    res.status(200).send("Webhook processed");
  } catch (err) {
    console.error("❌ Uninstall webhook error:", err);
    res.status(500).send("Error processing webhook");
  }
};
