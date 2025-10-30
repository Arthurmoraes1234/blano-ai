// Fix: Corrected the type reference path to include '/dist/' which contains the actual Deno type definitions. This resolves the 'Cannot find name Deno' and other related type errors.
/// <reference types="https://esm.sh/@supabase/functions-js@2/dist/edge-runtime.d.ts" />
// Supabase Edge Function for Stripe Checkout - UPDATED for verification flow

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.8.0?target=deno";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_API_KEY");
    if (!stripeKey) throw new Error("Stripe API key is not configured.");

    const stripe = new Stripe(stripeKey);

    const { priceId } = await req.json();
    if (!priceId) throw new Error("The 'priceId' is required.");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("User authentication failed.");

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      allow_promotion_codes: true,
      // CRITICAL CHANGE: Pass the session ID back to the success page for verification.
      success_url: `${Deno.env.get("SITE_URL")}/#/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get("SITE_URL")}/#/activate-plan`,
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          user_id: user.id
        }
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
});
