import { shopify } from "./shopifyClient.js";
import { deleteShopData, updateWebhookRegistered } from "./database.js";
import { appendLog } from "./logger.js";
import { Session } from "@shopify/shopify-api";

export default async function registerWebhooks(session) {
    const shop = session.shop;
    const accessToken = session.accessToken || session.access_token;

    if (!accessToken) {
        console.error("❌ No access token available for webhook registration");
        return;
    }

    const webhookSession = new Session({
        id: `${shop}_${Date.now()}`,
        shop,
        state: "active",
        isOnline: false,
        accessToken,
    });

    const client = new shopify.clients.Rest({ session: webhookSession });

    try {
        await client.post({
            path: "webhooks",
            data: {
                webhook: {
                    topic: "app/uninstalled",
                    address: `${process.env.SHOPIFY_HOST}/webhooks/app/uninstalled`,
                    format: "json",
                },
            },
            type: "application/json", // fixed
        });
        console.log(`✅ Uninstall webhook registered for ${shop}`);
        await updateWebhookRegistered(shop, true);
    } catch (err) {
        console.error("❌ Webhook registration failed:", err.response?.body || err);
    }
}

// Shopify webhook handler
shopify.webhooks.addHandlers({
    APP_UNINSTALLED: {
        deliveryMethod: "http",
        callbackUrl: "/webhooks/app/uninstalled",
        callback: async (topic, shop, body) => {
            console.log(`🚨 App uninstalled for ${shop}`);
            await deleteShopData(shop);
            await appendLog("uninstall.log", `Shop ${shop} uninstalled, data deleted`);
        },
    },
});
