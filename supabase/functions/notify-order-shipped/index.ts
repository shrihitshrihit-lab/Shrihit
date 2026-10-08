import { corsHeaders } from "../_shared/cors.ts";

interface NotifyPayload {
  order_id: string;
}

interface ShippingAddress {
  full_name?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  user_id: string;
  customer_email: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_address: ShippingAddress;
  total: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
};

const buildTrackingMessage = (order: OrderRow, storeName: string) => {
  const courier = order.courier_name || "our courier partner";
  const tracking = order.tracking_number || "will be shared shortly";
  const linkLine = order.tracking_url ? `\nTrack here: ${order.tracking_url}` : "";
  return (
    `Namaste${order.shipping_address?.full_name ? ` ${order.shipping_address.full_name}` : ""}!\n\n` +
    `Your ${storeName} order #${order.order_number} has been shipped via ${courier}.\n` +
    `Tracking / AWB: ${tracking}${linkLine}\n\n` +
    `Thank you for shopping with ${storeName}.`
  );
};

async function sendResendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  from: string;
  apiKey: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }
  return body;
}

async function sendWhatsAppCloud(opts: {
  token: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode: string;
  bodyParams: string[];
}) {
  const components = [
    {
      type: "body",
      parameters: opts.bodyParams.map((text) => ({ type: "text", text })),
    },
  ];

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${opts.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to,
        type: "template",
        template: {
          name: opts.templateName,
          language: { code: opts.languageCode },
          components,
        },
      }),
    },
  );

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`WhatsApp Cloud API failed (${response.status}): ${body}`);
  }
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Supabase environment is not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization." }, 401);
    }

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
      },
    });
    if (!userRes.ok) {
      return json({ error: "Invalid session." }, 401);
    }
    const user = (await userRes.json()) as { id?: string };
    if (!user.id) {
      return json({ error: "Invalid session." }, 401);
    }

    const roleRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/has_role`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ _user_id: user.id, _role: "admin" }),
      },
    );
    const isAdmin = await roleRes.json();
    if (!isAdmin) {
      return json({ error: "Admin access required." }, 403);
    }

    const payload = (await req.json()) as Partial<NotifyPayload>;
    if (!payload.order_id) {
      return json({ error: "order_id is required." }, 400);
    }

    const orderRes = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${payload.order_id}&select=*`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    );
    const orders = (await orderRes.json()) as OrderRow[];
    const order = orders?.[0];
    if (!order) {
      return json({ error: "Order not found." }, 404);
    }

    if (!order.tracking_number || !order.courier_name) {
      return json(
        { error: "courier_name and tracking_number are required before notifying." },
        400,
      );
    }

    // Resolve customer email: dedicated column → address JSON → auth user email
    let email =
      order.customer_email ||
      order.shipping_address?.email ||
      null;

    if (!email && order.user_id) {
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${order.user_id}&select=email`,
        {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
        },
      );
      const profiles = (await profileRes.json()) as Array<{ email: string | null }>;
      email = profiles?.[0]?.email || null;
    }

    if (!email && order.user_id) {
      const authUserRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${order.user_id}`,
        {
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
          },
        },
      );
      if (authUserRes.ok) {
        const authUser = (await authUserRes.json()) as { email?: string };
        email = authUser.email || null;
      }
    }

    const phone = normalizePhone(order.shipping_address?.phone);
    const settingsRes = await fetch(
      `${supabaseUrl}/rest/v1/store_settings?id=eq.1&select=store_name,email`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      },
    );
    const settingsRows = (await settingsRes.json()) as Array<{
      store_name?: string;
      email?: string;
    }>;
    const storeName = settingsRows?.[0]?.store_name || "Shrihit";
    const storeEmail = settingsRows?.[0]?.email || "support@shrihit.com";

    const text = buildTrackingMessage(order, storeName);
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : null;

    const result: {
      email: { sent: boolean; error?: string; to?: string };
      whatsapp: {
        sent: boolean;
        error?: string;
        to?: string;
        fallback_url?: string | null;
      };
    } = {
      email: { sent: false },
      whatsapp: { sent: false, fallback_url: whatsappUrl },
    };

    const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
    const resendFrom =
      Deno.env.get("RESEND_FROM_EMAIL")?.trim() ||
      `${storeName} <${storeEmail}>`;

    if (email && resendKey) {
      try {
        const subject = `${storeName}: Order #${order.order_number} shipped`;
        const html = `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222">
            <h2 style="margin-bottom:8px">${storeName}</h2>
            <p>Your order <strong>#${order.order_number}</strong> has been shipped.</p>
            <p><strong>Courier:</strong> ${order.courier_name}<br/>
            <strong>Tracking / AWB:</strong> ${order.tracking_number}</p>
            ${
              order.tracking_url
                ? `<p><a href="${order.tracking_url}">Track your shipment</a></p>`
                : ""
            }
            <p style="color:#666;font-size:13px">If you have questions, reply to this email or WhatsApp us.</p>
          </div>
        `;
        await sendResendEmail({
          to: email,
          subject,
          text,
          html,
          from: resendFrom,
          apiKey: resendKey,
        });
        result.email = { sent: true, to: email };
      } catch (error) {
        result.email = {
          sent: false,
          to: email,
          error: error instanceof Error ? error.message : "Email send failed",
        };
      }
    } else if (!email) {
      result.email = { sent: false, error: "No customer email on this order." };
    } else {
      result.email = {
        sent: false,
        to: email,
        error: "RESEND_API_KEY is not configured on the Edge Function.",
      };
    }

    const waToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim();
    const waPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim();
    const waTemplate =
      Deno.env.get("WHATSAPP_SHIPPED_TEMPLATE")?.trim() || "order_shipped";
    const waLang = Deno.env.get("WHATSAPP_TEMPLATE_LANG")?.trim() || "en";

    if (phone && waToken && waPhoneId) {
      try {
        await sendWhatsAppCloud({
          token: waToken,
          phoneNumberId: waPhoneId,
          to: phone,
          templateName: waTemplate,
          languageCode: waLang,
          bodyParams: [
            order.shipping_address?.full_name || "Customer",
            order.order_number,
            order.courier_name || "",
            order.tracking_number || "",
          ],
        });
        result.whatsapp = { sent: true, to: phone, fallback_url: whatsappUrl };
      } catch (error) {
        result.whatsapp = {
          sent: false,
          to: phone,
          fallback_url: whatsappUrl,
          error: error instanceof Error ? error.message : "WhatsApp send failed",
        };
      }
    } else if (!phone) {
      result.whatsapp = {
        sent: false,
        error: "No customer phone on this order.",
        fallback_url: null,
      };
    } else {
      result.whatsapp = {
        sent: false,
        to: phone,
        fallback_url: whatsappUrl,
        error:
          "WhatsApp Cloud API secrets are not configured. Use fallback_url to message the customer manually.",
      };
    }

    return json({
      ok: result.email.sent || result.whatsapp.sent || !!result.whatsapp.fallback_url,
      order_number: order.order_number,
      ...result,
    });
  } catch (error) {
    console.error("notify-order-shipped error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Failed to notify customer.",
      },
      500,
    );
  }
});
