import { corsHeaders } from "../_shared/cors.ts";
import { getRazorpayAuthHeader, getRazorpayConfig } from "../_shared/razorpay.ts";

interface CreateOrderRequest {
  receipt: string;
}

const validateRequest = ({ receipt }: CreateOrderRequest) => {
  if (!receipt || typeof receipt !== "string") {
    throw new Error("receipt is required.");
  }
};

/**
 * Resolves the amount to charge from the database rather than trusting the
 * client. The order row is the source of truth, and its line items are
 * re-priced against the products table so a tampered client cannot pay less
 * than the catalogue price.
 */
const resolveAmountInPaise = async (orderNumber: string): Promise<number> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Server is not configured to verify order amounts.");
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };

  const orderUrl = new URL(`${supabaseUrl}/rest/v1/orders`);
  orderUrl.searchParams.set("order_number", `eq.${orderNumber}`);
  orderUrl.searchParams.set(
    "select",
    "id,shipping_cost,payment_status,coupon_code,order_items(product_id,quantity)"
  );

  const orderResponse = await fetch(orderUrl.toString(), { headers });
  if (!orderResponse.ok) {
    throw new Error(`Could not load order ${orderNumber}.`);
  }

  const orders = (await orderResponse.json()) as Array<{
    id: string;
    shipping_cost: number;
    payment_status: string;
    coupon_code: string | null;
    order_items: Array<{ product_id: string; quantity: number }>;
  }>;

  const order = orders?.[0];
  if (!order) {
    throw new Error(`Order ${orderNumber} was not found.`);
  }

  if (order.payment_status === "paid") {
    throw new Error(`Order ${orderNumber} is already paid.`);
  }

  if (!order.order_items?.length) {
    throw new Error(`Order ${orderNumber} has no items.`);
  }

  const productIds = [...new Set(order.order_items.map((item) => item.product_id))];
  const productsUrl = new URL(`${supabaseUrl}/rest/v1/products`);
  productsUrl.searchParams.set("id", `in.(${productIds.join(",")})`);
  productsUrl.searchParams.set("select", "id,price,free_shipping");

  const productsResponse = await fetch(productsUrl.toString(), { headers });
  if (!productsResponse.ok) {
    throw new Error("Could not verify product pricing.");
  }

  const products = (await productsResponse.json()) as Array<{
    id: string;
    price: number;
    free_shipping: boolean;
  }>;
  const productById = new Map(products.map((product) => [product.id, product]));

  let itemsTotal = 0;
  let everyItemShipsFree = true;
  for (const item of order.order_items) {
    const product = productById.get(item.product_id);
    if (!product) {
      throw new Error("Order contains a product that no longer exists.");
    }
    itemsTotal += Number(product.price) * item.quantity;
    if (!product.free_shipping) {
      everyItemShipsFree = false;
    }
  }

  // Shipping is recomputed here too - the client stores shipping_cost on the
  // order, so trusting it would let a tampered client zero out delivery.
  const settingsUrl = new URL(`${supabaseUrl}/rest/v1/store_settings`);
  settingsUrl.searchParams.set("id", "eq.1");
  settingsUrl.searchParams.set("select", "shipping_cost,free_shipping_threshold");

  const settingsResponse = await fetch(settingsUrl.toString(), { headers });
  const settings = settingsResponse.ok
    ? ((await settingsResponse.json())[0] as
        | { shipping_cost: number; free_shipping_threshold: number }
        | undefined)
    : undefined;

  const shippingCost = Number(settings?.shipping_cost ?? 80);
  const freeShippingThreshold = Number(settings?.free_shipping_threshold ?? 600);
  const shipping =
    everyItemShipsFree || itemsTotal >= freeShippingThreshold ? 0 : shippingCost;

  // Re-validate the coupon here as well. The client writes coupon_code and
  // discount_amount onto the order, so charging from the stored discount would
  // let anyone invent one.
  let discount = 0;
  if (order.coupon_code) {
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/validate_coupon`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ _code: order.coupon_code, _subtotal: itemsTotal }),
    });

    if (rpcResponse.ok) {
      const rows = (await rpcResponse.json()) as Array<{ valid: boolean; discount: number }>;
      const result = Array.isArray(rows) ? rows[0] : rows;
      if (result?.valid) {
        discount = Number(result.discount) || 0;
      }
    }
  }

  const payable = Math.max(0, itemsTotal + shipping - discount);
  const amountInPaise = Math.round(payable * 100);

  if (!Number.isInteger(amountInPaise) || amountInPaise < 100) {
    throw new Error("Resolved order amount is invalid.");
  }

  return amountInPaise;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as CreateOrderRequest;
    validateRequest(payload);

    const config = getRazorpayConfig();
    const amount = await resolveAmountInPaise(payload.receipt);

    // Razorpay intermittently rejects valid credentials with a transient
    // "Authentication failed", so retry a couple of times before giving up.
    // A failed attempt never creates an order, so retrying is safe.
    const MAX_ATTEMPTS = 3;
    let razorpayResponse: { id?: string; amount?: number; currency?: string; error?: { description?: string } } | null =
      null;
    let lastFailure = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getRazorpayAuthHeader(config),
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: payload.receipt,
        }),
      });

      const responseBodyText = await response.text();
      let parsed: typeof razorpayResponse = null;
      try {
        parsed = JSON.parse(responseBodyText);
      } catch {
        // Non-JSON response is reported via responseBodyText below.
      }

      if (response.ok && parsed?.id) {
        razorpayResponse = parsed;
        break;
      }

      lastFailure =
        parsed?.error?.description ||
        `Razorpay create order failed with status ${response.status}: ${responseBodyText}`;
      console.error(`razorpay-create-order attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastFailure}`);

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }

    if (!razorpayResponse?.id) {
      throw new Error(lastFailure || "Razorpay did not return an order id.");
    }

    return new Response(
      JSON.stringify({
        order_id: razorpayResponse.id,
        amount: razorpayResponse.amount,
        currency: razorpayResponse.currency,
        key_id: config.keyId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("razorpay-create-order error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create Razorpay order.";
    const status = errorMessage.includes("credentials") ? 401 : 400;

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
