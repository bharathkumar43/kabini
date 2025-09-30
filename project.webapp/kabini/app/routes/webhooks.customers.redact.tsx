import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);
    
    // Handle customer data deletion - log for compliance
    console.log("Customer redaction request received:", {
      shop,
      customerId: payload.customer?.id,
      ordersToRedact: payload.orders_to_redact,
      redactedAt: new Date().toISOString(),
      payload
    });
    
    // For GDPR compliance, you should:
    // 1. Delete customer data from your database
    // 2. Remove any stored personal information
    // 3. Clean up any associated order data as specified
    
    // Return 200 OK to acknowledge receipt
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing customer redact webhook:", error);
    // Return 401 for invalid HMAC as required by Shopify
    return new Response(null, { status: 401 });
  }
};
