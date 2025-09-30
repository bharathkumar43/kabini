import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);
    
    // Handle shop data deletion - log for compliance
    console.log("Shop redaction request received:", {
      shop,
      redactedAt: new Date().toISOString(),
      payload
    });
    
    // For GDPR compliance, you should:
    // 1. Delete all shop-related data from your database
    // 2. Remove any stored customer information for this shop
    // 3. Clean up any cached data
    
    // Return 200 OK to acknowledge receipt
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing shop redact webhook:", error);
    // Return 401 for invalid HMAC as required by Shopify
    return new Response(null, { status: 401 });
  }
};
