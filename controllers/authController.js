import { shopify } from "../utils/shopifyClient.js";
import { storeAppInstallation } from "../utils/database.js";
import registerWebhooks from "../utils/webhooks.js";


// Force top-level redirect (needed for embedded apps)
export async function topLevelAuth(req, res) {
  const shop = req.query.shop;
  console.log("🟢 [topLevelAuth] route hit hua");
  console.log("➡️ Query params:", req.query);

  if (!shop) {
    console.error("❌ [topLevelAuth] Missing shop parameter");
    return res.status(400).send("Missing shop parameter");
  }

  console.log(`✅ [topLevelAuth] Shop param mila: ${shop}`);

  // ✅ Allow embedding from Shopify admin
  const cspHeader = `frame-ancestors https://${shop} https://admin.shopify.com;`;
  res.setHeader("Content-Security-Policy", cspHeader);
  res.setHeader("X-Frame-Options", "ALLOWALL");

  console.log("📌 [topLevelAuth] CSP set:", cspHeader);
  console.log("📌 [topLevelAuth] X-Frame-Options set: ALLOWALL");

  const redirectUrl = `${process.env.SHOPIFY_HOST}/auth?shop=${shop}&top_level=1`;
  console.log("➡️ [topLevelAuth] Final redirect URL =", redirectUrl);

  res.send(`
    <script type="text/javascript">
      console.log("🔵 Forcing top-level redirect for ${shop}");
      window.top.location.href = "${redirectUrl}";
    </script>
  `);

  console.log("🚀 [topLevelAuth] Response sent with redirect script");
}

// Start OAuth
export async function startAuth(req, res) {
  try {
    const shop = req.query.shop;
    const embedded = req.query.embedded;
    const topLevel = req.query.top_level;

    if (!shop) return res.status(400).send("Missing shop parameter");

    console.log("➡️ Starting Shopify auth for:", shop);

    // ⚡ If embedded but not yet top-level, send to /auth/top-level
    if (embedded === "1" && !topLevel) {
      console.log("🟡 Embedded request, redirecting to /auth/top-level");
      return res.redirect(`/auth/top-level?shop=${shop}`);
    }

    // ✅ Begin OAuth
    const redirectUrl = await shopify.auth.begin({
      shop,
      callbackPath: "/auth/callback",
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    if (redirectUrl) {
      console.log("🔗 Redirecting to Shopify OAuth:", redirectUrl);
      return res.redirect(redirectUrl);
    }
  } catch (err) {
    console.error("❌ Auth error:", err);
    if (!res.headersSent) res.status(500).send("Auth start failed");
  }
}



// Handle callback
export async function authCallback(req, res) {
  try {
    const { session } = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    console.log("🔹 Session object:", session);
    console.log("✅ OAuth Callback Success:", session.id, session.shop);

    // Store installation in DB
    await storeAppInstallation(session);

    // Save session
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

