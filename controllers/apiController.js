import { shopify } from "../utils/shopifyClient.js";
import { getAppInstallation, getShopSettings, saveShopSettings } from "../utils/database.js";
import { Session } from "@shopify/shopify-api";

export async function installWidget(req, res) {
  try {
    const shop = (req.query.shop || req.body.shop || "").trim();
    console.log("➡️ Shop param received:", shop);

    if (!shop) return res.json({ success: false, error: "Missing shop parameter" });

    // Get installation record
    const appInstallation = await getAppInstallation(shop);
    if (!appInstallation || !appInstallation.access_token) {
      console.error("❌ No access token found for:", shop);
      return res.json({ success: false, error: "No access token. Please reinstall the app." });
    }

    console.log("✅ Found access token for shop:", shop, "Token:", appInstallation.access_token);

    // Fetch shop-specific settings if widget URL is stored
    const shopSettings = await getShopSettings(shop);
    const scriptSrc = shopSettings?.widget_url || `${process.env.SHOPIFY_HOST}/widget.js`;

    // Create a Session object for REST client
    const session = new Session({
      id: `offline_${shop}`,
      shop,
      isOnline: false,
      accessToken: appInstallation.access_token,
      scope: appInstallation.scope || shopify.config.scopes.join(","),
    });

    const client = new shopify.clients.Rest({ session });

    // Install ScriptTag
    const response = await client.post({
      path: "script_tags",
      data: {
        script_tag: { event: "onload", src: scriptSrc },
      },
      type: "application/json",
    });

    console.log("✅ Widget installed:", response.body);

    // ✅ Save default WhatsApp settings (if not already saved)
    const defaultSettings = {
      phone: req.body.phone || "911234567890",
      message: req.body.message || "Hello, I need help!",
      buttonText: req.body.buttonText || "Chat with us",
      position: req.body.position || "bottom-right",
      buttonColor: req.body.buttonColor || "#25D366",
    };

    await saveShopSettings(shop, defaultSettings);

    res.json({ success: true, data: response.body });

  } catch (err) {
    console.error("❌ installWidget error:", err);
    res.json({ success: false, error: err.message });
  }
}

export async function getSettings(req, res) {
  try {
    const shop = (req.query.shop || "").trim();
    if (!shop) return res.json({});

    // Fetch settings directly from DB
    const shopSettings = await getShopSettings(shop);
    if (!shopSettings) return res.json({}); // No settings found

    // Return JSON with all widget fields
    res.json({
      phone: shopSettings.phone || "",
      message: shopSettings.message || "",
      position: shopSettings.position || "bottom-right",
      buttonText: shopSettings.buttonText || "Chat with us",
      buttonColor: shopSettings.buttonColor || "#25D366",
    });
  } catch (err) {
    console.error("get-settings error:", err);
    res.json({});
  }
}

