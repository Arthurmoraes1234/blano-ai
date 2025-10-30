// Fix: Corrected the type reference path to include '/dist/' which contains the actual Deno type definitions. This resolves the 'Cannot find name Deno' and other related type errors.
/// <reference types="https://esm.sh/@supabase/functions-js@2/dist/edge-runtime.d.ts" />
// Supabase Edge Function to create a Stripe Customer Portal link.

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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("User authentication failed.");

    // Retrieve the Stripe Customer ID from your 'users' table.
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('uid', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      throw new Error("Could not find Stripe customer ID for the user.");
    }
    
    const stripeCustomerId = profile.stripe_customer_id;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${Deno.env.get("SITE_URL")}/#/account`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
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
