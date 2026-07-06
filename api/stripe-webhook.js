// Vercel serverless function: Stripe webhook → auto-activate client plan in Supabase.
// Env vars required (set in Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY          (sk_live_... or sk_test_...)
//   STRIPE_WEBHOOK_SECRET      (whsec_... from the webhook endpoint)
//   VITE_SUPABASE_URL          (already set for the frontend)
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API → service_role secret)
//
// Maps the Stripe amount to a plan tier, then updates the client's profile.plan.
// The client is identified by client_reference_id, which the frontend appends to
// the Payment Link. As a fallback, the customer email is matched to a profile.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Stripe needs the raw request body to verify the signature, so disable body parsing.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(Buffer.from(data)));
    req.on("error", reject);
  });
}

// Map the paid amount (in cents) to a plan id. Adjust if you change pricing.
function planFromAmount(amountTotal) {
  const dollars = Math.round((amountTotal || 0) / 100);
  if (dollars >= 200) return "gmb";        // $249
  if (dollars >= 70) return "growth";      // $89
  if (dollars >= 30) return "essentials";  // $49
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error("Missing required env vars for stripe-webhook");
    return res.status(500).send("Server not configured");
  }

  const stripe = new Stripe(secretKey);
  const supabase = createClient(supabaseUrl, serviceKey);

  let event;
  try {
    const rawBody = await readRawBody(req);
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const clientId = session.client_reference_id;
    const email = session.customer_details?.email || session.customer_email;
    const plan = planFromAmount(session.amount_total);

    if (!plan) {
      console.warn("Could not map amount to plan:", session.amount_total);
      return res.status(200).json({ received: true, note: "no plan match" });
    }

    try {
      let query;
      if (clientId) {
        query = supabase.from("profiles").update({ plan, status: "active" }).eq("id", clientId);
      } else if (email) {
        query = supabase.from("profiles").update({ plan, status: "active" }).eq("email", email);
      } else {
        return res.status(200).json({ received: true, note: "no client identifier" });
      }
      const { error } = await query;
      if (error) {
        console.error("Supabase update failed:", error.message);
        return res.status(500).send("DB update failed");
      }

      // Log to activity feed (best-effort).
      const targetId = clientId || null;
      await supabase.from("activity").insert({
        id: `a${Date.now()}${Math.floor(Math.random() * 1000)}`,
        clientId: targetId,
        type: "submitted",
        desc: `Payment received — plan activated: ${plan}`,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        by: "Stripe",
      });
    } catch (e) {
      console.error("Handler error:", e.message);
      return res.status(500).send("Handler error");
    }
  }

  return res.status(200).json({ received: true });
}
