import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);
    
    // Handle customer data request - log for compliance
    console.log("Customer data request received:", {
      shop,
      customerId: payload.customer?.id,
      requestedAt: new Date().toISOString(),
      payload
    });
    
    // For GDPR compliance, you should:
    // 1. Collect all customer data you have stored
    // 2. Prepare a data export for the customer
    // 3. Send the data to the customer via the method specified in your privacy policy
    
    // Return 200 OK to acknowledge receipt
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error processing customer data request webhook:", error);
    // Return 401 for invalid HMAC as required by Shopify
    return new Response(null, { status: 401 });
  }
};
