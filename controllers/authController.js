import { shopify } from "../utils/shopifyClient.js";
import { storeAppInstallation } from "../utils/database.js";
import registerWebhooks from "../utils/webhooks.js";

/**
 * Force top-level redirect (needed for embedded apps)
 */
export async function topLevelAuth(req, res) {
  const shop = req.query.shop;
  console.log("🟢 [topLevelAuth] route hit");
  console.log("➡️ Query params:", req.query);

  if (!shop) {
    console.error("❌ [topLevelAuth] Missing shop parameter");
    return res.status(400).send("Missing shop parameter");
  }

  console.log(`✅ [topLevelAuth] Shop param: ${shop}`);

  // ✅ Allow embedding from Shopify admin
  const cspHeader = `frame-ancestors https://${shop} https://admin.shopify.com;`;
  res.setHeader("Content-Security-Policy", cspHeader);
  res.setHeader("X-Frame-Options", "ALLOWALL");

  console.log("📌 CSP set:", cspHeader);

  // Redirect to /auth with top_level=1 to trigger OAuth
  const redirectUrl = `${process.env.SHOPIFY_HOST}/auth?shop=${shop}&top_level=1`;
  console.log("➡️ Redirect URL =", redirectUrl);

  res.send(`
    <script type="text/javascript">
      console.log("🔵 Forcing top-level redirect for ${shop}");
      window.top.location.href = "${redirectUrl}";
    </script>
  `);

  console.log("🚀 Top-level redirect script sent");
}

/**
 * Start OAuth flow
 * Supports both offline (DB) and online (session token) if needed
 */
export async function startAuth(req, res) {
  try {
    const shop = req.query.shop;
    const embedded = req.query.embedded;
    const topLevel = req.query.top_level;

    if (!shop) return res.status(400).send("Missing shop parameter");

    console.log("➡️ Starting Shopify auth for:", shop);

    // ⚡ If embedded and not yet top-level, redirect
    if (embedded === "1" && !topLevel) {
      console.log("🟡 Embedded request, redirecting to /auth/top-level");
      return res.redirect(`/auth/top-level?shop=${shop}`);
    }

    // ✅ Offline token for DB storage
    const offlineRedirectUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: false, // Offline token
      rawRequest: req,
      rawResponse: res,
    });

    if (offlineRedirectUrl) {
      console.log("🔗 Redirecting to Shopify OAuth (offline token):", offlineRedirectUrl);
      return res.redirect(offlineRedirectUrl);
    }
  } catch (err) {
    console.error("❌ Auth start error:", err);
    if (!res.headersSent) res.status(500).send("Auth start failed");
  }
}

/**
 * Handle OAuth callback
 */
export async function authCallback(req, res) {
  try {
    const { session } = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    console.log("🔹 Session object:", session);
    console.log("✅ OAuth Callback Success:", session.id, session.shop);

    // Store installation in DB (offline token)
    await storeAppInstallation(session);

    // Save session to Shopify session storage
    await shopify.config.sessionStorage.storeSession(session);

    // Register uninstall webhook
    await registerWebhooks(session);

    // ✅ Redirect back inside Shopify Admin
    const storeName = session.shop.replace(".myshopify.com", "");
    const redirectUrl = `https://admin.shopify.com/store/${storeName}/apps/${process.env.SHOPIFY_API_KEY}`;
    console.log("🔁 Final redirect to:", redirectUrl);

    res.redirect(redirectUrl);
  } catch (err) {
    console.error("❌ Auth callback error:", err);
    res.status(500).send("Auth callback failed");
  }
}

/**
 * Optional helper: online token flow
 * Only needed if you want session tokens for frontend
 */
export async function startOnlineAuth(req, res) {
  try {
    const shop = req.query.shop;
    if (!shop) return res.status(400).send("Missing shop parameter");

    const redirectUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: true, // Online token for session token
      rawRequest: req,
      rawResponse: res,
    });

    if (redirectUrl) {
      console.log("🔗 Redirecting to Shopify OAuth (online token):", redirectUrl);
      return res.redirect(redirectUrl);
    }
  } catch (err) {
    console.error("❌ Online auth error:", err);
    if (!res.headersSent) res.status(500).send("Online auth failed");
  }
}
